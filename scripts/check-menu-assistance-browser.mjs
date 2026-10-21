// Disposable local D1/R2. Capture and WhatsApp destination are controlled fixtures.
// Browser UI, application routes, persistence and photo storage are real.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget} from './browser-qa-target.mjs';
import {pushNotice} from '../lib/push-policy.ts';
const {base,publicReadOnly}=browserQaTarget();if(publicReadOnly)throw Error('Assistance QA requires isolated local resources.');
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||'.sites-runtime/browser-ci/assistance'),profile=path.resolve('.sites-runtime/browser-ci/guest/guest-profile');
await mkdir(output,{recursive:true});
const context=await chromium.launchPersistentContext(profile,{executablePath:process.env.QA_CHROME_PATH,headless:true,...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'}),checks=[],errors=[],handoffs=[];
await context.route('**/*',async route=>{const url=new URL(route.request().url());
 if(url.origin===base)return route.continue();
 if(url.origin==='https://wa.me'){handoffs.push(url.href);return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>WhatsApp interceptado</title><p>Teste isolado. Nenhuma mensagem enviada.</p>'});}
 errors.push('External request blocked: '+url.origin);return route.abort();
});
let page,admin;
async function api(pathname,method='GET',body){return page.evaluate(async({pathname,method,body})=>{const {csrf}=await (await fetch('/api/auth/config',{cache:'no-store'})).json(),r=await fetch(pathname,{method,headers:{'Content-Type':'application/json','x-pedido-csrf':csrf},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json()};},{pathname,method,body});}
async function followLink(locator,number){const opened=context.waitForEvent('page');await locator.click();const popup=await opened;await popup.waitForLoadState('domcontentloaded');assert.equal(new URL(popup.url()).pathname,'/'+number);await popup.close();}
try{
 page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/signin-with-chatgpt?return_to=%2Fapp',{waitUntil:'networkidle',timeout:90000});
 const created=await api('/api/restaurants','POST',{name:'Assistência QA isolada',slug:'assistencia-qa-'+Date.now(),theme:'editorial',plan:'essencial'});assert.equal(created.status,201,JSON.stringify(created.body));const shop=created.body.restaurant,before=JSON.parse(shop.data);
 await page.goto(base+'/app?loja='+shop.id,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Importar PDF ou fotos',exact:true}).waitFor();
 const support=page.getByRole('region',{name:'Atendimento pelo WhatsApp'});await support.getByText('+55 (22) 99999-8888',{exact:true}).waitFor();
 await followLink(support.getByRole('link',{name:'Falar com o suporte no WhatsApp'}),'5522999998888');
 const request=page.locator('details[aria-label="Importação assistida do iFood"]');await request.locator('summary').first().click();
 const submit=request.getByRole('button',{name:'Solicitar que tragam meu cardápio',exact:true});assert.equal(await submit.isEnabled(),false);
 await request.getByLabel('Seu WhatsApp com DDD (para respondermos à solicitação)',{exact:true}).fill('99999-0210');
 await request.getByLabel('Link da sua loja no iFood',{exact:true}).fill('https://www.ifood.com.br/delivery/teste-rj/loja/123e4567-e89b-42d3-a456-426614174000');
 await request.getByLabel('Confirmo que sou responsável por esta loja e autorizo a leitura do cardápio acessível.',{exact:true}).check();assert.equal(await submit.isEnabled(),false);
 await request.getByLabel('Seu WhatsApp com DDD (para respondermos à solicitação)',{exact:true}).fill('(22) 99999-0210');assert.equal(await submit.isEnabled(),false);
 await request.getByLabel('Autorizo o suporte do Pizzaria.on a entrar em contato comigo pelo WhatsApp informado para tratar desta solicitação.',{exact:true}).check();assert.equal(await submit.isEnabled(),true);
 await submit.click();await request.getByRole('status').filter({hasText:'Solicitação registrada'}).waitFor();
 for(const width of [320,412,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Request must fit '+width+'px');}
 await page.setViewportSize({width:412,height:915});await page.screenshot({path:path.join(output,'request-mobile.png'),fullPage:true});
 checks.push({name:'official support link intercepted; customer DDD and separate consents required; responsive request saved',ok:true});

 const ownerRequest=await api('/api/restaurants/'+shop.id+'/import-assistance');assert.equal(ownerRequest.status,200);const requestId=ownerRequest.body.request.id;assert.equal(ownerRequest.body.request.contactWhatsApp,'5522999990210');
 admin=await context.newPage();admin.setDefaultTimeout(25000);admin.on('pageerror',e=>errors.push(e.message));await admin.goto(base+'/admin/importacoes',{waitUntil:'networkidle'});
 const row=admin.locator('.account-card > div > section').filter({has:admin.getByText(shop.name,{exact:true})});await row.getByRole('link',{name:'Responder pelo WhatsApp',exact:true}).waitFor();
 await followLink(row.getByRole('link',{name:'Responder pelo WhatsApp',exact:true}),'5522999990210');
 await row.getByRole('button',{name:'Gerar novo código para a extensão',exact:true}).click();await row.locator('#pairing-code').waitFor();const code=await row.locator('#pairing-code').inputValue();assert.match(code,/^[a-f\d-]{36}\.[a-f\d]{64}$/i);
 checks.push({name:'administrator sees only an authenticated queue and the exact authorized WhatsApp; temporary code generated',ok:true});
 const source='https://static-images.ifood.com.br/synthetic-browser.png',extensionHeaders={origin:'chrome-extension://'+'a'.repeat(32),authorization:'Bearer '+code};
 const photo=await fetch(base+'/api/menu-import-images',{method:'POST',headers:{...extensionHeaders,'content-type':'image/png','x-menu-item-id':'pizza','x-source-image-url':source},body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfS8AAAAASUVORK5CYII=','base64')});assert.equal(photo.status,201,await photo.clone().text());const photoURL=(await photo.json()).url;
 const capture={sourceUrl:ownerRequest.body.request.storeUrl,storeName:'Nome externo que não deve substituir a loja',capturedAt:new Date().toISOString(),truncated:false,items:[
  {id:'pizza',category:'Pizzas',name:'Pizza assistida QA',description:'Ingredientes fictícios para teste',priceCents:5590,rawPrice:'R$ 55,90',imageUrl:source,needsReview:false,available:true,selected:true,sizeChoice:'g'},
  {id:'water',category:'Bebidas',name:'Água assistida QA',description:'500 ml',priceCents:550,rawPrice:'R$ 5,50',imageUrl:null,needsReview:false,available:true,selected:true,sizeChoice:null},
  {id:'pending',category:'Combos',name:'Combo a conferir QA',description:'',priceCents:null,rawPrice:'A partir de R$ 75,00',imageUrl:null,needsReview:true,available:true,selected:false,sizeChoice:null}
 ]};
 const delivered=await fetch(base+'/api/menu-import-deliveries',{method:'POST',headers:{...extensionHeaders,'content-type':'application/json'},body:JSON.stringify(capture)});assert.equal(delivered.status,200,await delivered.clone().text());assert.equal((await delivered.json()).stats.uploadedPhotos,1);
 assert.equal((await fetch(base+'/api/menu-import-deliveries',{method:'POST',headers:{...extensionHeaders,'content-type':'application/json'},body:JSON.stringify(capture)})).status,401);
 assert.equal((await api('/api/restaurants')).body.restaurants.find(r=>r.id===shop.id).data,shop.data);
 await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Levar produtos ao leitor para revisar',exact:true}).waitFor();
 await page.getByText('Ver registros pendentes de conferência',{exact:true}).click();await page.getByText('Combo a conferir QA',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Levar produtos ao leitor para revisar',exact:true}).click();
 const review=page.getByRole('dialog',{name:'Confira os produtos',exact:true});await review.waitFor();assert.equal(await review.locator('.reader-item').count(),2);assert.equal(await review.getByRole('button',{name:/Adicionar 2 ao rascunho/}).isEnabled(),false);
 const water=review.locator('.reader-item').filter({has:page.getByText('Água assistida QA',{exact:true})});await water.locator('details.reader-edit summary').click();await water.getByLabel('Preço · R$',{exact:true}).fill('6,00');await water.getByLabel('Preço · R$',{exact:true}).press('Tab');
 await page.waitForFunction(async id=>await new Promise(resolve=>{const request=indexedDB.open('pedido-menu-readings',1);request.onsuccess=()=>{const db=request.result,r=db.transaction('readings','readonly').objectStore('readings').get(id);r.onsuccess=()=>{const v=r.result;db.close();resolve(v?.items.some(i=>i.name==='Água assistida QA'&&i.price===600)&&Object.values(v?.photoSuggestions||{}).length===1);};};}),shop.id);
 await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Levar produtos ao leitor para revisar',exact:true}).click();await review.waitFor();
 console.log('ASSISTANCE_RESTORED',JSON.stringify(await review.locator('.reader-item').evaluateAll(rows=>rows.map(row=>({name:row.querySelector('.reader-item-summary > div > b')?.textContent,price:row.querySelector('.reader-price-summary')?.textContent,text:row.innerText})))));
 await water.locator('.reader-price-summary').getByText(/^R\$\s*6,00$/).waitFor();
 assert.equal(await review.locator('img[alt="Possível foto de Pizza assistida QA"]').getAttribute('src'),photoURL);
 assert.equal((await api('/api/restaurants')).body.restaurants.find(r=>r.id===shop.id).data,shop.data);
 await page.screenshot({path:path.join(output,'review-restored-mobile.png'),fullPage:true});
 checks.push({name:'controlled extension client delivers once; no draft changes; pending entries visible; edited price and photo survive reload',ok:true});

 await review.getByRole('button',{name:/Ver foto sugerida e trecho original/}).click();const original=page.getByRole('dialog',{name:'Trecho original',exact:true});await original.getByRole('img',{name:'Foto recebida de Pizza assistida QA',exact:true}).waitFor();await original.getByRole('button',{name:'Fechar janela',exact:true}).click();
 await review.getByLabel('Conferi: esta foto representa Pizza assistida QA e tenho autorização para usá-la.',{exact:true}).check();
 await review.getByRole('button',{name:'Ver cardápio',exact:true}).click();const preview=page.getByRole('dialog').last();await preview.locator('img[src="'+photoURL+'"]').waitFor();await page.screenshot({path:path.join(output,'approved-preview-mobile.png'),fullPage:true});await preview.getByRole('button',{name:'Fechar janela',exact:true}).click();
 await review.getByLabel('Conferi os produtos, tamanhos e preços que quero cobrar diretamente (os valores do iFood podem ser diferentes).',{exact:true}).check();await review.getByRole('button',{name:/Adicionar 2 ao rascunho/}).click();
 await review.waitFor({state:'hidden'});await page.getByText('Produtos importados e rascunho salvo. Publique quando estiver pronto.',{exact:true}).waitFor();
 const after=(await api('/api/restaurants')).body.restaurants.find(r=>r.id===shop.id),data=JSON.parse(after.data);assert.equal(after.published,false);assert.equal(data.products.length,2);assert.equal(data.products.find(p=>p.name==='Água assistida QA').price,600);assert.equal(data.products.find(p=>p.name==='Pizza assistida QA').sizes.g,5590);assert.equal(data.products.find(p=>p.name==='Pizza assistida QA').image,photoURL);
 for(const key of ['name','address','hours','whatsapp','pix'])assert.deepEqual(data[key],before[key]);assert.equal((await api('/api/restaurants/'+shop.id+'/import-assistance')).body.request.id,requestId);
 await page.screenshot({path:path.join(output,'draft-saved-mobile.png'),fullPage:true});assert.equal(handoffs.length,2);assert.deepEqual(errors,[]);
 checks.push({name:'each photo and direct-sale price require approval; only reviewed draft changes, store identity and publication preserved',ok:true});
 const notification=pushNotice('menu',shop.id).url;
 await page.goto(base+notification,{waitUntil:'networkidle'});await page.getByRole('button',{name:'Levar produtos ao leitor para revisar',exact:true}).waitFor();
 await page.goto(base+'/app?loja='+shop.id,{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Pedidos',exact:true}).waitFor();
 await page.evaluate(url=>navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'OPEN_NOTIFICATION',url}})),notification);
 await page.getByRole('button',{name:'Levar produtos ao leitor para revisar',exact:true}).waitFor();await page.screenshot({path:path.join(output,'notification-review-mobile.png'),fullPage:true});
 checks.push({name:'menu-ready URL and simulated service-worker event both open the correct shop review',ok:true});
}catch(e){errors.push(e.message);await page?.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await writeFile(path.join(output,'summary.json'),JSON.stringify({base,checks,errors,passed:checks.length===5&&!errors.length,browser:'Chrome / Pixel 7 emulated, no physical Android',scope:'Real local app/D1/R2; controlled capture client, notification event and intercepted WhatsApp; no real iFood collection or message'},null,2));await context.close();}
