// Real browser OCR and owner APIs against disposable local D1. No production writes or paid calls.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {businessInfoFixtures,businessInfoExpectedHours} from './business-info-fixtures.mjs';
import {browserQaTarget} from './browser-qa-target.mjs';
const {base,publicReadOnly}=browserQaTarget();if(publicReadOnly)throw Error('Leitura e aplicação exigem somente o D1 isolado.');
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||'.sites-runtime/browser-ci/business-info');await mkdir(output,{recursive:true});
const fixtures=await businessInfoFixtures(path.join(output,'fixtures')),checks=[],errors=[],unexpected=[],writes=[];
const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true});
const guest=await browser.newContext({...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'}),consumer=await browser.newContext({...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});
const owner=await chromium.launchPersistentContext(path.resolve('.sites-runtime/browser-ci/guest/guest-profile'),{executablePath:process.env.QA_CHROME_PATH,headless:true,...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});
for(const [context,canWrite] of [[guest,false],[consumer,false],[owner,true]])await context.route('**/*',route=>{
 const r=route.request(),url=new URL(r.url());if(url.origin!==base){unexpected.push('external '+url.origin+url.pathname);return route.abort();}
 if(url.pathname==='/api/site-events'&&r.method()==='POST')return route.abort();
 if(['GET','HEAD','OPTIONS'].includes(r.method()))return route.continue();
 if(canWrite&&(r.method()==='PUT'&&/^\/api\/restaurants\/[a-f0-9-]+$/.test(url.pathname)||r.method()==='POST'&&/^\/api\/restaurants\/[a-f0-9-]+\/publish$/.test(url.pathname))){writes.push(r.method()+' '+url.pathname);return route.continue();}
 unexpected.push(r.method()+' '+url.pathname);return route.abort();
});
const page=await guest.newPage(),panel=await owner.newPage(),publicMenu=await consumer.newPage();
for(const p of [page,panel,publicMenu]){p.setDefaultTimeout(30000);p.on('pageerror',e=>errors.push(e.message));}
async function openReader(p){await p.getByRole('button',{name:'Preencher dados com imagem',exact:true}).click();const dialog=p.getByRole('dialog',{name:'Trazer informações de uma imagem',exact:true});await dialog.waitFor();return dialog;}
async function scan(dialog,file){await dialog.getByLabel('Imagens com informações da pizzaria',{exact:true}).setInputFiles(file);await dialog.getByRole('button',{name:'Extrair texto das imagens',exact:true}).click();await dialog.getByRole('textbox',{name:'Conferir Horários de funcionamento',exact:true}).waitFor({timeout:120000});assert.equal(await dialog.getByRole('textbox',{name:'Conferir Horários de funcionamento',exact:true}).inputValue(),businessInfoExpectedHours);}
async function accountRows(){return panel.evaluate(async()=>{const r=await fetch('/api/restaurants',{cache:'no-store'});if(!r.ok)throw Error('Falha ao consultar lojas isoladas.');return (await r.json()).restaurants;});}
try{
 await page.goto(base+'/',{waitUntil:'networkidle',timeout:90000});let dialog=await openReader(page);await scan(dialog,fixtures['google-dark']);
 assert.match(await dialog.getByRole('textbox',{name:'Texto da imagem para conferir',exact:true}).inputValue(),/15\/11\/2026/);
 assert.equal(await dialog.getByRole('button',{name:'Usar informações no rascunho',exact:true}).isEnabled(),false);
 for(const field of ['Nome da pizzaria','Endereço','Horários de funcionamento'])await dialog.getByRole('checkbox',{name:'Usar '+field,exact:true}).check();
 assert.equal(await dialog.getByRole('checkbox',{name:'Usar WhatsApp de pedidos',exact:true}).isChecked(),false);
 await dialog.getByRole('checkbox',{name:'Conferi as informações da imagem',exact:true}).check();await dialog.getByRole('button',{name:'Usar informações no rascunho',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await page.locator('.owner-known summary').click();assert.match(await page.locator('.owner-known').textContent(),/Pizzaria Forno de Teste/);assert.match(await page.locator('.owner-known').textContent(),/Domingo: Fechado/);
 checks.push('Print escuro é lido pelo OCR real; nome, endereço e semana usados somente após selecionar e confirmar; telefone não é aplicado');
 dialog=await openReader(page);await dialog.getByLabel('Imagens com informações da pizzaria',{exact:true}).setInputFiles({name:'nao-e-imagem.txt',mimeType:'text/plain',buffer:Buffer.from('arquivo inválido')});
 await dialog.getByRole('alert').filter({hasText:'Envie JPG, PNG ou WebP'}).waitFor();assert.equal(await dialog.locator('.business-info-photos figure').count(),1);assert.match(await dialog.getByRole('textbox',{name:'Texto da imagem para conferir',exact:true}).inputValue(),/15\/11\/2026/);
 await dialog.getByRole('button',{name:'Fechar janela',exact:true}).click();
 await page.getByRole('button',{name:'Ver prévia agora e completar depois',exact:true}).click();await page.locator('.ai-selected .mini-menu').waitFor();assert.equal(await page.locator('.ai-selected .mini-store-hours').textContent().then(text=>text.trim()),businessInfoExpectedHours);
 await page.reload({waitUntil:'networkidle'});await page.locator('.ai-selected .mini-menu').waitFor();assert.equal(await page.locator('.ai-selected .mini-store-hours').textContent().then(text=>text.trim()),businessInfoExpectedHours);
 checks.push('Arquivo inválido preserva leitura anterior; horários revistos chegam à prévia e permanecem após recarregar, sem conta ou escrita de negócio');
 await panel.goto(base+'/signin-with-chatgpt?return_to=%2Fapp',{waitUntil:'networkidle',timeout:90000});const before=(await accountRows())[0];assert.ok(before?.published);const previous=JSON.parse(before.data);
 await publicMenu.goto(base+'/p/'+before.slug,{waitUntil:'networkidle'});const oldHours=await publicMenu.locator('.menu-public-hours span').allTextContents();
 await panel.getByRole('button',{name:'Configurar horários',exact:true}).click();dialog=await openReader(panel);await scan(dialog,fixtures['google-light']);
 assert.equal(await dialog.getByRole('checkbox',{name:'Usar Nome da pizzaria',exact:true}).isChecked(),false);
 await dialog.getByRole('checkbox',{name:'Usar Horários de funcionamento',exact:true}).check();
 await dialog.locator('.business-info-manual summary').click();await dialog.getByLabel('Campo para outro trecho',{exact:true}).selectOption('description');await dialog.getByRole('textbox',{name:'Trecho que quero usar',exact:true}).fill('Aniversário da loja: 15/11/2026');await dialog.getByRole('button',{name:'Preparar este campo',exact:true}).click();
 await dialog.getByRole('checkbox',{name:'Conferi as informações da imagem',exact:true}).check();
 const expectedWrites=writes.length;await dialog.getByRole('button',{name:'Usar informações no rascunho',exact:true}).click();await dialog.waitFor({state:'hidden'});await panel.getByText('Dados da pizzaria importados e rascunho salvo. Publique para seus clientes verem.',{exact:true}).waitFor();
 assert.equal(writes.length,expectedWrites+1);const after=(await accountRows())[0];assert.deepEqual(JSON.parse(after.data),{...previous,hours:businessInfoExpectedHours,description:'Aniversário da loja: 15/11/2026'});assert.equal(after.liveRevision,before.liveRevision);
 await publicMenu.reload({waitUntil:'networkidle'});assert.deepEqual(await publicMenu.locator('.menu-public-hours span').allTextContents(),oldHours);
 checks.push('Aplicação real no rascunho altera somente horários e descrição escolhidos; preserva Pix, produtos, preços, nome, telefone e publicação anterior');
 await panel.locator('.dashboard-header-actions').getByRole('button',{name:'Atualizar',exact:true}).click();await panel.getByText('Cardápio atualizado. Seus clientes já veem as alterações.',{exact:true}).waitFor();await publicMenu.reload({waitUntil:'networkidle'});assert.equal(await publicMenu.locator('.menu-public-hours span').textContent(),businessInfoExpectedHours);
 await panel.reload({waitUntil:'networkidle'});await panel.getByRole('button',{name:'Configurar horários',exact:true}).click();dialog=await openReader(panel);await dialog.getByRole('textbox',{name:'Texto da imagem para conferir',exact:true}).waitFor();assert.match(await dialog.getByRole('textbox',{name:'Texto da imagem para conferir',exact:true}).inputValue(),/15\/11\/2026/);
 await dialog.getByRole('button',{name:'Organizar sugestões do texto',exact:true}).click();assert.equal(await dialog.getByRole('checkbox',{name:'Usar Horários de funcionamento',exact:true}).isChecked(),false);
 await dialog.getByRole('textbox',{name:'Conferir Horários de funcionamento',exact:true}).scrollIntoViewIfNeeded();await panel.screenshot({path:path.join(output,'conferir-horarios-mobile.png'),fullPage:false});
 for(const width of [320,390,768,1280]){await panel.setViewportSize({width,height:844});assert.ok(await panel.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Janela não deve ultrapassar a tela em '+width);}
 await dialog.getByRole('button',{name:'Remover leitura deste aparelho',exact:true}).click();await dialog.getByText('Leitura removida deste aparelho. Os dados já usados na pizzaria foram mantidos.',{exact:true}).waitFor();assert.equal(await dialog.locator('.business-info-photos figure').count(),0);assert.equal(JSON.parse((await accountRows())[0].data).hours,businessInfoExpectedHours);
 checks.push('Publicação explícita mostra horários ao consumidor; leitura local volta após recarga sem seleção automática, cabe em quatro larguras e pode ser removida sem apagar dados');
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);assert.equal(writes.length,2);console.log('PASS BUSINESS INFO '+JSON.stringify(checks));
}finally{await writeFile(path.join(output,'summary.json'),JSON.stringify({checks,errors,unexpected,writes,passed:checks.length===4&&!errors.length&&!unexpected.length,scope:'OCR e interface reais, documentos sintéticos, autenticação externa simulada e D1 local isolado; nenhum envio externo'},null,2));await guest.close();await consumer.close();await owner.close();await browser.close();}
