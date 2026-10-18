// Distributed grant UI with intercepted responses; no live provider or app writes.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget,guardPublicGuestContext} from './browser-qa-target.mjs';
import {storeUrl,merchant} from './ifood-official-fixture.mjs';
const {base,publicReadOnly}=browserQaTarget(),require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||'.sites-runtime/browser-ci/ifood-connect');await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true}),checks=[],errors=[];let pending=null,starts=0,imports=0,lookups=0,skipped=false,context;
const result={status:'imported',url:storeUrl,count:3,text:'Categoria: Pizzas salgadas [pizza]\nCalabresa de Teste P R$ 25,00 · M R$ 32,00 · G R$ 42,00\nMolho, muçarela, calabresa e cebola.\n\nCategoria: Pizzas salgadas [pizza]\nMarguerita de Teste P R$ 27,00 · M R$ 34,00 · G R$ 44,00\nTomate, muçarela e manjericão.\n\nCategoria: Bebidas [simple]\nÁgua mineral R$ 8,90',message:'3 produtos recebidos para revisão.',warnings:[],store:{name:merchant.name,address:'Rua do Forno Azul, 240, Bairro de Teste, Cabo Frio - RJ',hours:'terça a domingo, 18:00 às 00:30 (dia seguinte)',telephone:merchant.telephone}};
try{
 context=await browser.newContext({...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});await guardPublicGuestContext(context,errors);
 await context.route('**/*',async route=>{
  const request=route.request(),target=new URL(request.url());
  if(target.origin===base&&target.pathname==='/api/auth/config'&&request.method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,registrationEnabled:true,recoveryEnabled:false,inviteRequired:false,googleEnabled:false,csrf:'ifood-grant-ui-test'})});
  if(target.origin===base&&target.pathname==='/api/menu-source'&&request.method()==='POST'){assert.equal(request.postDataJSON().url,storeUrl);lookups++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'needs_content',url:storeUrl,count:0,text:'',message:'Catálogo público bloqueado simulado.'})});}
  if(target.origin===base&&target.pathname==='/api/ifood/import'){
   if(request.method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,...(pending?{pending}:{})})});
   assert.equal(request.headers()['x-pedido-csrf'],'ifood-grant-ui-test');const body=request.postDataJSON();
   if(body.action==='start'){assert.equal(body.url,storeUrl);starts++;pending={url:storeUrl,userCode:'HJLX-LPSQ',verificationUrl:'https://portal.ifood.com.br/apps/code?c=HJLX-LPSQ',expiresAt:Math.floor(Date.now()/1000)+600};return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pending})});}
   if(body.action==='complete'){assert.equal(body.authorizationCode,'returned-test-code');imports++;pending=null;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});}
   if(body.action==='cancel'){pending=null;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({cancelled:true})});}
   throw Error('Unexpected authorization action');
  }
  if(target.origin===base&&['GET','HEAD','OPTIONS'].includes(request.method()))return route.continue();if(publicReadOnly)return route.fallback();errors.push(request.method()+' '+target.pathname);return route.abort();
 });
 const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/criar',{waitUntil:'networkidle',timeout:90000});
 const composer=page.locator('#owner-intake-message');await composer.waitFor();
 if(publicReadOnly&&await page.locator('[data-ifood-connect="v1"]').count()===0){skipped=true;checks.push({name:'Published version does not contain the new connector yet',skipped:true});}
 else{
  await page.waitForFunction(()=>document.querySelector('#owner-intake-message')?.disabled===false);const message='Quero um visual artesanal azul e amarelo. '+storeUrl;await composer.fill(message);await page.locator('.owner-intake-reply button[type=submit]').click();
  const connect=page.getByRole('region',{name:'Conectar loja no iFood'});await connect.waitFor();await connect.getByRole('button',{name:'Conectar minha loja no iFood',exact:true}).click();await connect.getByText('HJLX-LPSQ',{exact:true}).waitFor();
  assert.equal(await connect.getByRole('link',{name:'Autorizar no Portal do Parceiro'}).getAttribute('href'),'https://portal.ifood.com.br/apps/code?c=HJLX-LPSQ');assert.equal(starts,1);assert.equal(imports,0);
  await page.reload({waitUntil:'networkidle'});await connect.getByText('HJLX-LPSQ',{exact:true}).waitFor();assert.equal(lookups,1);assert.equal(starts,1);
  checks.push({name:'one composer keeps the idea, resumes authorization after reload and links only to the Partner Portal',ok:true});
  await connect.getByLabel('Depois de autorizar, cole o código de retorno').fill('returned-test-code');await connect.getByRole('button',{name:'Receber dados e cardápio',exact:true}).click();
  const facts=page.getByRole('region',{name:'Confira os dados encontrados no link'});await facts.waitFor();assert.match(await facts.textContent(),/Rua do Forno Azul, 240/);assert.match(await facts.textContent(),/00:30/);
  let saved=await page.evaluate(()=>Object.values(localStorage).map(s=>{try{return JSON.parse(s);}catch{return null;}}).find(v=>v?.ownerIntake?.source?.url));assert.equal(saved.ownerIntake.answers.address,undefined);assert.equal(saved.ownerIntake.answers.whatsapp,undefined);assert.equal(imports,1);
  for(const width of [320,412,1280]){await page.setViewportSize({width,height:915});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
  await page.setViewportSize({width:412,height:915});await facts.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'ifood-dados-para-conferir-mobile.png'),fullPage:true});
  await facts.getByRole('button',{name:'Usar dados encontrados',exact:true}).click();assert.match(await page.locator('.owner-intake-question').textContent(),/WhatsApp/);assert.doesNotMatch(await page.locator('.owner-intake-question').textContent(),/Onde fica|horário/);
  await page.getByRole('button',{name:'Usar '+merchant.telephone+' como WhatsApp',exact:true}).click();
  checks.push({name:'address and overnight hours enter only after confirmation; phone requires explicit WhatsApp confirmation',ok:true});
  await page.getByRole('button',{name:'Criar minha prévia',exact:true}).click();await page.locator('.ai-selected .mini-menu').waitFor();assert.equal(await page.locator('.ai-selected .mini-top strong').textContent(),merchant.name);assert.match(await page.locator('.ai-gallery-heading').textContent(),/3 itens/);assert.match(await page.locator('.ai-selected .mini-store-address').textContent(),/240/);assert.match(await page.locator('.ai-selected .mini-store-hours').textContent(),/00:30/);
  await page.screenshot({path:path.join(output,'ifood-previa-com-produtos-mobile.png'),fullPage:true});assert.equal(starts,1);assert.equal(imports,1);assert.deepEqual(errors,[]);
  checks.push({name:'three reviewed synthetic products and confirmed store data reach the preview without registration or paid generation',ok:true});
 }
}finally{await context?.close();await browser.close();await writeFile(path.join(output,'summary.json'),JSON.stringify({base,commit:process.env.GITHUB_SHA,checks,errors,starts,imports,lookups,skipped,controlledUpstream:true,browser:'Chrome / Pixel 7 emulado, não Android físico',scope:'UI and local browser storage; source and authorization endpoints intercepted; no live iFood import',passed:skipped||checks.length===3&&!errors.length},null,2));}
