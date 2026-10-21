// Runs only against the isolated GitHub Actions D1/R2, reusing the existing QA owner.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget} from './browser-qa-target.mjs';
const {base,publicReadOnly}=browserQaTarget();
if(publicReadOnly)throw Error('Owner workspace QA requires the isolated local backend.');
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||'.sites-runtime/browser-ci/owner');
const profile=path.resolve('.sites-runtime/browser-ci/guest/guest-profile'),checks=[],errors=[];
await mkdir(output,{recursive:true});
const context=await chromium.launchPersistentContext(profile,{executablePath:process.env.QA_CHROME_PATH,headless:process.env.QA_HEADLESS==='true',...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});
const link='https://www.ifood.com.br/delivery/cabo-frio-rj/aione-pizzas-jardim-pero/900caad5-258e-4bf7-9458-353cb0bffe60';
let lookups=0,page,officialReads=0,officialPending=null;
await context.route('**/*',async route=>{
 const request=route.request(),url=new URL(request.url());
 if(url.origin===base&&url.pathname==='/api/menu-source'&&request.method()==='POST'){
  assert.equal(request.postDataJSON().url,link);lookups++;
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(lookups===1?{status:'needs_content',url:link,text:'',count:0,message:'O iFood não liberou o catálogo por esse link.'}:{status:'imported',url:link,text:'Categoria: Bebidas [simple]\nÁgua QA R$ 7,00\nSuco QA R$ 9,00',count:2,message:'2 produtos encontrados. Confira os preços.'})});
 }
 if(url.origin===base&&url.pathname==='/api/ifood/import'){
  if(request.method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,...(officialPending?{pending:officialPending}:{})})});
  const body=request.postDataJSON();
  if(body.action==='start'){assert.equal(body.url,link);officialPending={url:link,userCode:'OWNER-TEST',verificationUrl:'https://portal.ifood.com.br/apps/code?c=OWNER-TEST',expiresAt:Math.floor(Date.now()/1000)+600};return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pending:officialPending})});}
  if(body.action==='complete'){assert.equal(body.url,link);assert.equal(body.authorizationCode,'returned-owner-test');officialReads++;officialPending=null;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'imported',url:link,count:1,text:'Categoria: Bebidas [simple]\nÁgua da conexão oficial QA R$ 8,90',message:'Resposta oficial simulada para revisão.',warnings:[],store:{name:'Nome vindo da conexão QA',address:'Rua de Endereço Externo QA, 240, Cabo Frio - RJ',hours:'Todos os dias, 18:00 às 00:30',telephone:'(22) 99999-0147'}})});}
  throw Error('Unexpected owner authorization action');
 }
 const safeRead=['GET','HEAD','OPTIONS'].includes(request.method()),safeWrite=request.method()==='PUT'&&/^\/api\/restaurants\/[a-f0-9-]+$/.test(url.pathname);
 if(url.origin===base&&(safeRead||safeWrite))return route.continue();
 errors.push('Unexpected request blocked: '+request.method()+' '+url.pathname);return route.abort();
});
async function rows(){return await page.evaluate(async()=>{const r=await fetch('/api/restaurants',{cache:'no-store'});if(!r.ok)throw Error('Local restaurants unavailable');return (await r.json()).restaurants;});}
try{
 page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/signin-with-chatgpt?return_to=%2Fapp',{waitUntil:'networkidle',timeout:90000});
 const before=await rows();assert.equal(before.length,1);const old=before[0];assert.equal(old.published,false);
 await page.getByRole('button',{name:'Tentar link do iFood',exact:true}).waitFor();
 assert.equal(await page.getByRole('navigation',{name:'Navegação rápida'}).getByRole('button').count(),3);
 assert.equal(await page.getByRole('button',{name:'Ver prévia',exact:true}).isVisible(),true);
 assert.equal(await page.getByText('Três passos para começar.',{exact:true}).count(),0);
 checks.push({name:'existing account starts at its own products with three mobile destinations and visible preview',ok:true});
 await page.getByRole('button',{name:'Tentar link do iFood',exact:true}).click();
 await page.getByLabel('Link da loja no iFood',{exact:true}).fill(link);
 await page.getByRole('button',{name:'Buscar produtos do iFood',exact:true}).click();
 await page.getByText('O iFood não liberou o catálogo por esse link.',{exact:true}).waitFor();
 assert.equal((await rows())[0].data,old.data);
 await page.getByRole('button',{name:'Enviar PDF, prints ou texto',exact:true}).click();
 await page.locator('#reader-menu-text').waitFor();
 assert.match(await page.locator('#reader-menu-text').inputValue(),/Suco natural/);
 checks.push({name:'blocked iFood lookup exposes a usable fallback and keeps the previous source and restaurant unchanged',ok:true});
 await page.getByRole('button',{name:'Fechar janela',exact:true}).click();
 await page.getByRole('button',{name:'Tentar link do iFood',exact:true}).click();
 await page.getByRole('button',{name:'Buscar produtos do iFood',exact:true}).click();
 await page.getByRole('heading',{name:'Confira os produtos',exact:true}).waitFor();
 await page.getByText('Água QA',{exact:true}).first().waitFor();
 await page.getByLabel('Conferi os nomes, os tamanhos e os preços selecionados.',{exact:true}).check();
 await page.getByRole('button',{name:/Adicionar \d+ ao rascunho/}).click();
 await page.locator('.menu-reader-review').waitFor({state:'hidden'});
 await page.getByText('Produtos importados e rascunho salvo. Publique quando estiver pronto.',{exact:true}).waitFor();
 const imported=(await rows())[0],data=JSON.parse(imported.data);
 assert.equal(imported.published,false);assert.equal(data.products.find(p=>p.name==='Água QA').price,700);assert.equal(data.products.find(p=>p.name==='Suco QA').price,900);
 checks.push({name:'available mock public catalog becomes reviewed products saved only in the owner draft',ok:true});
 await page.getByRole('button',{name:'Tentar link do iFood',exact:true}).click();
 const connection=page.getByRole('region',{name:'Conectar loja no iFood'});await connection.waitFor();await connection.getByRole('button',{name:'Conectar minha loja no iFood',exact:true}).click();
 await connection.getByLabel('Depois de autorizar, cole o código de retorno').fill('returned-owner-test');await connection.getByRole('button',{name:'Receber dados e cardápio',exact:true}).click();
 await page.getByRole('region',{name:'Confira os dados da loja autorizada'}).waitFor();await page.getByText('Água da conexão oficial QA',{exact:true}).first().waitFor();assert.equal((await rows())[0].data,imported.data);
 checks.push({name:'authorized owner import exposes store facts and product review without silently changing the existing restaurant',ok:true});
 await page.getByLabel('Conferi os nomes, os tamanhos e os preços selecionados.',{exact:true}).check();await page.getByRole('button',{name:/Adicionar \d+ ao rascunho/}).click();
 await page.locator('.menu-reader-review').waitFor({state:'hidden'});
 await page.getByText('Produtos importados e rascunho salvo. Publique quando estiver pronto.',{exact:true}).waitFor();
 const authorized=(await rows())[0],authorizedData=JSON.parse(authorized.data);assert.equal(authorized.published,false);assert.equal(authorizedData.products.find(p=>p.name==='Água da conexão oficial QA').price,890);for(const key of ['name','address','hours','whatsapp'])assert.equal(authorizedData[key],data[key]);assert.equal(officialReads,1);
 checks.push({name:'explicit product confirmation saves only the reviewed draft and preserves existing name, address, hours and WhatsApp',ok:true});
 await page.getByRole('navigation',{name:'Editar cardápio'}).getByRole('button',{name:'Aparência',exact:true}).click();
 await page.getByText('Seu cardápio atual',{exact:true}).waitFor();
 assert.equal(await page.locator('details.creation-styles').evaluate(el=>el.open),false);
 assert.equal(await page.getByRole('button',{name:'Tentar link do iFood',exact:true}).count(),0);
 await page.getByText('Escolher um modelo pronto',{exact:false}).click();
 assert.equal(await page.locator('.creation-styles button').count(),12);
 await page.locator('.creation-styles button').first().click();
 assert.equal((await rows())[0].data,authorized.data);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 await page.screenshot({path:path.join(output,'existing-owner-appearance.png'),fullPage:true});
 checks.push({name:'existing menu is previewed; twelve optional models wait for explicit application and fit Pixel 7 width',ok:true});
 assert.equal(lookups,2);assert.deepEqual(errors,[]);
}finally{
 await writeFile(path.join(output,'summary.json'),JSON.stringify({base,checks,errors,browser:'Chrome Pixel 7 emulation',ifood:'Controlled responses; not a live iFood catalog',passed:checks.length===6&&!errors.length},null,2));
 await context.close();
}
