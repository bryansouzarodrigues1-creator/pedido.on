// Navegador real + interface real da Pizzaria.on; API auth inteiramente simulada.
// Nenhuma conta, e-mail, sessão, cobrança ou pedido real é criado.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget} from './browser-qa-target.mjs';
const {base,publicReadOnly}=browserQaTarget();
if(publicReadOnly)throw Error('Este teste exige navegador local e APIs simuladas. Não execute em produção.');
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||'.sites-runtime/browser-ci/auth-mobile');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:process.env.QA_HEADLESS==='true'});
const context=await browser.newContext({...devices['Pixel 7'],locale:'pt-BR',serviceWorkers:'block'});
const errors=[],blocked=[],checks=[],attempts=[];
const config={enabled:true,registrationEnabled:true,recoveryEnabled:true,prototype:false,inviteRequired:false,googleEnabled:false,csrf:'qa-csrf-fixture',captchaSiteKey:'',supportWhatsApp:null};
let allowLogin=false,allowRecovery=false;
const json=(route,status,body)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
await context.route('**/*',route=>{
 const u=new URL(route.request().url());
 if(u.origin===base)return route.continue();
 blocked.push(route.request().method()+' '+u.origin+u.pathname);
 return route.abort();
});
await context.route('**/api/auth/config*',route=>json(route,200,config));
await context.route('**/api/auth/login',route=>{
 const body=route.request().postDataJSON();
 attempts.push({action:'login',email:body.email,passwordLength:body.password?.length,csrf:route.request().headers()['x-pedido-csrf']});
 return json(route,allowLogin?200:401,allowLogin?{ok:true,next:'/app'}:{error:'E-mail ou senha incorretos.'});
});
await context.route('**/api/auth/recover',route=>{
 const body=route.request().postDataJSON();
 attempts.push({action:'recover',email:body.email,csrf:route.request().headers()['x-pedido-csrf']});
 return json(route,allowRecovery?200:429,allowRecovery?{ok:true,message:'Se o e-mail está cadastrado, você receberá as instruções.'}:{error:'Muitas tentativas. Aguarde antes de solicitar outra mensagem.'});
});
await context.route('**/api/auth/confirm-recovery',route=>{
 const {tokenHash}=route.request().postDataJSON();
 attempts.push({action:'confirm-recovery',valid:tokenHash==='a'.repeat(64)});
 return json(route,tokenHash==='a'.repeat(64)?200:401,tokenHash==='a'.repeat(64)?{ok:true}:{error:'Este link de recuperação expirou. Solicite um novo.'});
});
await context.route('**/api/auth/password',route=>{
 const body=route.request().postDataJSON();
 attempts.push({action:'password',passwordLength:body.password?.length,hasCurrentPassword:'currentPassword' in body});
 return json(route,200,{ok:true});
});
await context.route('**/app',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="pt-BR"><body><h1>Painel de teste local (mock)</h1></body></html>'}));
const page=await context.newPage();page.setDefaultTimeout(20000);
page.on('pageerror',e=>errors.push(e.message));
async function checkWidth(width){
 await page.setViewportSize({width,height:870});
 const size=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(size.scroll<=size.inner+2,'Rolagem horizontal indevida em '+width+': '+JSON.stringify(size));
}
async function goto(url){await page.goto(base+url,{waitUntil:'domcontentloaded',timeout:90_000});}
try{
 await goto('/entrar');
 await page.getByRole('heading',{name:'Sua pizzaria está on.'}).waitFor();
 const email=page.getByRole('textbox',{name:'E-mail'});
 const password=page.getByLabel('Senha',{exact:true});
 await email.fill('pizzaiolo.ficticio@example.test');
 await password.fill('senha-invalida-qa');
 assert.equal(await password.getAttribute('type'),'password');
 await page.getByRole('button',{name:'Mostrar senha'}).click();
 assert.equal(await password.getAttribute('type'),'text');
 await page.getByRole('button',{name:'Ocultar senha'}).click();
 assert.equal(await password.getAttribute('type'),'password');
 await page.getByRole('button',{name:/Entrar no meu painel/}).click();
 await page.getByRole('alert').filter({hasText:'E-mail ou senha incorretos.'}).waitFor();
 assert.equal(page.url().endsWith('/entrar'),true);
 assert.equal(attempts.filter(t=>t.action==='login').length,1);
 assert.equal(attempts[0].csrf,'qa-csrf-fixture');
 for(const width of [320,390,768,1280])await checkWidth(width);
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(output,'login-error.png'),fullPage:true});
 checks.push('login renderizado, mostrar/ocultar senha, credencial incorreta e proteção contra submit duplicado');
 allowLogin=true;
 await page.getByRole('button',{name:/Entrar no meu painel/}).click();
 await page.getByRole('heading',{name:'Painel de teste local (mock)'}).waitFor();
 assert.equal(attempts.filter(t=>t.action==='login').length,2);
 checks.push('login válido navega para o painel simulado, sem criar sessão no provedor');

 await goto('/esqueci-senha');
 await page.getByRole('heading',{name:'Esqueceu a senha?'}).waitFor();
 await page.getByRole('textbox',{name:'E-mail'}).fill('pizzaiolo.ficticio@example.test');
 await page.getByRole('button',{name:/Enviar link de recuperação/}).click();
 await page.getByRole('alert').filter({hasText:'Muitas tentativas'}).waitFor();
 assert.equal(page.url().endsWith('/esqueci-senha'),true);
 allowRecovery=true;
 await page.getByRole('button',{name:/Enviar link de recuperação/}).click();
 await page.getByText('Se o e-mail está cadastrado, você receberá as instruções.').waitFor();
 assert.equal(attempts.filter(t=>t.action==='recover').length,2);
 checks.push('recuperação exibe erro de limite, permite nova tentativa e mostra resposta genérica');

 await goto('/redefinir-senha');
 await page.getByText('Abra o link recebido por e-mail para continuar.').waitFor();
 assert.equal(await page.getByRole('button',{name:'Validar link de recuperação'}).isDisabled(),true);
 checks.push('página de senha sem token não permite alteração');

 await goto('/redefinir-senha?token_hash='+ 'b'.repeat(64));
 assert.ok(!page.url().includes('token_hash='),'token de recuperação permaneceu na barra de endereço');
 await page.getByRole('button',{name:'Validar link de recuperação'}).click();
 await page.getByRole('alert').filter({hasText:'Este link de recuperação expirou'}).waitFor();
 assert.equal(await page.getByLabel('Senha',{exact:true}).count(),0);
 checks.push('token vencido é recusado sem exibir o campo de nova senha');

 await goto('/redefinir-senha?token_hash='+ 'a'.repeat(64));
 assert.ok(!page.url().includes('token_hash='));
 await page.getByRole('button',{name:'Validar link de recuperação'}).click();
 await page.getByLabel('Senha',{exact:true}).waitFor();
 const before=attempts.filter(t=>t.action==='password').length;
 await page.getByLabel('Senha',{exact:true}).fill('SenhaFicticiaNova!2026');
 await page.getByLabel('Confirme a senha').fill('incompativel');
 await page.getByRole('button',{name:/Salvar nova senha/}).click();
 await page.getByRole('alert').filter({hasText:'As senhas precisam ser iguais'}).waitFor();
 assert.equal(attempts.filter(t=>t.action==='password').length,before);
 await page.getByLabel('Confirme a senha').fill('SenhaFicticiaNova!2026');
 await page.getByRole('button',{name:/Salvar nova senha/}).click();
 await page.getByText('Senha alterada. Entre novamente com a nova senha.').waitFor();
 assert.equal(attempts.filter(t=>t.action==='password').length,before+1);
 assert.equal(attempts.at(-1).hasCurrentPassword,false);
 for(const width of [320,390,768,1280])await checkWidth(width);
 checks.push('token válido, confirmação divergente bloqueada, senha alterada e retorno ao login');

 await goto('/entrar');
 await page.getByRole('link',{name:'Esqueci minha senha'}).click();
 await page.getByRole('heading',{name:'Esqueceu a senha?'}).waitFor();
 checks.push('atalho de recuperação no login funciona');
 assert.deepEqual(errors,[]);
 assert.deepEqual(blocked,[]);
 console.log('PASS AUTH MOBILE '+JSON.stringify(checks));
}finally{
 await writeFile(path.join(output,'summary.json'),JSON.stringify({checks,errors,blocked,attempts:attempts.map(({action,email,passwordLength,hasCurrentPassword})=>({action,email,passwordLength,hasCurrentPassword})),mode:'interface real + respostas de API mock; sem sessão/provedor real',passed:checks.length===7&&!errors.length&&!blocked.length},null,2));
 await context.close();await browser.close();
}
