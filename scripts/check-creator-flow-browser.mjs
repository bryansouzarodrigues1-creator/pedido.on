// Actual Chrome + local D1/R2. No production records, paid AI or external messages.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget} from './browser-qa-target.mjs';
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const {base,publicReadOnly}=browserQaTarget();if(publicReadOnly)throw Error('Only isolated QA may save synthetic stores.');
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||'.sites-runtime/browser-ci/creator');await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true}),checks=[],errors=[],writes=[];
let context,page;
async function open(persistent=false){context=persistent?await chromium.launchPersistentContext(path.resolve('.sites-runtime/browser-ci/guest/guest-profile'),{executablePath:process.env.QA_CHROME_PATH,headless:true,...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'}):await browser.newContext({...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(u.origin===base){if(!['GET','HEAD'].includes(r.method()))writes.push(u.pathname);if(['GET','HEAD'].includes(r.method())||/^\/api\/(?:guest-previews|creator\/availability|restaurants(?:\/|$))/.test(u.pathname))return route.continue();}return route.abort();});await page.goto(base+'/criar',{waitUntil:'networkidle',timeout:90000});await page.waitForFunction(()=>document.querySelector('#owner-intake-message')?.disabled===false);}
async function say(text){await page.locator('#owner-intake-message').fill(text);await page.locator('.owner-intake-reply button[type=submit]').click();await page.locator('.ai-selected .mini-menu').waitFor();}
try{
 await open(true);
 assert.equal(await page.getByRole('button',{name:'Tenho um link do iFood',exact:true}).count(),0);
 assert.equal(await page.locator('input[type=email],input[type=password]').count(),0);
 await say('Minha pizzaria se chama Memórias do Forno QA. Quero madeira e nostalgia.\nBebidas\nÁgua mineral R$ 5,00\nSuco natural R$ 8,00');
 assert.equal(await page.locator('.ai-selected .texture-wood').count(),1);
 assert.equal(await page.locator('.ai-selected .mini-top strong').textContent(),'Memórias do Forno QA');
 assert.equal(await page.locator('.ai-selected .mini-product').count(),2);
 assert.equal(await page.locator('input[type=email],input[type=password]').count(),0);assert.deepEqual(writes,[]);
 for(const width of [320,412,1280]){await page.setViewportSize({width,height:915});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.setViewportSize({width:412,height:915});await page.screenshot({path:path.join(output,'madeira-nostalgia-mobile.png'),fullPage:true});
 checks.push('one description creates a wood preview, retains products and prices and never requests signup');
 await page.getByRole('button',{name:'Escolher outro',exact:true}).click();assert.match(await page.locator('.ai-template-options summary').textContent(),/252 opções/);assert.equal(await page.locator('.ai-style-card').count(),4);
 await page.getByRole('button',{name:'Ver mais 4 modelos',exact:true}).click();assert.equal(await page.locator('.ai-style-card').count(),4);
 checks.push('252 presets are discoverable in four-card pages');
 await page.getByRole('button',{name:'Criar link da prévia sem cadastro',exact:true}).click();
 const link=page.locator('.creator-share-result a');await link.waitFor();const href=await link.getAttribute('href');assert.match(href,/\/v\/[a-f0-9]{32}$/);
 const fresh=await browser.newContext({...devices['Pixel 7'],serviceWorkers:'block'}),viewer=await fresh.newPage();await viewer.goto(href,{waitUntil:'networkidle'});assert.match(await viewer.locator('.mini-top strong').textContent(),/Memórias do Forno QA/);assert.equal(await viewer.locator('.mini-product').count(),2);assert.match(await viewer.locator('.shared-preview-banner').textContent(),/ainda não recebe pedidos/);await viewer.screenshot({path:path.join(output,'link-sem-cadastro.png'),fullPage:true});await fresh.close();
 checks.push('fresh visitor opens the actual unlisted D1/R2 preview without an account');
 await page.getByRole('button',{name:'Salvar minha pizzaria',exact:true}).click();await page.getByLabel('Seu melhor e-mail').waitFor();assert.equal(await page.getByLabel('Nome da pizzaria',{exact:true}).inputValue(),'Memórias do Forno QA');assert.equal(await page.getByLabel('Crie uma senha',{exact:true}).count(),1);assert.ok(writes.every(p=>p==='/api/guest-previews'));
 checks.push('email and password appear only alongside final pizzeria details');
 // The official local identity exercises saving without contacting Supabase.
 await page.goto(base+'/signin-with-chatgpt?return_to='+encodeURIComponent('/criar'),{waitUntil:'networkidle',timeout:90000});
 await page.locator('.ai-selected .mini-menu').waitFor();await page.getByRole('button',{name:'Salvar minha pizzaria',exact:true}).click();await page.getByText('Sua conta está conectada.',{exact:false}).waitFor();
 await page.getByLabel('WhatsApp da pizzaria com DDD',{exact:false}).fill('(22) 98765-0211');await page.getByText('WhatsApp disponível para sua pizzaria.',{exact:true}).waitFor();
 await page.getByLabel('Conferi os produtos, tamanhos e preços que quero cobrar diretamente.',{exact:true}).check();
 await page.locator('.creator-finish button[type=submit]').click();await page.waitForURL(/\/app\?loja=/,{timeout:45000});
 const rows=await page.evaluate(async()=>{const r=await fetch('/api/restaurants');return (await r.json()).restaurants;});const saved=rows.find(row=>row.name==='Memórias do Forno QA');assert.ok(saved);assert.equal(saved.published,false);const draft=JSON.parse(saved.data);assert.equal(draft.products.length,2);assert.equal(draft.whatsapp,'5522987650211');assert.match(draft.presentation.catalogueId,/^madeira-nostalgica-/);
 checks.push('inline finish saves the same designed menu and real prices as an unpublished draft');
 await context.close();
 await open();await page.getByRole('button',{name:'Ainda não tenho cardápio',exact:true}).click();await page.locator('.ai-selected .mini-empty').waitFor();assert.equal(await page.locator('input[type=email]').count(),0);await page.getByRole('button',{name:'Enviar ou adicionar produtos',exact:true}).click();await page.locator('.idea-source').waitFor();
 checks.push('no-menu option advances to a preview and products can be added later');
 assert.deepEqual(errors,[]);
 console.log('PASS CREATOR '+checks.length+' scenarios');
}catch(e){await page?.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await context?.close().catch(()=>{});await browser.close();await writeFile(path.join(output,'summary.json'),JSON.stringify({checks,errors,writes,scope:'Local synthetic D1/R2 + official local identity, no production mutations or paid providers'},null,2));}
