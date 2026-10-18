// The published guided entry is exercised using browser-local state only.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget,guardPublicGuestContext} from './browser-qa-target.mjs';
const {base,publicReadOnly}=browserQaTarget();if(!publicReadOnly)throw Error('This check is only for the authorized public read-only origin.');
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||'.sites-runtime/browser-ci/public/guest'),dir=path.join(output,'evidence');await mkdir(dir,{recursive:true});
const checks=[],errors=[];const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true}),context=await browser.newContext({...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});
await guardPublicGuestContext(context,errors);const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/criar',{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>document.querySelector('#owner-intake-message')?.disabled===false);
 assert.equal(await page.locator('input[type=email],input[type=password]').count(),0);
 const adaptive=await page.locator('.owner-start-options').count()>0;
 if(adaptive)assert.doesNotMatch(await page.locator('.owner-intake').textContent(),/cr[eé]ditos|geraç[aã]o paga|sem gastar/i);
 checks.push({name:'published guided entry is usable without signup',ok:true,adaptive});
 for(const text of ['Minha pizzaria se chama Forno Azul Público QA. Quero amarelo cor de queijo e azul do mar.','Rua de Teste, 137, Bairro Fictício, Búzios - RJ','depois','Terça a domingo, 18h às 23h30','depois']){
  await page.locator('#owner-intake-message').fill(text);await page.getByRole('button',{name:'Enviar',exact:true}).click();
 }
 await page.getByRole('button',{name:/Ver meus 12 modelos personalizados/}).click();await page.locator('.ai-style-card').first().waitFor();
 assert.equal(await page.locator('.ai-style-card').count(),4);assert.equal(await page.locator('.ai-style-card .mini-top strong').first().textContent(),'Forno Azul Público QA');
 assert.match(await page.locator('.mini-store-address').first().textContent(),/Rua de Teste/);assert.match(await page.locator('.mini-store-hours').first().textContent(),/23h30/);
 await page.screenshot({path:path.join(dir,'published-guided-personalized.png'),fullPage:true});
 checks.push({name:'published local-only briefing reaches personalized previews with confirmed address and hours',ok:true});assert.deepEqual(errors,[]);
}finally{await context.close();await browser.close();await writeFile(path.join(dir,'guest-browser.json'),JSON.stringify({base,checks,errors,scope:'Browser-local only. No signup, source lookup, payment, model or remote mutation.'},null,2));}
