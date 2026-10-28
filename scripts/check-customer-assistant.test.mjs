import test from 'node:test';
import assert from 'node:assert/strict';
import {demoRestaurant,restaurantSchema} from '../lib/domain.ts';
import {assistantSettings} from '../lib/assistant-config.ts';
import {localCustomerAnswer,shopFacts,relevantProducts,answerFromSelection,customerAssistantPrompt,redactCustomerMessage} from '../lib/customer-assistant-policy.ts';
import {campaignMessage,dailyCampaigns,campaignFingerprint} from '../lib/daily-campaigns.ts';
import {fixture} from './test-backend-fixture.mjs';
const request=(message='Qual o horário?')=>({conversationId:crypto.randomUUID(),token:'cd'.repeat(32),requestId:crypto.randomUUID(),message});
function pro(f,{tier='pro',plan='profissional'}={}){
 const stamp=new Date().toISOString(),data={...f.data,assistant:assistantSettings.parse({enabled:true,faqs:[{question:'Fazem festas?',answer:'Consulte a loja com antecedência para confirmar a disponibilidade.'}]})};
 f.db.prepare("UPDATE restaurants SET data=?,published_data=? WHERE id='shop-a'").run(JSON.stringify(data),JSON.stringify(data));
 f.db.prepare("INSERT INTO account_access(owner_id,mode,tier,plan,expires_at,reason,updated_by,updated_at) VALUES('owner-a','grant',?,?,?,'Synthetic access','fixture',?)").run(tier,plan,Math.floor(Date.now()/1000)+86400,stamp);
 Object.assign(f.env,{PEDIDO_AI_PLAN_QUOTAS:'true',PEDIDO_STUDIO_ENABLED:'true',PEDIDO_STUDIO_ENDPOINT:'https://pedido-on-estudio.lovable.app/api/pedido-on/studio'});return data;
}
test('assistant is opt-in, bounded, backward compatible and uses only known published facts',()=>{
 const data=demoRestaurant();assert.equal(data.assistant.enabled,false);const {assistant,...legacy}=data;assert.equal(restaurantSchema.parse(legacy).assistant.enabled,false);assert.equal(assistantSettings.safeParse({faqs:Array(13).fill({question:'Pergunta?',answer:'Resposta.'})}).success,false);
 const facts=shopFacts({...data,pix:{enabled:true,type:'email',key:'private@example.test',recipient:'Recebedor'}},false);
 assert.ok(!JSON.stringify(facts).includes('private@example.test'));assert.ok(!JSON.stringify(facts).includes('Recebedor'));
 for(const question of ['Qual o horário?','Quanto é a entrega?','Aceita cartão?','Como faço meu pedido?','Como funciona o meio a meio?'])assert.equal(localCustomerAnswer(data,question,true).source,'local');
 const allergy=localCustomerAnswer(data,'Tenho alergia a lactose, é seguro?',true);assert.equal(allergy.handoff,true);assert.match(allergy.text,/não consigo garantir/);
 assert.match(localCustomerAnswer({...data,isOpen:false},'Está aberto?',true).text,/fechada/);
 assert.match(localCustomerAnswer(data,'Meu pedido chegou?',true).text,/link privado/);
 assert.match(localCustomerAnswer(data,'Como faço meu pedido?',true).text,/Conversar aqui não cria um pedido/);
 assert.match(localCustomerAnswer(data,'Como funciona o horário?',true).text,/Horário informado/);
 const custom={...data,assistant:{...data.assistant,faqs:[{question:'Entregam aos domingos?',answer:'Aos domingos, entregamos das 18h às 23h.'}]}};
 assert.equal(localCustomerAnswer(custom,'Entregam aos domingos?',true).text,'Aos domingos, entregamos das 18h às 23h.');
 const combo=localCustomerAnswer(data,'Tem combo?',true);assert.match(combo.text,/Combos do cardápio/);assert.equal(combo.products[0].id,'combo-casa');assert.equal(combo.products[0].price,6900);
 const coupon=localCustomerAnswer({...data,coupon:{...data.coupon,enabled:true,code:'CAMPANHA-PRIVADA'}},'Como uso meu cupom?',true);assert.match(coupon.text,/Aplicar/);assert.doesNotMatch(coupon.text,/CAMPANHA-PRIVADA/);
});
test('retrieval reaches products after the first twelve and rejects invented facts or products',()=>{
 const data=demoRestaurant(),seed=data.products[0];data.products=Array.from({length:100},(_,i)=>({...seed,id:'pizza-'+i,name:'Pizza '+i,description:'Tomate e queijo.'}));data.products[99].name='Trufa exclusiva';data.products[0].enabled=false;
 const products=relevantProducts(data,'Quero a trufa exclusiva');assert.equal(products[0].id,'pizza-99');assert.ok(!products.some(p=>p.id==='pizza-0'));
 const answer=answerFromSelection(data,{intent:'recommendation',factIds:[],productIds:['pizza-99']},true,products);assert.equal(answer.products[0].price,3500);assert.ok(!answer.text.includes('pessoas'));
 for(const value of [{intent:'facts',factIds:['secrets'],productIds:[]},{intent:'recommendation',factIds:[],productIds:['outra-loja']},{intent:'facts',factIds:['hours'],productIds:[],reply:'O pedido está pago'}])assert.throws(()=>answerFromSelection(data,value,true,products));
 const prompt=customerAssistantPrompt(data,'trufa',[],true);assert.equal(prompt.task,'customer-support');assert.equal(prompt.store.name,data.name);assert.ok(!JSON.stringify(prompt).includes('pix.key'));
 const masked=redactCustomerMessage('meu e-mail a@b.com, CPF 123.456.789-01, telefone 11999999999 https://x.test/token');assert.ok(!/a@b.com|123.456|11999999999|https:/.test(masked));
});
test('new social copy uses exact store prices, correct delivery mode and distinct channels without mutation',()=>{
 const data={...demoRestaurant(),deliveryEnabled:false,pickupEnabled:true},before=JSON.stringify(data),campaign=dailyCampaigns(data)[0];
 const texts=['whatsapp','status','instagram','facebook'].map(channel=>campaignMessage(data,campaign,'https://store.test/p/casa',channel));assert.equal(new Set(texts).size,4);
 for(const text of texts){assert.match(text,/Retirada na loja/);assert.doesNotMatch(text,/entrega gr[aá]tis|\d+%|desconto/i);assert.ok(text.includes('https://store.test/p/casa'));}
 assert.notEqual(campaignFingerprint(data,campaign),campaignFingerprint({...data,deliveryEnabled:true},campaign));assert.equal(JSON.stringify(data),before);
});
test('Essencial, free, suspension and unpaid plan selection cannot enable a public Pro assistant',async()=>{
 const f=fixture();try{pro(f,{tier:'',plan:'essencial'});for(const plan of ['essencial','profissional']){f.db.prepare("UPDATE restaurants SET plan=? WHERE id='shop-a'").run(plan);assert.equal((await f.call('customerAssistant','POST',{slug:'pizzaria-a'},request())).status,403);}
 f.db.prepare("UPDATE account_access SET tier='free'").run();assert.equal((await f.call('customerAssistant','GET',{slug:'pizzaria-a'})).status,403);
 f.db.prepare("UPDATE account_access SET tier='pro',mode='suspended'").run();assert.equal((await f.call('customerAssistant','GET',{slug:'pizzaria-a'})).status,404);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM studio_jobs').get().n,0);
 }finally{f.close();}
});
test('public fact answers have token-private history, owner isolation and idempotency without any model call',async()=>{
 const f=fixture(),old=globalThis.fetch;try{
  const data=pro(f,{plan:'essencial'});globalThis.fetch=()=>{throw Error('No external request allowed');};f.state.user=null;
  const input=request(),first=await f.call('customerAssistant','POST',{slug:'pizzaria-a'},input);assert.equal(first.status,200,await first.clone().text());const value=await first.json();assert.equal(value.answer.source,'local');assert.match(value.answer.text,/Horário informado/);
  assert.equal((await f.call('customerAssistant','POST',{slug:'pizzaria-a'},input)).status,200);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM assistant_turns').get().n,1);
  assert.equal((await f.call('customerAssistant','POST',{slug:'pizzaria-a'},{...input,message:'Outro assunto'})).status,409);
  assert.equal((await f.call('customerAssistant','POST',{slug:'pizzaria-a'},{...input,requestId:crypto.randomUUID(),token:'ab'.repeat(32)})).status,401);
  const headers={'x-assistant-conversation':input.conversationId,'x-assistant-token':input.token};
  const visible=await f.call('customerAssistant','GET',{slug:'pizzaria-a'},undefined,headers);assert.equal((await visible.json()).turns.length,1);assert.match(visible.headers.get('cache-control'),/no-store/);
  const privateHistory=await f.call('customerAssistant','GET',{slug:'pizzaria-a'},undefined,{...headers,'x-assistant-token':'aa'.repeat(32)});assert.equal((await privateHistory.json()).turns.length,0);
  assert.equal((await f.call('ownerAssistant','GET',{id:'shop-a'})).status,401);f.state.user={userId:'owner-b',displayName:'B',email:'b@example.test'};assert.equal((await f.call('ownerAssistant','GET',{id:'shop-a'})).status,404);
  f.state.user={userId:'owner-a',displayName:'A',email:'a@example.test'};const overview=await f.call('ownerAssistant','GET',{id:'shop-a'});assert.equal((await overview.json()).totals.questions,1);
  const detail=await f.dispatch('ownerAssistant','GET',new Request('https://pedido.example/api/test?conversation='+input.conversationId),{id:'shop-a'});assert.equal((await detail.json()).turns.length,1);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM studio_jobs').get().n,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM orders').get().n,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM asaas_intents').get().n,0);assert.ok(!JSON.stringify((await (await f.call('publicMenu','GET',{slug:'pizzaria-a'})).json())).includes(input.token));
  f.db.prepare("UPDATE restaurants SET data=? WHERE id='shop-a'").run(JSON.stringify({...data,hours:'RASCUNHO SECRETO'}));const next=await f.call('customerAssistant','POST',{slug:'pizzaria-a'},{...input,requestId:crypto.randomUUID()});assert.ok(!(await next.text()).includes('RASCUNHO SECRETO'));
 }finally{globalThis.fetch=old;f.close();}
});
test('ambiguous questions use one signed fixed-model selection and one shared budget reservation',async()=>{
 const f=fixture(),old=globalThis.fetch;try{pro(f);let calls=0;globalThis.fetch=async(_url,options)=>{calls++;const claim=await f.call('studioClaim','POST',{},JSON.parse(options.body));assert.equal(claim.status,200);const body=await claim.json();assert.equal(body.purpose,'customer-support');assert.equal(JSON.parse(body.prompt).task,'customer-support');return Response.json({intent:'recommendation',factIds:[],productIds:['margherita']});};
 const input=request('Pode sugerir algo para o jantar?'),res=await f.call('customerAssistant','POST',{slug:'pizzaria-a'},input);assert.equal(res.status,200,await res.clone().text());const answer=(await res.json()).answer;assert.equal(answer.source,'ai');assert.equal(answer.products[0].id,'margherita');assert.equal(calls,1);assert.equal((await f.call('customerAssistant','POST',{slug:'pizzaria-a'},input)).status,200);assert.equal(calls,1);
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM ai_budget_reservations WHERE state='consumed'").get().n,1);assert.equal((await (await f.call('creations','GET',{id:'shop-a'})).json()).creations.length,0);
 }finally{globalThis.fetch=old;f.close();}
});
test('forged model replies and service failures fall back to store contact without retry or false payment',async()=>{
 const f=fixture(),old=globalThis.fetch;try{pro(f);let calls=0;globalThis.fetch=async(_url,options)=>{calls++;await f.call('studioClaim','POST',{},JSON.parse(options.body));return Response.json({intent:'facts',factIds:['private-order-paid'],productIds:[],reply:'Pagamento confirmado'});};
 const input=request('Você pode ajudar a organizar o encontro?'),res=await f.call('customerAssistant','POST',{slug:'pizzaria-a'},input);assert.equal(res.status,200);const result=await res.json();assert.equal(result.answer.handoff,true);assert.equal(result.answer.source,'handoff');assert.ok(!result.answer.text.includes('Pagamento confirmado'));assert.equal(calls,1);
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM studio_jobs WHERE state='failed'").get().n,1);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM ai_budget_reservations WHERE state='consumed'").get().n,1);
 globalThis.fetch=async()=>{calls++;throw Error('Connection lost before claim');};await f.call('customerAssistant','POST',{slug:'pizzaria-a'},request('Alguma ideia diferente?'));assert.equal(calls,2);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM studio_jobs WHERE state='cancelled'").get().n,1);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM ai_budget_reservations WHERE state='refunded'").get().n,1);
 }finally{globalThis.fetch=old;f.close();}
});
test('platform support can read the selected shop history but ordinary owners cannot use the administrative endpoint',async()=>{
 const f=fixture();try{pro(f);const input=request();await f.call('customerAssistant','POST',{slug:'pizzaria-a'},input);f.env.PLATFORM_ADMIN_ACCOUNT_ID='platform-admin';
 const url='https://pedido.example/api/admin/restaurants/shop-a?section=assistant';assert.equal((await f.dispatch('adminRestaurant','GET',new Request(url),{id:'shop-a'})).status,403);
 f.state.user={userId:'platform-admin',displayName:'Equipe',email:'admin@example.test'};const overview=await f.dispatch('adminRestaurant','GET',new Request(url),{id:'shop-a'});assert.equal((await overview.json()).totals.questions,1);
 const read=await f.dispatch('adminRestaurant','GET',new Request(url+'&conversation='+input.conversationId),{id:'shop-a'});assert.equal((await read.json()).turns.length,1);assert.match(read.headers.get('cache-control'),/no-store/);
 const other=await f.dispatch('adminRestaurant','GET',new Request(url.replace('shop-a','shop-b')+'&conversation='+input.conversationId),{id:'shop-b'});assert.equal(other.status,404);
 }finally{f.close();}
});
test('confirmed Pro wins over a simultaneous Essencial period even though both image caps are twenty',async()=>{
 const f=fixture();try{const stamp=new Date().toISOString(),due=stamp.slice(0,10),end=Math.floor(Date.now()/1000)+25*86400;
 for(const [suffix,plan,amount] of [['essential','essencial',4900],['pro','profissional',8900]]){
  f.db.prepare("INSERT INTO asaas_intents(id,owner_id,environment,plan,reference,document_hash,created_at,updated_at,catalog_version) VALUES(?,'owner-a','production',?,?, 'fixture',?,?,2)").run('intent-'+suffix,plan,'reference-'+suffix,stamp,stamp);
  f.db.prepare("INSERT INTO asaas_subscriptions(id,owner_id,environment,remote_id,customer_id,intent_id,plan,status,paid_through,paid_plan,created_at,updated_at) VALUES(?,'owner-a','production',?,'customer','intent-'||?,?,'ACTIVE',?,?,?,?)").run('sub-'+suffix,'remote-'+suffix,suffix,plan,end,plan,stamp,stamp);
  f.db.prepare("INSERT INTO asaas_payments(id,subscription_key,remote_id,customer_id,status,amount,due_date,updated_at) VALUES(?,?,?,'customer','RECEIVED',?,?,?)").run('pay-'+suffix,'sub-'+suffix,'remote-pay-'+suffix,amount,due,stamp);
 }
 const budget=f.load('lib/ai-budget.ts'),assistant=f.load('lib/customer-assistant.ts');assert.equal((await budget.aiEntitlement('owner-a')).plan,'profissional');assert.equal(await assistant.hasCustomerAssistant('owner-a'),true);
 f.db.prepare("UPDATE asaas_payments SET status='REFUNDED' WHERE id='pay-pro'").run();assert.equal((await budget.aiEntitlement('owner-a')).plan,'essencial');assert.equal(await assistant.hasCustomerAssistant('owner-a'),false);
 }finally{f.close();}
});
