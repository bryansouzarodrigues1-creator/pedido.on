// QA real no Chrome com APIs de cadastro simuladas, sem criar contas ou enviar credenciais reais.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import {browserQaTarget} from "./browser-qa-target.mjs";

const {base,publicReadOnly}=browserQaTarget();
if(publicReadOnly)throw Error("O teste de cartão exige ambiente local descartável.");
const require=createRequire(import.meta.url),{chromium}=require(process.env.QA_PLAYWRIGHT_MODULE||"playwright-core");
const output=path.resolve(process.env.QA_BROWSER_OUTPUT||".sites-runtime/browser-ci/registration-card");
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,locale:"pt-BR",serviceWorkers:"block"});
const errors=[],unexpectedExternal=[],requests=[];
let response={status:409,body:{error:"Esta conta de teste já existe."}};
await context.route("**/*",route=>{
 const url=new URL(route.request().url());
 if(url.origin===base)return route.continue();
 unexpectedExternal.push(url.origin);
 return route.abort();
});
await context.route("**/api/auth/config?registration=1",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({enabled:true,registrationEnabled:true,recoveryEnabled:false,googleEnabled:false,inviteRequired:false,csrf:"test-csrf-token",captchaSiteKey:""})}));
await context.route("**/api/auth/register",route=>{
 requests.push(route.request().postDataJSON());
 return route.fulfill({status:response.status,contentType:"application/json",body:JSON.stringify(response.body)});
});
const page=await context.newPage();
page.setDefaultTimeout(30000);
page.on("pageerror",e=>errors.push(e.message));
const checks=[];
const secret="SenhaFicticia2026!NuncaUsarEmProducao";
try{
 await page.goto(base+"/cadastro?next=%2Fapp%3Fnew%3D1",{waitUntil:"networkidle",timeout:90000});
 const name="Dona Ana "+"Pizzaria Brasileira ".repeat(4);
 const email="ana."+("muito.longo.".repeat(6))+"@pizzaria.example";
 await page.getByRole("textbox",{name:"Seu nome"}).fill(name);
 await page.getByRole("textbox",{name:"E-mail"}).fill(email);
 await page.getByLabel("Senha",{exact:true}).fill(secret);
 const submit=page.locator("form button[type=submit]");
 await submit.click();
 await page.getByRole("alert").filter({hasText:"Esta conta de teste já existe"}).waitFor();
 assert.equal(await page.getByRole("heading",{name:"Guarde seu acesso à Pizzaria.on"}).count(),0);
 checks.push("cadastro com falha não apresenta cartão");

 response={status:200,body:{ok:false,message:"Cadastro pendente, conta não confirmada."}};
 await submit.click();
 await page.getByRole("alert").filter({hasText:"O cadastro não foi confirmado"}).waitFor();
 assert.equal(await page.getByRole("heading",{name:"Guarde seu acesso à Pizzaria.on"}).count(),0);
 checks.push("resposta 200 sem confirmação não apresenta cartão");

 response={status:200,body:{ok:true,next:"/app?new=1"}};
 await submit.click();
 await page.getByRole("heading",{name:"Guarde seu acesso à Pizzaria.on"}).waitFor();
 assert.equal(await page.getByRole("checkbox",{name:"Incluir minha senha na imagem"}).isChecked(),false);
 assert.equal(await page.getByText(secret,{exact:true}).count(),0);
 assert.ok(!await page.evaluate(()=>document.body.innerText.includes("SenhaFicticia2026")));
 assert.equal(requests.length,3);
 assert.equal(requests.at(-1).next,"/app?new=1");
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
 await page.screenshot({path:path.join(output,"mobile.png"),fullPage:true});
 checks.push("cartão apenas após confirmação e senha oculta, celular sem rolagem horizontal");

 async function fileFor(button,expectedName){
  const [download]=await Promise.all([page.waitForEvent("download"),page.getByRole("button",{name:button}).click()]);
  assert.equal(download.suggestedFilename(),expectedName);
  const file=await download.path();
  assert.ok(file,"download não gerou arquivo");
  return readFile(file);
 }
 const svgBytes=await fileFor("Baixar versão editável (SVG)","pizzaria-on-meu-acesso.svg");
 const svg=svgBytes.toString("utf8");
 assert.match(svg,/data:image\/webp;base64,/);
 assert.match(svg,/data:image\/png;base64,/);
 assert.match(svg,/pizzaria/);
 assert.ok(svg.includes(email.slice(0,25)));
 assert.ok(!svg.includes(secret));
 assert.match(svg,/MEU E-MAIL/);
 checks.push("SVG editável contém logotipo/foto oficiais, nome e e-mail; senha não exportada");

 const png=await fileFor("Baixar meu cartão (PNG)","pizzaria-on-meu-acesso.png");
 assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
 assert.equal(png.readUInt32BE(16),1280);
 assert.ok(png.readUInt32BE(20)>=810);
 assert.ok(png.length>20000);
 checks.push("PNG gerado e válido a partir das imagens locais");

 await page.getByRole("checkbox",{name:"Incluir minha senha na imagem"}).check();
 const consent=await fileFor("Baixar versão editável (SVG)","pizzaria-on-meu-acesso.svg");
 assert.ok(consent.toString("utf8").includes(secret));
 assert.match(consent.toString("utf8"),/ATENÇÃO: imagem contém sua senha/);
 await page.getByRole("checkbox",{name:"Incluir minha senha na imagem"}).uncheck();
 assert.equal(await page.getByText(secret,{exact:true}).count(),0);
 checks.push("senha só pode ser exportada após consentimento explícito e pode ser ocultada");

 await page.setViewportSize({width:1280,height:900});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
 await page.screenshot({path:path.join(output,"desktop.png"),fullPage:true});
 checks.push("layout responsivo também no desktop");
 assert.deepEqual(errors,[]);
 assert.deepEqual(unexpectedExternal,[]);
 console.log("PASS REGISTRATION CARD "+JSON.stringify(checks));
}finally{
 await writeFile(path.join(output,"result.json"),JSON.stringify({checks,errors,unexpectedExternal,requests:requests.length},null,2));
 await browser.close();
}
