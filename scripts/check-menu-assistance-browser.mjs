// Disposable local D1/R2. Capture and WhatsApp destination are controlled fixtures.
// Browser UI, application routes, persistence and photo storage are real.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget} from './browser-qa-target.mjs';
import {pushNotice} from '../lib/push-policy.ts';
import {runnerResultFromCapture} from './menu-runner-result-fixture.mjs';
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
 await page.getByRole('button',{name:'Já tenho cardápio em foto, arquivo ou link',exact:true}).click();
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Importar PDF ou fotos',exact:true}).waitFor();
 const request=page.locator('details[aria-label="Solicitar trazer meu cardápio via link"]');await request.locator('summary').first().click();
 await followLink(request.getByRole('link',{name:'Falar com o suporte · +55 (22) 99999-8888',exact:true}),'5522999998888');
 assert.equal(await page.getByRole('button',{name:'Tentar link do iFood',exact:true}).count(),0);
 const submit=request.getByRole('button',{name:'Enviar solicitação de cardápio',exact:true});assert.equal(await submit.isEnabled(),false);
 await request.getByLabel('Seu WhatsApp com DDD (para respondermos à solicitação)',{exact:true}).fill('99999-0210');
 await request.getByLabel('Link ou mensagem de compartilhamento da sua loja no iFood',{exact:true}).fill('Esse lugar é a sua cara! Use o ícone de coração para salvar nos Favoritos. Loja QA - https://www.ifood.com.br/delivery/teste-rj/loja/123e4567-e89b-42d3-a456-426614174000');
 await request.getByLabel('Confirmo que sou responsável por esta loja e autorizo a leitura do cardápio acessível.',{exact:true}).check();assert.equal(await submit.isEnabled(),false);
 await request.getByLabel('Seu WhatsApp com DDD (para respondermos à solicitação)',{exact:true}).fill('(22) 99999-0210');assert.equal(await submit.isEnabled(),false);
 await request.getByLabel('Autorizo o suporte do Pizzaria.on a entrar em contato comigo pelo WhatsApp informado para tratar desta solicitação.',{exact:true}).check();assert.equal(await submit.isEnabled(),true);
 await submit.click();await request.getByRole('status').filter({hasText:'Recebida pela equipe'}).waitFor();
 for(const width of [320,412,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Request must fit '+width+'px');}
 await page.setViewportSize({width:412,height:915});await page.screenshot({path:path.join(output,'request-mobile.png'),fullPage:true});
 checks.push({name:'official support link intercepted; customer DDD and separate consents required; responsive request saved',ok:true});

 const ownerRequest=await api('/api/restaurants/'+shop.id+'/import-assistance');assert.equal(ownerRequest.status,200);const requestId=ownerRequest.body.request.id;assert.equal(ownerRequest.body.request.contactWhatsApp,'5522999990210');assert.equal(ownerRequest.body.request.storeUrl,'https://www.ifood.com.br/delivery/teste-rj/loja/123e4567-e89b-42d3-a456-426614174000');
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
 // waitForFunction treats a Promise as truthy before its async result is known.
 // Poll the resolved IndexedDB value, then assert persistence before reloading.
 const savedDeadline=Date.now()+10000;let savedReview;
 do{savedReview=await page.evaluate(id=>new Promise((resolve,reject)=>{const request=indexedDB.open('pedido-menu-readings',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,r=db.transaction('readings','readonly').objectStore('readings').get(id);r.onsuccess=()=>{const v=r.result;db.close();resolve(v);};r.onerror=()=>{db.close();reject(r.error);};};}),shop.id);if(savedReview?.items.some(i=>i.name==='Água assistida QA'&&i.price===600)&&Object.values(savedReview?.photoSuggestions||{}).length===1)break;await new Promise(resolve=>setTimeout(resolve,100));}while(Date.now()<savedDeadline);
 assert.equal(savedReview?.items.find(i=>i.name==='Água assistida QA')?.price,600,'Edited price must actually reach IndexedDB before reload');assert.equal(Object.values(savedReview?.photoSuggestions||{}).length,1);
 await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Levar produtos ao leitor para revisar',exact:true}).click();await review.waitFor();
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

 const runnerShop=await api('/api/restaurants','POST',{name:'Robô QA isolado',slug:'robo-qa-'+Date.now(),theme:'editorial',plan:'essencial'});
 assert.equal(runnerShop.status,201,JSON.stringify(runnerShop.body));const remoteShop=runnerShop.body.restaurant;
 const newRequest=await api('/api/restaurants/'+remoteShop.id+'/import-assistance','POST',{storeUrl:ownerRequest.body.request.storeUrl,authorized:true,contactWhatsApp:'(22) 99999-0210',contactPermission:true,notifyWhenReady:false});
 assert.equal(newRequest.status,201,JSON.stringify(newRequest.body));
 await admin.reload({waitUntil:'networkidle'});
 const remoteRow=admin.locator('.account-card > div > section').filter({has:admin.getByText(remoteShop.name,{exact:true})});
 const importPanel=remoteRow.locator('details[aria-label="Resultado do robô"]');
 await importPanel.locator('summary').first().click();
 const captured=runnerResultFromCapture({...capture,capturedAt:new Date().toISOString()});
 const wrong=structuredClone(captured);wrong.report.sourceUrl=wrong.report.sourceUrl.replace(/000$/,'001');wrong.capture.sourceUrl=wrong.report.sourceUrl;wrong.report.storeId=wrong.report.sourceUrl.split('/').at(-1);
 const choose=async value=>importPanel.getByLabel('Arquivo da captura').setInputFiles({name:'resultado-importacao.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
 await choose(wrong);await importPanel.getByRole('alert').filter({hasText:'outra loja'}).waitFor();
 assert.equal(await importPanel.getByRole('button',{name:'Entregar para revisão do dono',exact:true}).count(),0);
 await choose(captured);await importPanel.getByRole('status').filter({hasText:'3 produtos'}).waitFor();
 const send=importPanel.getByRole('button',{name:'Entregar para revisão do dono',exact:true});assert.equal(await send.isEnabled(),false);
 await importPanel.getByLabel('Conferi a loja e autorizo entregar este resultado para revisão do dono.',{exact:true}).check();assert.equal(await send.isEnabled(),true);
 await admin.setViewportSize({width:412,height:915});assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 await admin.screenshot({path:path.join(output,'runner-admin-review-mobile.png'),fullPage:true});
 await send.click();await remoteRow.getByText('Catálogo entregue para revisão do proprietário. Nenhum preço ou foto foi publicado.',{exact:true}).waitFor();
 const remoteAfter=(await api('/api/restaurants')).body.restaurants.find(r=>r.id===remoteShop.id);assert.equal(remoteAfter.data,remoteShop.data);assert.equal(remoteAfter.published,false);
 await page.goto(base+pushNotice('menu',remoteShop.id).url,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Levar produtos ao leitor para revisar',exact:true}).click();
 await review.waitFor();assert.equal(await review.locator('.reader-item').count(),2);
 assert.equal(await review.getByRole('button',{name:/Adicionar 2 ao rascunho/}).isEnabled(),false);
 await page.screenshot({path:path.join(output,'runner-owner-review-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 checks.push({name:'runner JSON rejects another shop, requires explicit admin review and reaches owner review without changing a draft or publishing',ok:true});

 // A real Browserbase access refusal yields report.json but no catalog.
 // Exercise the new admin/owner UI with a synthetic refusal in isolated D1.
 const blockedCreated=await api('/api/restaurants','POST',{name:'Bloqueio QA isolado',slug:'bloqueio-qa-'+Date.now(),theme:'editorial',plan:'essencial'});
 assert.equal(blockedCreated.status,201,JSON.stringify(blockedCreated.body));const blockedShop=blockedCreated.body.restaurant;
 const blockedRequest=await api('/api/restaurants/'+blockedShop.id+'/import-assistance','POST',{storeUrl:ownerRequest.body.request.storeUrl,authorized:true,contactWhatsApp:'(22) 99999-0210',contactPermission:true,notifyWhenReady:false});
 assert.equal(blockedRequest.status,201,JSON.stringify(blockedRequest.body));
 await admin.reload({waitUntil:'networkidle'});
 const blockedRow=admin.locator('.account-card > div > section').filter({has:admin.getByText(blockedShop.name,{exact:true})});
 const blockedPanel=blockedRow.locator('details[aria-label="Relatar tentativa bloqueada"]');
 await blockedPanel.locator('summary').first().click();
 const blockedSource=ownerRequest.body.request.storeUrl;
 const blockedReport={format:'pizzaria-on-capture-report-v1',checkedAt:new Date().toISOString(),
  sourceUrl:blockedSource,storeId:blockedSource.split('/').at(-1),
  outcome:'blocked',documentStatus:403,stopReason:'http_403',itemCount:0,
  exportableCount:0,pendingCount:0,pizzaSizesPending:0,scrolls:0,blockedRequests:0,
  truncated:false,completeness:'unverified',partial:true,elapsedMs:500};
 const putReport=async value=>blockedPanel.getByLabel('Relatório da tentativa').setInputFiles({name:'report.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
 await putReport({...blockedReport,storeId:'223e4567-e89b-42d3-a456-426614174000'});
 await blockedPanel.getByRole('alert').filter({hasText:'outra loja'}).waitFor();
 assert.equal(await blockedPanel.getByRole('button',{name:'Informar bloqueio ao proprietário'}).count(),0);
 await putReport(blockedReport);
 await blockedPanel.getByRole('status').filter({hasText:'0 produtos'}).waitFor();
 const markBlocked=blockedPanel.getByRole('button',{name:'Informar bloqueio ao proprietário'});
 assert.equal(await markBlocked.isEnabled(),false);
 await blockedPanel.getByLabel('Conferi o relatório real da loja e confirmo que não há itens para importar nesta tentativa.').check();
 await admin.screenshot({path:path.join(output,'blocked-admin-mobile.png'),fullPage:true});
 await markBlocked.click();
 await blockedRow.getByText('A leitura não foi concluída.',{exact:false}).waitFor();
 const blockedPersist=(await api('/api/restaurants/'+blockedShop.id+'/import-assistance')).body.request;
 assert.equal(blockedPersist.status,'blocked');assert.match(blockedPersist.failureMessage,/HTTP 403/);
 assert.equal(blockedPersist.capture,undefined);assert.equal(blockedPersist.menuText,undefined);
 const blockedData=(await api('/api/restaurants')).body.restaurants.find(r=>r.id===blockedShop.id);
 assert.equal(blockedData.data,blockedShop.data);assert.equal(blockedData.published,false);
 await page.goto(base+pushNotice('menu',blockedShop.id).url,{waitUntil:'networkidle'});
 const ownerBlocked=page.locator('details[aria-label="Solicitar trazer meu cardápio via link"]');
 await ownerBlocked.getByRole('alert').filter({hasText:'HTTP 403'}).waitFor();
 assert.equal(await ownerBlocked.getByRole('button',{name:'Levar produtos ao leitor para revisar'}).count(),0);
 await page.getByRole('button',{name:'Importar PDF ou fotos',exact:true}).waitFor();
 await page.setViewportSize({width:320,height:900});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Blocked owner notice must fit 320px');
 await page.screenshot({path:path.join(output,'blocked-owner-mobile.png'),fullPage:true});
 await ownerBlocked.getByRole('button',{name:'Solicitar nova ajuda'}).click();
 await ownerBlocked.getByLabel('Seu WhatsApp com DDD (para respondermos à solicitação)',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);
 checks.push({name:'blocked report cannot import products; administrator checks store; owner sees 403, PDF/photos fallback and new request on 320px mobile',ok:true});
}catch(e){errors.push(e.message);await page?.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await writeFile(path.join(output,'summary.json'),JSON.stringify({base,checks,errors,passed:checks.length===7&&!errors.length,browser:'Chrome / Pixel 7 emulated, no physical Android',scope:'Real local app/D1/R2; controlled capture client, notification event and intercepted WhatsApp; no real iFood collection or message'},null,2));await context.close();}
