import {chooseMenuPreview} from './choose-menu-preview.mjs';
// Fictitious PDF/TXT/HTML and mocked signup; real PDF.js, OCR, UI and persistence.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget,guardPublicGuestContext} from './browser-qa-target.mjs';
const {base,publicReadOnly}=browserQaTarget();
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const fixtures=JSON.parse(await readFile(new URL('./fixtures/menu-documents.json',import.meta.url),'utf8'));
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||'.sites-runtime/browser-ci/documents');await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true}),checks=[],errors=[];
let context,page,signup=[];
async function start(){
 context=await browser.newContext({...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});
 await guardPublicGuestContext(context,errors);
 await context.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());
  if(u.origin===base&&u.pathname==='/api/auth/config')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,registrationEnabled:true,recoveryEnabled:false,inviteRequired:false,googleEnabled:false,csrf:'document-qa-csrf'})});
  if(u.origin===base&&u.pathname==='/api/auth/register'&&r.method()==='POST'){
   signup.push(r.postDataJSON());assert.equal(r.headers()['x-pedido-csrf'],'document-qa-csrf');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({message:'Cadastro fictício recebido no teste.'})});
  }
  if(u.origin===base&&['GET','HEAD','OPTIONS'].includes(r.method()))return route.continue();
  if(publicReadOnly)return route.fallback();
  errors.push(r.method()+' '+u.pathname);return route.abort();
 });
 page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/criar',{waitUntil:'networkidle',timeout:90000});await page.waitForFunction(()=>document.querySelector('#owner-intake-message')?.disabled===false);
}
async function attach(name,buffer,mimeType='application/pdf'){
 if(!await page.locator('.idea-source').isVisible()){const add=page.getByRole('button',{name:'Enviar ou adicionar produtos',exact:true});if(await add.isVisible())await add.click();else await page.getByRole('button',{name:'Enviar PDF, foto ou TXT',exact:true}).click();}
 await page.locator('.idea-file-actions input[accept*=".pdf"]').setInputFiles({name,mimeType,buffer});
}
async function storedItems(count){
 // Find the app's own key rather than duplicating its storage-prefix implementation.
 const deadline=Date.now()+120000;
 do{
  const reading=await page.evaluate(n=>new Promise((resolve,reject)=>{const req=indexedDB.open('pedido-menu-readings',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result;if(!db.objectStoreNames.contains('readings')){db.close();resolve(null);return;}const read=db.transaction('readings','readonly').objectStore('readings').getAll();read.onsuccess=()=>{const found=read.result.findLast(v=>v.items.length===n);db.close();resolve(found||null);};read.onerror=()=>{db.close();reject(read.error);};};}),count);
  if(reading)return reading;
  await new Promise(resolve=>setTimeout(resolve,100));
 }while(Date.now()<deadline);
 throw Error('A leitura com '+count+' produtos não foi confirmada no armazenamento.');
}
async function preview(){await page.getByRole('button',{name:'Criar minha prévia',exact:true}).click();await chooseMenuPreview(page,{manual:!publicReadOnly});}
async function say(text){await page.locator('#owner-intake-message').fill(text);await page.locator('.owner-intake-reply button[type=submit]').click();}
try{
 await start();await attach('cardapio-texto.pdf',Buffer.from(fixtures.text,'base64'));await page.locator('.idea-photos img').first().waitFor();
 assert.equal(await page.locator('.idea-photos img').count(),2);
 if(!publicReadOnly){
  await attach('cardapio-texto.pdf',Buffer.from('broken PDF'));await page.getByRole('alert').filter({hasText:/PDF válido/}).waitFor();
  assert.equal(await page.locator('.idea-photos img').count(),2,'A failed replacement must retain the old pages');
  await attach('cardapio-texto.pdf',Buffer.from(fixtures.text,'base64'));
  await page.waitForFunction(()=>document.querySelector('.idea-file-actions input[accept*=".pdf"]')?.disabled===false);
  assert.equal(await page.locator('.idea-photos img').count(),2,'Re-uploading a PDF replaces its pages instead of duplicating them');
 }
 await page.getByRole('button',{name:'Criar minha prévia',exact:true}).waitFor();
 assert.equal(await page.locator('#owner-intake-message').count(),0,'PDF labels should avoid asking again for supplied details');
 await preview();const digital=await storedItems(4);assert.equal(digital.pages.length,2);assert.ok(digital.pages.every(p=>p.lines.length>0));
 assert.equal(digital.items.find(p=>p.name==='Água mineral').price,500);assert.equal(digital.items.find(p=>p.name==='Suco de laranja').price,1250);
 assert.deepEqual(digital.items.find(p=>p.name==='Calabresa').sizes,{p:3290,m:null,g:5290});
 assert.deepEqual(digital.items.find(p=>p.name==='Margherita').sizes,{p:3590,m:null,g:5590});
 assert.match(await page.locator('.ai-selected .mini-top strong').textContent(),/Forno Azul de Teste/);
 assert.match(await page.locator('.ai-selected .mini-store-hours').textContent(),/23h30/);
 for(const width of [320,412,1280]){
  await page.setViewportSize({width,height:915});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  const previewPane=page.locator('.ai-selected-preview');const size=await previewPane.boundingBox();assert.ok(size.height<=601);
  if(!publicReadOnly){
   const prices=await previewPane.evaluate(el=>{
    const css=getComputedStyle(el);el.scrollTop=el.scrollHeight;
    const region=el.getBoundingClientRect(),last=[...el.querySelectorAll('.mini-product b')].at(-1),price=last?.getBoundingClientRect();
    return {mask:css.maskImage,scroll:css.overflowY,lastVisible:!!price&&price.top>=region.top&&price.bottom<=region.bottom+1};
   });
   assert.equal(prices.mask,'none');assert.equal(prices.scroll,'auto');assert.equal(prices.lastVisible,true,'Every printed price must be reachable without a fade or crop');
   await previewPane.evaluate(el=>el.scrollTop=0);
  }
  assert.equal(await page.locator('.ai-selected .mini-pizza').count(),0);
  const font=await page.locator('.ai-selected .mini-product strong').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));assert.ok(font>=14);
 }
 await page.waitForTimeout(400);await page.screenshot({path:path.join(output,'pdf-texto-desktop.png'),fullPage:true});await page.setViewportSize({width:412,height:915});await page.screenshot({path:path.join(output,'pdf-texto-mobile.png'),fullPage:true});
 await page.reload({waitUntil:'networkidle'});await chooseMenuPreview(page);assert.equal((await storedItems(4)).pages.length,2);
 checks.push({name:'two-page text PDF: four exact names/prices, supplied owner facts, readable bounded preview and persisted pages',ok:true});await context.close();

 await start();await say('Forno Azul de Teste');await attach('cardapio-escaneado.pdf',Buffer.from(fixtures.scan,'base64'));await page.locator('.idea-photos img').waitFor();
 await page.getByRole('button',{name:'Criar minha prévia',exact:true}).click();await chooseMenuPreview(page);
 const scan=await storedItems(3);assert.equal(scan.pages.length,1);assert.ok(scan.pages[0].lines.length>0);for(const [name,price] of [['Água mineral',500],['Suco de laranja',1250],['Refrigerante lata',790]])assert.equal(scan.items.find(p=>p.name===name)?.price,price,name);
 await page.waitForTimeout(400);await page.screenshot({path:path.join(output,'pdf-escaneado-mobile.png'),fullPage:true});checks.push({name:'scanned PDF actually runs local OCR: three exact products and prices',ok:true});await context.close();

 await start();await attach('cardapio.txt',Buffer.from('Nome: Forno Azul de Teste\nBEBIDAS\nÁgua mineral R$ 5,00\nSuco de laranja R$ 12,50'),'text/plain');await page.waitForFunction(()=>document.querySelector('#idea-source-text')?.value.includes('Suco de laranja'));
 const before=await page.locator('#idea-source-text').inputValue();
 for(const [name,buffer,message] of [['quebrado.pdf',Buffer.from('broken PDF'),/PDF válido/],['com-senha.pdf',Buffer.from(fixtures.encrypted,'base64'),/PDF tem senha/]]){
  await attach(name,buffer);await page.getByRole('alert').filter({hasText:message}).waitFor();assert.equal(await page.locator('#idea-source-text').inputValue(),before);
 }
 const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;return c.toDataURL('image/png').split(',')[1];}),'base64');
 await page.locator('.idea-file-actions input[type=file]').first().setInputFiles(Array.from({length:7},(_,i)=>({name:'foto-'+i+'.png',mimeType:'image/png',buffer:png})));await page.waitForFunction(()=>document.querySelectorAll('.idea-photos img').length===7);
 await attach('duas-paginas.pdf',Buffer.from(fixtures.text,'base64'));await page.getByRole('alert').filter({hasText:/até 1 páginas/}).waitFor();assert.equal(await page.locator('.idea-photos img').count(),7);assert.equal(await page.locator('#idea-source-text').inputValue(),before);
 checks.push({name:'TXT, corrupted/password PDFs and total-page limits preserve the previous valid input',ok:true});await context.close();

 await start();const url='https://www.ifood.com.br/delivery/cabo-frio-rj/forno-azul-de-teste/900caad5-258e-4bf7-9458-353cb0bffe60';
 const data={'@type':'Restaurant',url,name:'Forno Azul de Teste',address:{streetAddress:'Rua Fornalha de Teste, 184',addressLocality:'Cabo Frio',addressRegion:'RJ'},openingHours:'Tu-Su 18:00-23:30',telephone:'(22) 99999-0148',hasMenu:{'@type':'Menu',hasMenuSection:[{'@type':'MenuSection',name:'Bebidas',hasMenuItem:[{'@type':'MenuItem',name:'Suco de laranja',offers:{price:'12.50',priceCurrency:'BRL'}}]}]}};
 await attach('ifood-salvo.html',Buffer.from(`<link rel="canonical" href="${url}"><script type="application/ld+json">${JSON.stringify(data)}</script><script>window.unsafeExecuted=true</script><img src="https://invalid.test/never-load">`),'text/html');
 await page.getByRole('button',{name:'Usar dados encontrados',exact:true}).click();await page.getByRole('button',{name:/Usar .* como WhatsApp/}).click();await preview();const saved=await storedItems(1);assert.equal(saved.items[0].price,1250);assert.equal(await page.evaluate(()=>window.unsafeExecuted),undefined);
 assert.match(await page.locator('.ai-selected .mini-store-address').textContent(),/184/);assert.match(await page.locator('.ai-selected .mini-store-hours').textContent(),/23:30/);
 checks.push({name:'saved HTML provides explicit iFood facts and prices for confirmation without script execution or remote fetches',ok:true,source:'controlled fictitious saved page'});await context.close();

 await start();await page.goto(base+'/cadastro',{waitUntil:'networkidle'});await page.locator('.auth-field input[type=password]').waitFor();
 assert.equal(await page.locator('input[autocomplete=new-password]').count(),1);assert.equal(await page.getByText('Confirme a senha',{exact:true}).count(),0);
 await page.locator('input[autocomplete=name]').fill('Forno Azul Teste');await page.locator('input[type=email]').fill('forno-azul@example.invalid');await page.locator('input[autocomplete=new-password]').fill('curta');
 await page.locator('.auth-main form button[type=submit]').click();assert.equal(signup.length,0);assert.equal(await page.locator('input[autocomplete=new-password]').evaluate(el=>el.validity.tooShort),true);
 await page.locator('input[autocomplete=new-password]').fill('Senha Ficticia 123!');await page.getByRole('button',{name:'Mostrar senha',exact:true}).click();assert.equal(await page.locator('input[autocomplete=new-password]').inputValue(),'Senha Ficticia 123!');
 await page.locator('.auth-main form button[type=submit]').click();await page.getByText('Cadastro fictício recebido no teste.',{exact:true}).waitFor();assert.equal(signup.length,1);assert.equal(signup[0].password,'Senha Ficticia 123!');assert.equal(signup[0].confirmation,undefined);
 checks.push({name:'signup uses one password, preserves minimum length/show button/CSRF and submits once to a controlled mock',ok:true});
 assert.deepEqual(errors,[]);
}catch(e){await page?.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await context?.close().catch(()=>{});await browser.close();await writeFile(path.join(output,'summary.json'),JSON.stringify({checks,errors,scope:'Fictitious documents; real PDF.js/OCR; signup controlled mock; no paid providers or production writes'},null,2));}
