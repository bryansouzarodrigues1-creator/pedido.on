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
async function open(persistent=false){context=persistent?await chromium.launchPersistentContext(path.resolve('.sites-runtime/browser-ci/guest/guest-profile'),{executablePath:process.env.QA_CHROME_PATH,headless:true,...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'}):await browser.newContext({...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(u.origin===base){if(!['GET','HEAD'].includes(r.method()))writes.push(u.pathname);if(['GET','HEAD'].includes(r.method())||/^\/api\/(?:guest-previews|creator\/availability|restaurants(?:\/|$))/.test(u.pathname))return route.continue();}return route.abort();});
 // Email signup UI is simulated; saving still uses only the official local identity.
 await context.route('**/api/auth/config?registration=1',async route=>{const response=await route.fetch(),value=await response.json();return route.fulfill({response,body:JSON.stringify({...value,enabled:true,registrationEnabled:true,captchaSiteKey:''})});});
 await page.goto(base+'/criar',{waitUntil:'networkidle',timeout:90000});await page.waitForFunction(()=>document.querySelector('#owner-intake-message')?.disabled===false);}
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
 await page.getByRole('button',{name:'Escolher outro',exact:true}).click();assert.match(await page.locator('.ai-template-options summary').textContent(),/80 modelos/);assert.equal(await page.locator('.ai-style-card').count(),4);
 await page.getByRole('button',{name:'Ver todos os 80 modelos',exact:true}).click();assert.equal(await page.locator('.ai-style-card').count(),80);
 await page.getByRole('searchbox',{name:'Buscar modelo'}).fill('madeira');assert.ok(await page.locator('.ai-style-card').count()>0);await page.getByRole('searchbox',{name:'Buscar modelo'}).fill('');
 for(const width of [320,412,1280]){await page.setViewportSize({width,height:915});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.setViewportSize({width:412,height:915});await page.locator('.ai-style-card').first().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'galeria-80-mobile.png'),fullPage:false});
 checks.push('80 editable models open together, filter by name and fit mobile and desktop');
 await page.locator('.ai-selected-more summary').click();await page.getByRole('button',{name:'Compartilhar prévia de teste (7 dias)',exact:true}).click();
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
 await open();await page.getByRole('button',{name:'Ainda não tenho cardápio',exact:true}).click();await page.locator('.ai-selected .mini-product').first().waitFor();assert.equal(await page.locator('.ai-selected .mini-product').count(),3);assert.match(await page.locator('.ai-gallery-sample').textContent(),/não são da sua pizzaria/);assert.ok((await page.locator('.ai-selected .mini-product b').first().textContent()).includes('35,00'));
 for(const image of await page.locator('.ai-selected .mini-product img').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(img=>img.decode());}
 const demoImages=await page.locator('.ai-selected .mini-product img').evaluateAll(els=>els.map(el=>({src:el.getAttribute('src'),loaded:el.complete&&el.naturalWidth>0})));assert.ok(demoImages.every(i=>i.src.includes('pizza-demo-')&&i.loaded));
 await page.locator('.ai-selected').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'previa-pizzas-precos-mobile.png'),fullPage:false});assert.equal(await page.locator('input[type=email]').count(),0);await page.getByRole('button',{name:'Enviar ou adicionar produtos',exact:true}).click();await page.locator('.idea-source').waitFor();
 checks.push('no-menu preview shows clearly labeled generated photos and example prices; actual draft stays empty');
 await page.getByRole('button',{name:'Salvar minha pizzaria',exact:true}).click();await page.getByLabel('Seu melhor e-mail').waitFor();assert.equal(await page.locator('.creator-consent').count(),0);
 checks.push('example products are not sent to the account finish as real products');
 await context.close();await open();let sourceCalls=0;
 const sourceUrl='https://www.ifood.com.br/delivery/cabo-frio-rj/pizzaria-azul-de-teste/900caad5-258e-4bf7-9458-353cb0bffe60';
 await context.route('**/api/menu-source',async route=>{sourceCalls++;assert.equal(route.request().postDataJSON().url,sourceUrl);await new Promise(resolve=>setTimeout(resolve,1200));return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'needs_content',url:sourceUrl,count:0,text:'',message:'Bloqueio controlado para conferir a interface.',store:{name:'Pizzaria Azul de Teste',address:'Rua de Teste, 10',hours:'18h às 23h'}})});});
 await page.locator('#owner-intake-message').fill(sourceUrl);await page.locator('.owner-intake-reply button[type=submit]').click();
 await page.getByText(/A consulta tem limite de até 1 min 40 s/).waitFor();
 await page.getByRole('button',{name:'Usar dados encontrados',exact:true}).click();await page.locator('.ai-selected .mini-menu').waitFor();
 assert.equal(sourceCalls,1);assert.equal(await page.locator('.ai-selected .mini-top strong').textContent(),'Pizzaria Azul de Teste');assert.match(await page.locator('.ai-gallery-sample').textContent(),/não são da sua pizzaria/);assert.equal(await page.locator('.ai-selected .mini-product').count(),3);
 await page.getByRole('textbox',{name:/Nome que aparece no seu cardápio/}).fill('Pizzaria Azul Confirmada');assert.equal(await page.locator('.ai-selected .mini-top strong').textContent(),'Pizzaria Azul Confirmada');
 checks.push('pasted URL is queried once automatically with elapsed time, source facts require confirmation and name remains editable; upstream mocked');
 assert.deepEqual(errors,[]);
 console.log('PASS CREATOR '+checks.length+' scenarios');
}catch(e){await page?.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await context?.close().catch(()=>{});await browser.close();await writeFile(path.join(output,'summary.json'),JSON.stringify({checks,errors,writes,scope:'Local synthetic D1/R2 + official local identity, no production mutations or paid providers'},null,2));}
