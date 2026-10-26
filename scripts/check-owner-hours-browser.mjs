// Navegador real e banco D1 local descartável: o proprietário altera os horários na interface,
// publica, atualiza a página e o consumidor vê a mesma informação. Nunca tocar em produção.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget} from './browser-qa-target.mjs';
const {base,publicReadOnly}=browserQaTarget();
if(publicReadOnly)throw Error('QA de horários exige D1 isolado; nunca grava dados do público.');
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||'.sites-runtime/browser-ci/owner-hours');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:process.env.QA_HEADLESS==='true'});
const owner=await chromium.launchPersistentContext(path.resolve('.sites-runtime/browser-ci/guest/guest-profile'),{executablePath:process.env.QA_CHROME_PATH,headless:true,...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});
const consumer=await browser.newContext({...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});
const checks=[],errors=[];
for(const ctx of [owner,consumer])await ctx.route('**/*',route=>{
 const u=new URL(route.request().url()),r=route.request();
 if(u.origin!==base){return route.abort();}
 if(u.pathname==='/api/site-events'&&r.method()==='POST')return route.abort();
 return route.continue();
});
const page=await owner.newPage(),guest=await consumer.newPage();
for(const p of [page,guest]){p.setDefaultTimeout(25000);p.on('pageerror',e=>errors.push(e.message));}
async function rows(){return page.evaluate(async()=>{const r=await fetch('/api/restaurants',{cache:'no-store'});if(!r.ok)throw Error('Não foi possível listar lojas locais.');return (await r.json()).restaurants;});}
const hours='Segunda a sexta, das 18h às 23h; sábado e domingo, das 17h às 00h';
try{
 await page.goto(base+'/signin-with-chatgpt?return_to=%2Fapp',{waitUntil:'networkidle',timeout:90000});
 const before=(await rows())[0];
 assert.ok(before?.id,'Nenhuma loja fictícia criada no ambiente isolado.');
 assert.equal(before.published,true,'A jornada anterior deveria publicar a loja fictícia para o cenário real.');
 const previous=JSON.parse(before.data);
 await page.getByRole('button',{name:'Configurar horários',exact:true}).click();
 const input=page.getByRole('textbox',{name:'Horário de funcionamento para os clientes'});
 await input.waitFor();
 await input.fill(hours);
 await page.locator('.dashboard-header-actions').getByRole('button',{name:'Atualizar',exact:true}).click();
 await page.getByText('Cardápio atualizado. Seus clientes já veem as alterações.',{exact:true}).waitFor();
 const after=(await rows())[0];
 assert.equal(JSON.parse(after.data).hours,hours);
 assert.equal(JSON.parse(after.data).isOpen,previous.isOpen,'Alterar o texto do horário não pode mudar o estado de pedidos.');
 checks.push('Atalho para horários na tela de pedidos, edição persistida e publicação via interface');
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Configurar horários',exact:true}).click();
 assert.equal(await page.getByRole('textbox',{name:'Horário de funcionamento para os clientes'}).inputValue(),hours);
 checks.push('Login local e alterações sobrevivem ao recarregamento completo');
 await guest.goto(base+'/p/'+before.slug,{waitUntil:'networkidle'});
 const visible=guest.locator('.menu-public-hours');
 await visible.waitFor();
 assert.match(await visible.textContent(),/sábado e domingo, das 17h às 00h/);
 assert.equal(await guest.locator('.restaurant-info>summary').textContent().then(t=>t.includes('Endereço e pagamento')),true);
 for(const width of [320,360,412,768,1280]){
  await guest.setViewportSize({width,height:850});
  const geometry=await guest.evaluate(()=>({viewport:innerWidth,doc:document.documentElement.scrollWidth}));
  assert.ok(geometry.doc<=geometry.viewport+2,'Cardápio ultrapassa tela em '+width+': '+JSON.stringify(geometry));
 }
 await guest.setViewportSize({width:390,height:844});
 await guest.screenshot({path:path.join(output,'horario-cliente-mobile.png'),fullPage:true});
 checks.push('Consumidor vê horário completo sem expandir painel em cinco larguras de tela');
 await input.fill('');
 await page.locator('.dashboard-header-actions').getByRole('button',{name:'Atualizar',exact:true}).click();
 await page.getByText('Cardápio atualizado. Seus clientes já veem as alterações.',{exact:true}).waitFor();
 await guest.reload({waitUntil:'networkidle'});
 assert.equal(await guest.locator('.menu-public-hours').count(),0);
 assert.equal(JSON.parse((await rows())[0].data).isOpen,previous.isOpen);
 checks.push('Remover horário remove somente a informação do cliente sem inventar horários nem abrir/fechar pedidos');
 assert.deepEqual(errors,[]);
 console.log('PASS OWNER HOURS '+JSON.stringify(checks));
}finally{
 await writeFile(path.join(output,'summary.json'),JSON.stringify({checks,errors,passed:checks.length===4&&!errors.length,scope:'interface real, Supabase/contas e D1 simulados; loja fictícia e pública somente em localhost'},null,2));
 await owner.close();await consumer.close();await browser.close();
}
