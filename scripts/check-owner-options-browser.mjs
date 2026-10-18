// Real UI, controlled public-source responses, fictitious business only. No accounts or orders.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget} from './browser-qa-target.mjs';
const {base,publicReadOnly}=browserQaTarget();if(publicReadOnly)throw Error('Adaptive intake scenarios require isolated QA.');
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const sample=JSON.parse(await readFile(new URL('./fixtures/owner-intake-forno-azul.json',import.meta.url),'utf8'));
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||'.sites-runtime/browser-ci/intake-options');await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true,slowMo:100});
const checks=[],errors=[];let context,page,lookups=0;
async function start(mode){
 context=await browser.newContext({...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block',...(process.env.QA_RECORD_INTAKE==='true'?{recordVideo:{dir:output,size:{width:412,height:915}}}:{})});
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin===base&&url.pathname==='/api/menu-source'&&request.method()==='POST'){
   assert.equal(request.postDataJSON().url,sample.url);lookups++;
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mode==='blocked'?{status:'needs_content',url:sample.url,count:0,text:'',message:'Catálogo público bloqueado no cenário de teste.'}:{status:'imported',url:sample.url,count:11,text:sample.menuText,store:{name:sample.name,address:sample.address,hours:sample.hours,telephone:sample.whatsapp},message:'Dados fictícios para revisão.'})});
  }
  if(url.origin===base&&['GET','HEAD','OPTIONS'].includes(request.method()))return route.continue();
  errors.push(request.method()+' '+url.pathname);return route.abort();
 });
 page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/criar',{waitUntil:'networkidle',timeout:90000});await page.waitForFunction(()=>document.querySelector('#owner-intake-message')?.disabled===false);
 assert.doesNotMatch(await page.locator('body').textContent(),/cr[eé]ditos|geraç[aã]o paga|sem gastar/i);
}
async function say(text){await page.locator('#owner-intake-message').fill(text);await page.getByRole('button',{name:'Enviar',exact:true}).click();}
async function close(name){const video=page.video();await context.close();if(video)await rename(await video.path(),path.join(output,name+'.webm'));}
try{
 await start('complete');await page.getByRole('button',{name:'Ainda não tenho cardápio',exact:true}).click();await say(sample.initialMessage);
 await page.getByRole('button',{name:/Ver meus 12 modelos personalizados/}).waitFor();assert.equal(await page.locator('#owner-intake-message').count(),0);
 await page.getByRole('button',{name:/Ver meus 12 modelos personalizados/}).click();await page.locator('.ai-style-card').first().waitFor();
 assert.equal(await page.locator('.ai-style-card .mini-top strong').first().textContent(),sample.name);await page.screenshot({path:path.join(output,'briefing-completo.png'),fullPage:true});
 checks.push({name:'complete fictitious briefing skips repeated address, WhatsApp and hours questions',ok:true});await close('descricao-completa');
 await start('metadata');await page.getByRole('button',{name:'Tenho um link do iFood',exact:true}).click();await page.locator('#owner-intake-message').fill(sample.url);await page.getByRole('button',{name:'Consultar loja',exact:true}).click();
 const found=page.getByRole('region',{name:'Confira os dados encontrados no link'});await found.waitFor();assert.match(await found.textContent(),/Rua Fornalha de Teste/);await page.screenshot({path:path.join(output,'link-dados-encontrados.png'),fullPage:true});
 await page.getByRole('button',{name:'Usar dados encontrados',exact:true}).click();
 assert.equal(await page.locator('.owner-intake-question').count(),1);assert.match(await page.locator('.owner-intake-question').textContent(),/WhatsApp/);
 await page.getByRole('button',{name:'Usar '+sample.whatsapp+' como WhatsApp',exact:true}).click();
 await page.getByRole('button',{name:'Artesanal',exact:true}).click();await page.getByRole('button',{name:/Ver meus 12 modelos personalizados/}).click();await page.locator('.ai-style-card').first().waitFor();
 assert.match(await page.locator('.ai-gallery-heading').textContent(),/11 itens/);assert.match(await page.locator('.mini-store-hours').first().textContent(),/23:30/);assert.equal(lookups,1);
 await page.locator('.ai-style-card').first().getByRole('button',{name:/Escolher/}).click();await page.getByRole('button',{name:/Testar o cardápio completo personalizado/}).click();
 const full=page.getByRole('dialog',{name:'Teste do cardápio personalizado'});await full.waitFor();assert.match(await full.textContent(),/Margherita de Teste/);assert.match(await full.textContent(),/Calabresa da Fornalha/);
 await page.screenshot({path:path.join(output,'cardapio-ficticio-completo.png'),fullPage:true});
 checks.push({name:'confirmed public metadata leaves only WhatsApp confirmation and an optional visual choice; eleven fictitious items reach preview',ok:true});await close('fluxo-link-ficticio');
 await start('blocked');await page.getByRole('button',{name:'Tenho um link do iFood',exact:true}).click();await page.locator('#owner-intake-message').fill(sample.url);await page.getByRole('button',{name:'Consultar loja',exact:true}).click();
 await page.getByText(/O link ficou guardado/).waitFor();assert.match(await page.locator('.owner-intake-question').textContent(),/nome da pizzaria/);
 await say('Forno Azul de Teste');await page.getByRole('button',{name:'Preencher depois',exact:true}).click();await page.getByRole('button',{name:'Preencher depois',exact:true}).click();
 await page.getByRole('button',{name:'Terça a domingo · 18h–23h',exact:true}).click();await page.getByRole('button',{name:/Ver meus 12 modelos personalizados/}).waitFor();
 assert.equal(await page.locator('#owner-intake-message').count(),0);assert.equal(await page.getByRole('button',{name:'Consultar loja',exact:true}).count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:path.join(output,'link-bloqueado-opcoes.png'),fullPage:true});
 checks.push({name:'blocked source asks only missing facts, exposes explicit options and preserves its link without fabricated business data',ok:true});await close('link-bloqueado');
 assert.deepEqual(errors,[]);
}finally{await context?.close().catch(()=>{});await browser.close();await writeFile(path.join(output,'summary.json'),JSON.stringify({checks,errors,lookups,fictitious:true,ifood:'controlled responses; not a real external store import',passed:checks.length===3&&!errors.length},null,2));}
