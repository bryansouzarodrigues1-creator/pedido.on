import {chooseMenuPreview} from './choose-menu-preview.mjs';
// Exact reported share message; a controlled blocked response, with no remote writes.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget,guardPublicGuestContext} from './browser-qa-target.mjs';

const {base,publicReadOnly}=browserQaTarget();
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const url='https://www.ifood.com.br/delivery/armacao-dos-buzios-rj/master-pizzas---buzios-sao-jose/cd5f08e7-d71c-4918-9fb4-963192b8a85b';
const message='Esse lugar é a sua cara! Use o ícone de coração no app pra salvar a loja na sua área de Favoritos. Master Pizzas - Búzios - '+url+'?UTM_Medium=share';
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||'.sites-runtime/browser-ci/shared-ifood');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true});
const checks=[],errors=[];let context,lookups=0;
try{
 context=await browser.newContext({...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});
 await guardPublicGuestContext(context,errors);
 await context.route('**/*',async route=>{
  const request=route.request(),target=new URL(request.url());
  if(target.origin===base&&target.pathname==='/api/auth/config'&&request.method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,registrationEnabled:true,recoveryEnabled:false,inviteRequired:false,googleEnabled:false,csrf:'shared-ifood-qa'})});
  if(target.origin===base&&target.pathname==='/api/menu-source'&&request.method()==='POST'){
   assert.equal(request.postDataJSON().url,url);assert.equal(request.headers()['x-pedido-csrf'],'shared-ifood-qa');lookups++;
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'needs_content',url,count:0,text:'',message:'Resposta bloqueada controlada para testar a interface.'})});
  }
  if(target.origin===base&&['GET','HEAD','OPTIONS'].includes(request.method()))return route.continue();
  if(publicReadOnly)return route.fallback();
  errors.push(request.method()+' '+target.pathname);return route.abort();
 });
 const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/criar',{waitUntil:'networkidle',timeout:90000});
 const composer=page.locator('#owner-intake-message');await composer.waitFor();await page.waitForFunction(()=>document.querySelector('#owner-intake-message')?.disabled===false);
 await composer.fill(message);await composer.evaluate(el=>el.dataset.qaContinuity='exact-shared-message');
 await page.getByRole('button',{name:'Tenho um link do iFood',exact:true}).click();
 assert.equal(await composer.inputValue(),message);assert.equal(await composer.getAttribute('data-qa-continuity'),'exact-shared-message');
 await page.locator('.owner-intake-reply button[type=submit]').click();
 const fallback=page.locator('.owner-source-fallback');await fallback.waitFor();
 assert.equal(lookups,1);assert.equal(await page.locator('.owner-intake-error').count(),0);
 assert.match(await fallback.textContent(),/O iFood não liberou a leitura automática/);
 const nameChoice=page.getByRole('region',{name:'Confirme o nome da pizzaria'});
 await nameChoice.waitFor();assert.equal(await nameChoice.locator('h3').textContent(),'Master Pizzas - Búzios');
 assert.equal(await page.locator('.owner-intake-question').count(),0);assert.equal(await composer.isVisible(),false);
 assert.equal(await fallback.locator('details').evaluate(el=>el.open),false);
 assert.equal(await composer.getAttribute('data-qa-continuity'),'exact-shared-message');
 checks.push({name:'exact share message reaches the lookup in the same composer, preserving three hyphens and removing tracking',ok:true});
 for(const width of [320,412,1280]){
  await page.setViewportSize({width,height:915});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 }
 await page.setViewportSize({width:412,height:915});await nameChoice.scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(output,'master-pizzas-link-reconhecido-mobile.png'),fullPage:true});
 await page.reload({waitUntil:'networkidle'});await nameChoice.waitFor();await page.locator('.owner-source-fallback').waitFor();
 assert.equal(await nameChoice.locator('h3').textContent(),'Master Pizzas - Búzios');assert.equal(lookups,1);
 const saved=await page.evaluate(()=>Object.values(localStorage).map(value=>{try{return JSON.parse(value);}catch{return null;}}).find(value=>value?.ownerIntake?.source?.sharedName==='Master Pizzas - Búzios'));
 assert.equal(saved.ownerIntake.initialMessage,message);assert.equal(saved.ownerIntake.source.catalogStatus,'needs_content');
 await fallback.locator('summary').click();
 assert.equal(await fallback.getByRole('link',{name:'Abrir loja no iFood'}).getAttribute('href'),url);
 assert.equal(await fallback.getByRole('button',{name:'Enviar PDF ou foto',exact:true}).isVisible(),true);
 await fallback.getByRole('button',{name:'Colar produtos',exact:true}).click();
 await composer.fill('Bebidas\nÁgua mineral R$ 5,00\nRefrigerante lata R$ 7,90');await page.locator('.owner-intake-reply button[type=submit]').click();
 await nameChoice.waitFor();assert.equal(await fallback.count(),0);
 checks.push({name:'share name, original message and blocked result survive reload; pasted products replace the warning without repeating a lookup',ok:true});
 await nameChoice.getByRole('button',{name:'Usar este nome',exact:true}).click();
 assert.match(await page.locator('.owner-intake-question').textContent(),/Onde fica/);
 await page.getByRole('button',{name:'Ver prévia agora e completar depois',exact:true}).click();
 await chooseMenuPreview(page);
 assert.equal(await page.locator('.ai-selected .mini-top strong').textContent(),'Master Pizzas - Búzios');
 assert.equal(await page.locator('.ai-selected .mini-store-address').count(),0);
 assert.equal(await page.locator('.ai-selected .mini-store-hours').count(),0);
 assert.equal(lookups,1);assert.deepEqual(errors,[]);
 assert.match(await page.locator('.ai-gallery-heading').textContent(),/2 itens/);
 checks.push({name:'one-click share name confirmation reaches a preview with two supplied products and no invented address or hours',ok:true});
}finally{
 await context?.close();await browser.close();
 await writeFile(path.join(output,'summary.json'),JSON.stringify({base,commit:process.env.GITHUB_SHA,checks,errors,lookups,controlledUpstream:true,scope:'UI and browser storage only; source POST intercepted; no remote application mutation; not a real catalog import',passed:checks.length===3&&!errors.length},null,2));
}
