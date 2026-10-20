import {chooseMenuPreview} from './choose-menu-preview.mjs';
// Pixel 7 UI with a normalized, fictitious Apify response. Never calls Apify.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget} from './browser-qa-target.mjs';
import {apifyIfoodMenu} from '../lib/apify-ifood.ts';
import {exampleDataset,restaurantUrl} from './test-apify-ifood-fixture.mjs';

const {base,publicReadOnly}=browserQaTarget();if(publicReadOnly)throw Error('The synthetic collector scenario requires isolated QA.');
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||'.sites-runtime/browser-ci/apify-menu');await mkdir(output,{recursive:true});
const url=restaurantUrl(),menu=apifyIfoodMenu(exampleDataset({menuSource:'catalog-search',menuCompletenessStatus:'partial-fallback'}),url);
assert.equal(menu.count,3);
const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true});
const checks=[],errors=[];let context,lookups=0,responseMode="partial";
async function start(){
 context=await browser.newContext({...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});
 await context.route('**/*',async route=>{
  const request=route.request(),target=new URL(request.url());
  if(target.origin===base&&target.pathname==='/api/auth/config'&&request.method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,registrationEnabled:true,csrf:'synthetic-apify-qa'})});
  if(target.origin===base&&target.pathname==='/api/menu-source'&&request.method()==='POST'){
   assert.equal(request.postDataJSON().url,url);lookups++;
   const value=responseMode==='partial'?{status:'imported',url,text:menu.text,count:menu.count,message:'Trouxemos uma parte do catálogo: 3 produtos para conferir. Revise preços, tamanhos e complementos antes de adicionar.'}:{status:'needs_content',url,text:'',count:0,message:'Não recebemos produtos verificáveis dessa loja. Continue com PDF, TXT/CSV ou fotos do cardápio.'};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
  }
  if(target.origin===base&&['GET','HEAD','OPTIONS'].includes(request.method()))return route.continue();
  errors.push(request.method()+' '+target.origin+target.pathname);return route.abort();
 });
 const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));return page;
}
try{
 let page=await start();
 await page.goto(base+'/criar',{waitUntil:'networkidle',timeout:90000});await page.waitForFunction(()=>document.querySelector('#owner-intake-message')?.disabled===false);
 await page.locator('#owner-intake-message').fill(url);await page.locator('.owner-intake-reply button[type=submit]').click();
 const nameChoice=page.getByRole('region',{name:'Confirme o nome da pizzaria'});await nameChoice.waitFor();assert.match(await nameChoice.textContent(),/Forno Azul De Teste/);
 assert.match(await page.locator('body').textContent(),/Trouxemos uma parte do catálogo/);assert.equal(await page.locator('.owner-source-fallback').count(),0);
 assert.equal(await page.getByRole('region',{name:'Confira os dados encontrados no link'}).count(),0,'The Actor has not verified address or hours');
 checks.push({name:'a partial synthetic catalogue reaches the same composer and confirms only the URL name suggestion',ok:true});
 await nameChoice.getByRole('button',{name:'Usar este nome',exact:true}).click();assert.match(await page.locator('.owner-intake-question').textContent(),/Onde fica/);
 await page.getByRole('button',{name:'Ver prévia agora e completar depois',exact:true}).click();await chooseMenuPreview(page);
 assert.match(await page.locator('.ai-gallery-heading').textContent(),/3 itens/);assert.match(await page.locator('body').textContent(),/1 produto precisa de conferência/);assert.match(await page.locator('body').textContent(),/Trouxemos uma parte do catálogo/);
 assert.equal(await page.locator('.mini-store-address').count(),0);assert.equal(await page.locator('.mini-store-hours').count(),0);assert.equal(lookups,1);
 await page.getByRole('button',{name:/Testar o cardápio completo personalizado/}).click();const full=page.getByRole('dialog',{name:'Teste do cardápio personalizado'});await full.locator('.customer-menu').waitFor();
 const content=await full.textContent();assert.match(content,/Água mineral sem gás/);assert.match(content,/5,50/);assert.match(content,/Guaraná da casa/);assert.match(content,/11,50/);assert.match(content,/Calabresa da Forno Azul/);assert.match(content,/tamanho a confirmar antes de publicar/);
 await page.screenshot({path:path.join(output,'cardapio-ficticio-apify-mobile.png'),fullPage:true});
 await full.getByRole('button',{name:'Fechar teste e voltar aos modelos',exact:true}).click();await page.reload({waitUntil:'networkidle'});await chooseMenuPreview(page);assert.equal(lookups,1);assert.match(await page.locator('body').textContent(),/1 produto precisa de conferência/);
 const checkpoint=await page.evaluate(()=>Object.values(localStorage).map(v=>{try{return JSON.parse(v);}catch{return null;}}).find(v=>v?.sourceText?.includes('Calabresa da Forno Azul')));
 assert.ok(checkpoint.sourceText.includes('Calabresa da Forno Azul R$ 49,90'));assert.ok(checkpoint.sourceText.includes('Água mineral sem gás R$ 5,50'));assert.ok(checkpoint.sourceText.includes('Guaraná da casa R$ 11,50'));
 checks.push({name:'prices appear in the display-only preview; the unsized pizza stays pending in the checkpoint and reload never repeats the lookup',ok:true});
 for(const width of [320,412,1280]){await page.setViewportSize({width,height:915});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
 await context.close();responseMode='empty';page=await start();
 await page.goto(base+'/criar',{waitUntil:'networkidle',timeout:90000});await page.waitForFunction(()=>document.querySelector('#owner-intake-message')?.disabled===false);
 await page.locator('#owner-intake-message').fill(url);await page.locator('.owner-intake-reply button[type=submit]').click();
 await page.getByRole('region',{name:'Confirme o nome da pizzaria'}).getByRole('button',{name:'Usar este nome',exact:true}).click();
 await page.getByRole('button',{name:'Ver prévia agora e completar depois',exact:true}).click();await chooseMenuPreview(page);
 assert.equal(await page.locator('.mini-product').count(),0,'An empty linked catalogue must never turn into sample pizzas');
 assert.match(await page.locator('.idea-notice').textContent(),/Não recebemos produtos verificáveis/);assert.equal(lookups,2);
 await page.screenshot({path:path.join(output,'catalogo-vazio-sem-produtos-inventados.png'),fullPage:true});
 await page.reload({waitUntil:'networkidle'});await chooseMenuPreview(page);
 assert.equal(await page.locator('.mini-product').count(),0);assert.match(await page.locator('.idea-notice').textContent(),/O link não trouxe produtos/);assert.equal(lookups,2,'Reload must not repeat the collector');
 checks.push({name:'an empty or blocked source remains empty with a recovery notice after preview and reload, never fictional products or a repeated collection',ok:true});
 assert.deepEqual(errors,[]);
}finally{
 await context?.close();await browser.close();await writeFile(path.join(output,'summary.json'),JSON.stringify({checks,errors,lookups,fictitious:true,scope:'UI + local browser storage with normalized simulated Apify dataset; no real Actor, account, order or payment',passed:checks.length===3&&!errors.length},null,2));
}
