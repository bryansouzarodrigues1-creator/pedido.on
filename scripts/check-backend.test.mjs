import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {safeReturnPath,providerOrigin,validPassword,sessionCookie,readSessionCookie,randomToken,sha256,sealTokens,openTokens,allowsAccountAccess,verificationPurpose,RECOVERY_SECONDS,SESSION_SECONDS} from '../lib/auth-policy.ts';
import {sameOrigin,readJson,readBody,HttpError} from '../lib/http-policy.ts';
import {paidPlan,paymentEntitlement} from '../lib/billing-policy.ts';
import {aiSql,validMenuImage,aiPeriod} from '../lib/ai-policy.ts';
import {importedMenu} from '../lib/ai-menu.ts';
const site='https://pedido.example';
test('redirects remain local and cannot enter reserved auth or API paths',()=>{
 assert.equal(safeReturnPath('/app?new=1#extra'),'/app?new=1');
 for(const path of ['https://evil.test','//evil.test','/\\evil.test','/api/auth/logout','/%61pi/private','/%2f%2fevil.test','/callback','/signin-with-chatgpt','/%0aevil','/%','/a/../api/test'])assert.equal(safeReturnPath(path),'/app',path);
 assert.equal(providerOrigin('https://ref.supabase.co/'),'https://ref.supabase.co');
 for(const path of ['http://ref.supabase.co','https://user:pass@example.test','https://example.test/auth','https://example.test/?token=x'])assert.equal(providerOrigin(path),'');
});
test('recovery credentials are restricted and expire sooner than account sessions',()=>{
 assert.equal(allowsAccountAccess('account'),true);
 for(const scope of ['recovery','signup','admin',''])assert.equal(allowsAccountAccess(scope),false);
 assert.equal(verificationPurpose('confirm-email'),'email');assert.equal(verificationPurpose('confirm-recovery'),'recovery');assert.equal(verificationPurpose('signup'),null);
 assert.equal(RECOVERY_SECONDS,900);assert.ok(RECOVERY_SECONDS<SESSION_SECONDS);
 assert.equal(validPassword('short'),false);assert.equal(validPassword('x'.repeat(7)),false);assert.equal(validPassword('x'.repeat(8)),true);assert.equal(validPassword('x'.repeat(11)),true);assert.equal(validPassword('frase para minha pizzaria'),true);assert.equal(validPassword('x'.repeat(128)),true);assert.equal(validPassword('x'.repeat(129)),false);assert.equal(validPassword('x'.repeat(12)+'\0'),false);assert.equal(validPassword('x'.repeat(11),12),false);assert.equal(validPassword('x'.repeat(12),12),true);
});
test('cookies are scoped, HttpOnly and secure; tokens are stored only as hashes',async()=>{
 const token=randomToken(),cookie=sessionCookie(token,true,SESSION_SECONDS);assert.match(token,/^[a-f0-9]{64}$/);assert.notEqual(randomToken(),token);
 assert.match(cookie,/^__Host-pedido-session=/);assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/; Secure$/);assert.doesNotMatch(cookie,/Domain=/);
 assert.equal(readSessionCookie(cookie,true),token);assert.equal(readSessionCookie('pedido-session='+token,true),'');assert.equal(readSessionCookie('__Host-pedido-session=forged',true),'');
 assert.match(sessionCookie('',true,0),/Max-Age=0/);assert.notEqual(await sha256(token),token);
});
test('encrypted provider tokens cannot be read with another key or account context',async()=>{
 const key='ab'.repeat(32),context='hash:supabase:owner',tokens={access:'private-access',refresh:'private-refresh'};
 const encrypted=await sealTokens(tokens,key,context),again=await sealTokens(tokens,key,context);assert.notEqual(encrypted,again);assert.ok(!encrypted.includes(tokens.access));
 assert.deepEqual(await openTokens(encrypted,key,context),tokens);
 await assert.rejects(openTokens(encrypted,'cd'.repeat(32),context));await assert.rejects(openTokens(encrypted,key,'other-owner'));await assert.rejects(openTokens(encrypted.slice(0,-2)+'00',key,context));await assert.rejects(openTokens('malformed',key,context));
});
test('mutations require an exact origin, and body limits work without Content-Length',async()=>{
 assert.doesNotThrow(()=>sameOrigin(new Request(site+'/api',{headers:{origin:site}})));
 for(const headers of [{},{origin:'https://evil.test'},{origin:site,'sec-fetch-site':'cross-site'}])assert.throws(()=>sameOrigin(new Request(site+'/api',{headers})),e=>e instanceof HttpError&&e.status===403);
 const json=new Request(site,{method:'POST',headers:{'content-type':'application/json;charset=UTF-8'},body:'{"ok":true}'});assert.deepEqual(await readJson(json),{ok:true});
 await assert.rejects(readJson(new Request(site,{method:'POST',body:'{"ok":true}'})),e=>e.status===415);
 await assert.rejects(readJson(new Request(site,{method:'POST',headers:{'content-type':'application/json'},body:'{oops'})),e=>e.status===400);
 const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('a'.repeat(8)));controller.enqueue(new TextEncoder().encode('b'.repeat(8)));controller.close();}});
 await assert.rejects(readBody(new Request(site,{method:'POST',body:stream,duplex:'half'}),10),e=>e.status===413);
});
test('subscription entitlements require a paid invoice line and retain the paid plan on an unpaid upgrade',()=>{
 const previous={subscriptionId:'sub_ours',paidThrough:2000,paidPlan:'essencial'};
 assert.deepEqual(paymentEntitlement(previous,'sub_ours','rede',4000,{status:'open',lines:{data:[]}},'price_rede'),{paidThrough:2000,paidPlan:'essencial'});
 assert.deepEqual(paymentEntitlement(previous,'sub_other','rede',4000,null,'price_rede'),{paidThrough:0,paidPlan:''});
 const invoice={status:'paid',lines:{data:[{period:{end:3000},pricing:{price_details:{price:'price_rede'}}}]}};
 assert.deepEqual(paymentEntitlement(previous,'sub_ours','rede',4000,invoice,'price_rede'),{paidThrough:3000,paidPlan:'rede'});
 assert.deepEqual(paymentEntitlement(previous,'sub_ours','rede',4000,invoice,'price_other'),{paidThrough:2000,paidPlan:'essencial'});
 assert.equal(paidPlan({...previous,status:'active'},1000),'essencial');assert.equal(paidPlan({...previous,status:'past_due'},1000),'essencial');
 for(const status of ['canceled','incomplete','unpaid'])assert.equal(paidPlan({...previous,status},1000),null);
 assert.equal(paidPlan({...previous,status:'active'},2000),null);assert.equal(paidPlan({status:'active',paidThrough:9999,paidPlan:''},1000),null);
});
function database(){const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');for(const name of readdirSync(new URL('../drizzle',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));return db;}
test('all migrations preserve pre-existing restaurants while adding auth, usage and paid entitlements',()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../drizzle/0000_black_madame_hydra.sql',import.meta.url),'utf8'));
 db.prepare('insert into restaurants (id,owner_id,slug,name,data,created_at,updated_at) values (?,?,?,?,?,?,?)').run('restaurant','trusted-chatgpt-id','existing-shop','Existing','{}','now','now');
 for(const name of readdirSync(new URL('../drizzle',import.meta.url)).filter(n=>n.endsWith('.sql')&&!n.startsWith('0000')).sort())db.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 assert.equal(db.prepare('select owner_id from restaurants').get().owner_id,'trusted-chatgpt-id');
 assert.equal(db.prepare("select count(*) as n from sqlite_master where type='table' and name in ('auth_sessions','ai_usage','ai_jobs','account_profiles','rate_buckets')").get().n,5);db.close();
});
test('actual AI reservation SQL prevents double charges, overspending and cross-account use; refunds are idempotent',()=>{
 const db=database(),stamp='2026-10-08T00:00:00.000Z';db.prepare('insert into ai_usage (id,owner_id,period_key,updated_at) values (?,?,?,?)').run('u','owner','2026-10',stamp);
 function reserve(id,cost=1,limit=3,usageId='u'){db.exec('BEGIN');const changed=db.prepare(aiSql.reserve).run(id,'owner','restaurant','hash',usageId,cost,stamp,usageId,cost,limit).changes;db.prepare(aiSql.charge).run(cost,stamp,usageId);db.exec('COMMIT');return changed;}
 const credits=()=>db.prepare('select credits from ai_usage where id=?').get('u').credits;
 assert.equal(reserve('job'),1);assert.equal(credits(),1);assert.equal(reserve('job'),0);assert.equal(credits(),1);assert.equal(reserve('too-much',3),0);assert.equal(credits(),1);assert.equal(reserve('other',1,3,'other-account-usage'),0);
 assert.equal(reserve('second',2),1);assert.equal(credits(),3);assert.equal(reserve('third'),0);
 function refund(){db.exec('BEGIN');db.prepare(aiSql.fail).run('second');db.prepare(aiSql.refund).run(2,stamp,'u');db.exec('COMMIT');}
 refund();assert.equal(credits(),1);refund();assert.equal(credits(),1);
 db.exec('BEGIN');db.prepare(aiSql.complete).run('{"items":[]}','job');db.prepare(aiSql.tokens).run(45,30,stamp,'u');db.exec('COMMIT');
 assert.equal(db.prepare('select input_tokens from ai_usage').get().input_tokens,45);
 db.exec('BEGIN');db.prepare(aiSql.complete).run('{}','job');db.prepare(aiSql.tokens).run(45,30,stamp,'u');db.exec('COMMIT');assert.equal(db.prepare('select input_tokens from ai_usage').get().input_tokens,45);
 db.exec('BEGIN');db.prepare(aiSql.fail).run('job');db.prepare(aiSql.refund).run(1,stamp,'u');db.exec('COMMIT');assert.equal(credits(),1);db.close();
});
test('menu imports reject arbitrary URLs, disguised uploads, invented field formats and oversized prices',()=>{
 assert.equal(validMenuImage('https://example.test/menu.png'),false);assert.equal(validMenuImage('data:image/png;base64,'+btoa('<script>bad</script>')),false);
 assert.equal(validMenuImage('data:image/png;base64,'+btoa('\x89PNG\r\n\x1a\ncontent')),true);assert.equal(validMenuImage('data:image/jpeg;base64,'+btoa('\xff\xd8\xffcontent')),true);
 const item={name:'Margherita',category:'Pizzas',description:'Mozzarella',kind:'pizza',price:null,sizes:{p:null,m:3900,g:4900}};
 assert.equal(importedMenu.safeParse({items:[item],notes:''}).success,true);assert.equal(importedMenu.safeParse({items:[{...item,price:1000001}],notes:''}).success,false);assert.equal(importedMenu.safeParse({items:[{...item,price:-1}],notes:''}).success,false);
 assert.equal(aiPeriod(new Date('2026-10-31T23:59:59Z')),'2026-10');assert.equal(aiPeriod(new Date('2026-11-01T00:00:00Z')),'2026-11');
});
