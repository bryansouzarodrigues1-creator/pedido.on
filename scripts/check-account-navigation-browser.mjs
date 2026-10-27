// Real local navigation and guarded APIs. External identity is the official local Sites mock.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget} from './browser-qa-target.mjs';
const {base,publicReadOnly}=browserQaTarget();if(publicReadOnly)throw Error('Navigation/session QA requires isolated accounts.');
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||'.sites-runtime/browser-ci/account-navigation');await mkdir(output,{recursive:true});
const checks=[],errors=[],writes=[];
const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true});
const anonymous=await browser.newContext({...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});
const owner=await chromium.launchPersistentContext(path.resolve('.sites-runtime/browser-ci/guest/guest-profile'),{executablePath:process.env.QA_CHROME_PATH,headless:true,...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});
for(const ctx of [anonymous,owner])await ctx.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(u.origin===base&&r.method()==='POST'&&u.pathname==='/api/site-events')return route.abort();if(u.origin===base&&['GET','HEAD','OPTIONS'].includes(r.method()))return route.continue();writes.push(r.method()+' '+u.pathname);return route.abort();});
const guest=await anonymous.newPage(),page=await owner.newPage();for(const p of [guest,page]){p.setDefaultTimeout(25000);p.on('pageerror',e=>errors.push(e.message));}
const read=async endpoint=>page.evaluate(async endpoint=>{const r=await fetch(endpoint,{cache:'no-store'});if(!r.ok)throw Error('Protected read failed: '+r.status);return r.json();},endpoint);
async function clickToPanel(logo){const navigation=page.waitForResponse(r=>r.request().isNavigationRequest()&&new URL(r.url()).pathname==='/app');await logo.click();assert.equal((await navigation).status(),200);await page.getByRole('heading',{name:'Pedidos',exact:true}).waitFor();assert.equal(new URL(page.url()).pathname,'/app');}
try{
 await guest.goto(base+'/',{waitUntil:'networkidle',timeout:90000});const guestNav=guest.getByRole('navigation',{name:'Acesso',exact:true});await guestNav.getByRole('link',{name:'Entrar',exact:true}).waitFor();assert.equal(await guest.locator('.pizza-home-header .brand').getAttribute('href'),'/');checks.push('Anonymous visitor receives Entrar only after the real session endpoint confirms user:null');
 await page.goto(base+'/signin-with-chatgpt?return_to=%2Fapp',{waitUntil:'networkidle',timeout:90000});const initialSession=await read('/api/auth/session'),before=(await read('/api/restaurants')).restaurants;assert.ok(initialSession.user);
 await page.setViewportSize({width:1280,height:900});await clickToPanel(page.locator('.sidebar-brand .brand'));assert.deepEqual(await read('/api/auth/session'),initialSession);checks.push('Clicking the dashboard logo navigates to the panel, keeps the same identity and does not log out');
 await page.setViewportSize({width:390,height:844});
 for(const [route,brand] of [['/','.pizza-home-header .brand'],['/calculadora','.saas-header .brand'],['/criar','.ai-creation-nav .brand'],['/admin/clientes','.account-nav .brand'],['/conta','.account-nav .brand']]){
  await page.goto(base+route,{waitUntil:'networkidle'});
  if(['/', '/calculadora','/criar'].includes(route)){const nav=page.getByRole('navigation',{name:'Acesso',exact:true});await nav.getByRole('link',{name:'Meu painel',exact:true}).waitFor();assert.equal(await nav.getByRole('link',{name:'Entrar',exact:true}).count(),0);}
  const logo=page.locator(brand);assert.equal(await logo.getAttribute('href'),'/app');await clickToPanel(logo);assert.deepEqual(await read('/api/auth/session'),initialSession);
 }
 assert.deepEqual((await read('/api/restaurants')).restaurants,before);checks.push('Start page, calculator, creator, admin and account return to the real guarded panel on mobile; identity and complete restaurants stay unchanged');
 const failure=route=>route.fulfill({status:503,contentType:'text/html',body:'Temporary gateway failure, controlled in this test only'});await owner.route('**/api/auth/session',failure);
 await page.goto(base+'/',{waitUntil:'networkidle'});await page.locator('[data-account-state="unavailable"]').waitFor();assert.equal(await page.getByRole('navigation',{name:'Acesso',exact:true}).getByRole('link',{name:'Entrar',exact:true}).count(),0);await clickToPanel(page.getByRole('link',{name:'Acessar meu painel',exact:true}));
 await owner.unroute('**/api/auth/session',failure);assert.deepEqual(await read('/api/auth/session'),initialSession);await page.goto(base+'/',{waitUntil:'networkidle'});await page.getByRole('navigation',{name:'Acesso',exact:true}).getByRole('link',{name:'Meu painel',exact:true}).waitFor();await page.screenshot({path:path.join(output,'inicio-conectado-mobile.png'),fullPage:false});
 assert.deepEqual((await read('/api/restaurants')).restaurants,before);assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);checks.push('Temporary session-check failure does not show a false logout; existing server session still opens the panel and recovers without credentials');
 console.log('PASS ACCOUNT NAVIGATION '+JSON.stringify(checks));
}finally{await writeFile(path.join(output,'summary.json'),JSON.stringify({checks,errors,writes,passed:checks.length===4&&!errors.length&&!writes.length,scope:'Real browser and local guarded APIs; external identity simulated, one controlled gateway error; no customer, email, password reset or payment'},null,2));await anonymous.close();await owner.close();await browser.close();}
