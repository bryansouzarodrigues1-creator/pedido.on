import {chooseMenuPreview} from './choose-menu-preview.mjs';
// Real UI with fictitious businesses and controlled source responses. No account or order writes.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget} from './browser-qa-target.mjs';
const {base,publicReadOnly}=browserQaTarget();if(publicReadOnly)throw Error('Composer scenarios require isolated QA.');
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const sample=JSON.parse(await readFile(new URL('./fixtures/owner-intake-forno-azul.json',import.meta.url),'utf8'));
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||'.sites-runtime/browser-ci/intake-options');await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true,slowMo:90});
const checks=[],errors=[];let context,page,lookups=0;
async function start(mode){
 context=await browser.newContext({...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block',...(process.env.QA_RECORD_INTAKE==='true'?{recordVideo:{dir:output,size:{width:412,height:915}}}:{})});
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin===base&&url.pathname==='/api/menu-source'&&request.method()==='POST'){
   assert.equal(request.postDataJSON().url,sample.url);lookups++;
   if(mode==='network')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Consulta temporariamente indisponível. Tente novamente.'})});
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mode==='blocked'?{status:'needs_content',url:sample.url,count:0,text:'',message:'Catálogo público bloqueado no cenário de teste.'}:{status:'imported',url:sample.url,count:11,text:sample.menuText,store:{name:sample.name,address:sample.address,hours:sample.hours,telephone:sample.whatsapp},message:'Dados fictícios para revisão.'})});
  }
  if(url.origin===base&&['GET','HEAD','OPTIONS'].includes(request.method()))return route.continue();
  errors.push(request.method()+' '+url.pathname);return route.abort();
 });
 page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/criar',{waitUntil:'networkidle',timeout:90000});await page.waitForFunction(()=>document.querySelector('#owner-intake-message')?.disabled===false);
 assert.doesNotMatch(await page.locator('body').textContent(),/cr[eé]ditos|geraç[aã]o paga|sem gastar/i);
}
async function say(text){await page.locator('#owner-intake-message').fill(text);await page.locator('.owner-intake-reply button[type=submit]').click();}
async function pause(){if(process.env.QA_RECORD_INTAKE==='true')await page.waitForTimeout(1400);}
async function ready(){
 await page.getByRole('button',{name:'Criar minha prévia',exact:true}).click();await chooseMenuPreview(page);
 assert.equal(await page.locator('.ai-template-options').evaluate(el=>el.open),false);assert.equal(await page.locator('.creator-briefing').evaluate(el=>el.open),false);
 const ratio=await page.locator('.ai-selected .mini-cover.no-cover').evaluate(cover=>{
  const luminance=color=>{const c=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
  const bg=luminance(getComputedStyle(cover).backgroundColor),fg=luminance(getComputedStyle(cover.querySelector('h3')).color);return (Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05);
 });assert.ok(ratio>=4.5,'A menu without a cover photo needs a readable headline');
}
async function close(name){const video=page.video();await context.close();if(video)await rename(await video.path(),path.join(output,name+'.webm'));}
try{
 await start('complete');
 for(const width of [320,412,1280]){
  await page.setViewportSize({width,height:915});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  const geometry=await page.locator('#owner-intake-message').evaluate(el=>({height:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize)}));
  assert.ok(geometry.height>=175&&geometry.font>=16,'The initial idea must have a large readable composer');
 }
 await page.setViewportSize({width:412,height:915});await page.screenshot({path:path.join(output,'campo-principal-mobile.png'),fullPage:true});
 const table=[['Campo','Dados de teste'],['Nome',sample.name],['Endereço',sample.address],['WhatsApp',sample.whatsapp],['Horários',sample.hours],['Cardápio','Oito pizzas em P/M/G e três bebidas'],['Exemplo','Margherita: R$32,90 / R$42,90 / R$52,90']].map(row=>row.join('\t')).join('\n');
 await say(table);assert.equal(await page.getByRole('alert').count(),0);
 await page.getByRole('button',{name:'Ver prévia agora e completar depois',exact:true}).click();await chooseMenuPreview(page);
 assert.equal(await page.locator('.ai-selected .mini-top strong').textContent(),sample.name);
 assert.match(await page.locator('.ai-selected .mini-store-address').textContent(),/Rua Fornalha de Teste/);
 assert.match(await page.locator('.ai-selected .mini-store-hours').textContent(),/23:30/);
 assert.equal(await page.locator('.ai-template-options').evaluate(el=>el.open),false);
 await page.screenshot({path:path.join(output,'tabela-colada-aceita.png'),fullPage:true});
 checks.push({name:'reported clipboard table is accepted; optional fields can be deferred and presets start collapsed',ok:true});await close('tabela-colada');
 await start('complete');await say(sample.initialMessage+'\n'+sample.menuText);
 await ready();assert.match(await page.locator('.ai-gallery-heading').textContent(),/11 itens/);
 await page.getByRole('button',{name:/Testar o cardápio completo personalizado/}).click();
 const full=page.getByRole('dialog',{name:'Teste do cardápio personalizado'});await full.locator('.customer-menu').waitFor();
 assert.match(await full.textContent(),/Margherita de Teste/);assert.match(await full.textContent(),/Calabresa da Fornalha/);assert.match(await full.textContent(),/32,90/);
 await page.screenshot({path:path.join(output,'produtos-no-campo-principal.png'),fullPage:true});
 checks.push({name:'a complete briefing plus eleven priced products reaches the full menu through the main composer',ok:true});await close('descricao-e-produtos');
 await start('metadata');await pause();
 const box=page.locator('#owner-intake-message');await box.fill('Minha pizzaria se chama '+sample.name+'.');
 await box.evaluate(el=>el.dataset.qaContinuity='same-composer');
 await page.getByRole('button',{name:'Tenho um link do iFood',exact:true}).click();
 assert.equal(await box.getAttribute('data-qa-continuity'),'same-composer');assert.equal(await box.inputValue(),'Minha pizzaria se chama '+sample.name+'.');
 await box.fill((await box.inputValue())+'\n'+sample.url);await pause();await page.locator('.owner-intake-reply button[type=submit]').click();
 const found=page.getByRole('region',{name:'Confira os dados encontrados no link'});await found.waitFor();
 assert.equal(await box.getAttribute('data-qa-continuity'),'same-composer');assert.match(await found.textContent(),/Rua Fornalha de Teste/);
 const sourceLayout=await found.evaluate(section=>{
  const luminance=color=>{const c=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
  const bg=luminance(getComputedStyle(section).backgroundColor);
  const contrasts=[...section.querySelectorAll('h3,dd')].map(el=>{const fg=luminance(getComputedStyle(el).color);return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);});
  const history=section.closest('.owner-intake-history');return {contrasts,clipped:history.scrollHeight>history.clientHeight+1};
 });
 assert.ok(sourceLayout.contrasts.every(ratio=>ratio>=4.5));assert.equal(sourceLayout.clipped,false);
 await found.getByRole('heading').scrollIntoViewIfNeeded();await pause();await page.screenshot({path:path.join(output,'link-no-mesmo-campo.png'),fullPage:true});
 await page.getByRole('button',{name:'Usar dados encontrados',exact:true}).click();
 assert.match(await page.locator('.owner-intake-question').textContent(),/WhatsApp/);await pause();
 await page.getByRole('button',{name:'Usar '+sample.whatsapp+' como WhatsApp',exact:true}).click();
 await page.getByRole('button',{name:'Artesanal',exact:true}).scrollIntoViewIfNeeded();await pause();await page.getByRole('button',{name:'Artesanal',exact:true}).click();
 await ready();assert.match(await page.locator('.ai-gallery-heading').textContent(),/11 itens/);assert.equal(lookups,1);await page.locator('.ai-selected').scrollIntoViewIfNeeded();await pause();
 await page.getByRole('button',{name:/Testar o cardápio completo personalizado/}).click();await page.getByRole('dialog',{name:'Teste do cardápio personalizado'}).locator('.customer-menu').waitFor();await pause();
 checks.push({name:'iFood action keeps the exact same input and draft; confirmed facts leave only WhatsApp and optional visual choices',ok:true});await close('fluxo-campo-unico');
 await start('blocked');await say(sample.url);await page.getByText(/O iFood não liberou a leitura automática/).waitFor();assert.match(await page.locator('.owner-name-confirm').textContent(),/Nome sugerido pelo endereço/);await page.getByRole('button',{name:'Alterar nome',exact:true}).click();await say(sample.name);
 await page.getByRole('button',{name:'Ver prévia agora e completar depois',exact:true}).click();await chooseMenuPreview(page);
 assert.equal(await page.locator('.ai-selected .mini-store-address').count(),0);assert.equal(await page.locator('.ai-selected .mini-store-hours').count(),0);
 await page.reload({waitUntil:'networkidle'});await chooseMenuPreview(page);assert.equal(await page.locator('.ai-selected .mini-top strong').textContent(),sample.name);
 checks.push({name:'blocked source allows preview without inventing missing facts and resumes its selected preview',ok:true});await close('link-bloqueado');
 await start('network');await say(sample.url);await page.getByRole('alert').waitFor();
 assert.equal(await page.locator('#owner-intake-message').inputValue(),sample.url);assert.equal(await page.locator('#owner-intake-message').isEnabled(),true);
 await say('Quero um cardápio artesanal, com letras elegantes e fotos grandes.');assert.equal(await page.getByRole('alert').count(),0);assert.match(await page.locator('.owner-intake-question').textContent(),/nome da pizzaria/);
 await say(sample.name);await page.getByRole('button',{name:'Ver prévia agora e completar depois',exact:true}).click();await chooseMenuPreview(page);
 checks.push({name:'source error preserves the input and a visual-only idea can continue by providing just its name',ok:true});await close('falha-recuperavel');
 await start('complete');await say(sample.initialMessage);await page.getByRole('button',{name:'Ver prévia agora e completar depois',exact:true}).click();await chooseMenuPreview(page);
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('storage blocked for QA');};IDBFactory.prototype.open=function(){throw Error('IndexedDB blocked for QA');};});
 await page.getByRole('button',{name:'Usar este modelo',exact:true}).click();
 const storageAlert=page.getByRole('alert').filter({hasText:/navegador.*guardar sua ideia/});await storageAlert.waitFor();assert.equal(await storageAlert.isVisible(),true);assert.match(page.url(),/\/criar$/);
 checks.push({name:'a failed save remains visible outside the collapsed briefing and prevents losing content at signup',ok:true});await close('armazenamento-bloqueado');
 assert.deepEqual(errors,[]);
}finally{await context?.close().catch(()=>{});await browser.close();await writeFile(path.join(output,'summary.json'),JSON.stringify({checks,errors,lookups,fictitious:true,ifood:'controlled responses; not a real external store import',passed:checks.length===6&&!errors.length},null,2));}
