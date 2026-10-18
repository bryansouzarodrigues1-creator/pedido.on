// Real Chrome e2e for the new zero-credit guided owner intake.
// Uses a local, synthetic D1 and mock identity; no paid AI or customer data.
import {createRequire} from "node:module";
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import {browserQaTarget,guardPublicGuestContext} from "./browser-qa-target.mjs";
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||"playwright-core");
const {base,publicReadOnly}=browserQaTarget();
if(publicReadOnly)throw Error("A conversa de cadastro só será executada no D1 local.");
const root=path.resolve(process.env.QA_BROWSER_OUTPUT||".sites-runtime/browser-ci/guest");
const profile=path.join(root,"guest-profile"),evidence=path.join(root,"evidence");
const checks=[],errors=[];let context,page;
await mkdir(evidence,{recursive:true});
const wait=()=>page.locator("#owner-intake-message").waitFor({state:"visible",timeout:25000});
async function say(answer){
 await wait();
 const box=page.locator("#owner-intake-message");
 await box.fill(answer);
 await page.getByRole("button",{name:/^(Enviar|Salvar)$/}).click();
}
async function record(label,fn){try{let data=await fn();checks.push({label,ok:true,data});console.log("PASS GUIDED "+label);}catch(e){checks.push({label,ok:false,error:e.message});console.error("FAIL GUIDED "+label+" "+e.stack);await page?.screenshot({path:path.join(evidence,"fail-"+checks.length+".png"),fullPage:true}).catch(()=>{});throw e;}}
try{
 context=await chromium.launchPersistentContext(profile,{
  executablePath:process.env.QA_CHROME_PATH,headless:process.env.QA_HEADLESS==="true",...devices["Pixel 7"],locale:"pt-BR",serviceWorkers:"block"
 });
 await guardPublicGuestContext(context,errors);
 page=await context.newPage();page.setDefaultTimeout(20000);page.on("pageerror",e=>errors.push(e.message));
 await page.goto(base+"/criar",{waitUntil:"domcontentloaded",timeout:90_000});
 await page.waitForFunction(()=>document.querySelector("#owner-intake-message")?.disabled===false);
 await record("conversa sem cadastro nem imagens pagas",async()=>{
  assert.equal(await page.locator(".ai-style-card").count(),0);
  assert.equal(await page.locator('input[type="email"],input[type="password"]').count(),0);
  assert.match(await page.locator(".owner-intake").textContent(),/5 perguntas/);
  await page.screenshot({path:path.join(evidence,"guided-start.png"),fullPage:true});
 });
 await record("captura nome, bairro, WhatsApp, horário e link sem confundir cores",async()=>{
  await say("O nome da minha pizzaria é Bella Massa QA, quero amarelo cor de queijo e azul do mar, um cardápio artesanal com fotos grandes.");
  assert.match(await page.locator(".owner-intake-history").textContent(),/Bella Massa QA/);
  await say("Rua Guilhermina, 120, Tucuns, Armação dos Búzios - RJ");
  await say("(22) 99999-9999");
  await say("Terça a domingo, das 18h às 23h");
  await say("depois");
  await page.getByRole("button",{name:/Ver meus 12 modelos personalizados/}).waitFor();
  assert.equal(await page.locator(".ai-style-card").count(),0);
  await page.screenshot({path:path.join(evidence,"guided-complete.png"),fullPage:true});
 });
 await record("12 templates usam mesmo nome e endereço HTML sem imagens novas",async()=>{
  await page.getByRole("button",{name:/Ver meus 12 modelos personalizados/}).click();
  await page.locator(".ai-style-card").first().waitFor({timeout:90000});
  assert.equal(await page.locator(".ai-style-card").count(),4);
  assert.deepEqual(await page.locator(".ai-style-card .mini-top strong").allTextContents(),Array(4).fill("Bella Massa QA"));
  assert.equal(await page.locator(".ai-style-card .mini-store-address").count(),4);
  assert.match(await page.locator(".ai-style-card .mini-store-hours").first().textContent(),/18h/);
  await page.screenshot({path:path.join(evidence,"guided-personalized.png"),fullPage:true});
 });
 await record("teste completo abre as 18 demonstrações com as cores e o nome do briefing, sem pedidos reais",async()=>{
  await page.locator(".ai-style-card").first().locator(".ai-style-footer button").last().click();
  await page.locator(".ai-selected").waitFor();
  const chosen=await page.locator(".ai-selected .mini-menu").evaluate(el=>({accent:el.style.getPropertyValue("--menu-accent"),secondary:el.style.getPropertyValue("--menu-secondary"),bg:el.style.getPropertyValue("--menu-bg")}));
  assert.equal(chosen.accent.toUpperCase(),"#2169AC");assert.equal(chosen.secondary.toUpperCase(),"#F2BD38");
  await page.getByRole("button",{name:/Testar o cardápio completo personalizado/}).click();
  const overlay=page.getByRole("dialog",{name:"Teste do cardápio personalizado"});
  await overlay.waitFor();
  const full=overlay.locator(".customer-menu");await full.waitFor();
  const actual=await full.evaluate(el=>({accent:el.style.getPropertyValue("--menu-accent"),secondary:el.style.getPropertyValue("--menu-secondary"),bg:el.style.getPropertyValue("--menu-bg")}));
  assert.deepEqual(actual,chosen,"A demonstração deve reutilizar exatamente a mesma paleta");
  assert.match(await full.locator(".restaurant-brand").textContent(),/Bella Massa QA/);
  assert.match(await full.textContent(),/Frango com Catupiry/);
  assert.match(await full.textContent(),/Dupla da noite/);
  assert.match(await overlay.textContent(),/não envia pedidos nem cobra/);
  await overlay.screenshot({path:path.join(evidence,"guided-full-menu-brand.png")});
  await overlay.getByRole("button",{name:"Fechar teste e voltar aos modelos"}).click();
  assert.equal(await page.getByRole("dialog",{name:"Teste do cardápio personalizado"}).count(),0);
  return actual;
 });
 await record("importação de cardápio CSV/TXT mantém preços como dados, não como arte",async()=>{
  await page.getByRole("button",{name:/Anexar cardápio/}).click();
  const file=page.locator('input[type=file][accept*=".txt"]');
  await file.setInputFiles({name:"cardapio.txt",mimeType:"text/plain",buffer:Buffer.from("BEBIDAS\nRefrigerante lata R$ 6,00\nÁgua mineral R$ 4,00")});
  await page.waitForFunction(()=>document.querySelector("#idea-source-text")?.value.includes("Água mineral"));
  await file.setInputFiles({name:"cardapio.csv",mimeType:"text/csv",buffer:Buffer.from("categoria;nome;preco\nBebidas;Suco natural;8,00")});
  await page.waitForFunction(()=>document.querySelector("#idea-source-text")?.value.includes("Suco natural"));
  await page.getByRole("button",{name:/Ver meus 12 modelos personalizados/}).click();
  await page.locator(".ai-style-card").first().waitFor({timeout:90_000});
  assert.ok((await page.locator(".ai-style-card .mini-product").count())>=1);
 });
 await record("assets reutilizáveis e refinamento de estilo persistem em checkpoint",async()=>{
  const png=Buffer.from(await page.evaluate(()=>{
   const c=document.createElement("canvas");c.width=400;c.height=300;const x=c.getContext("2d");x.fillStyle="#f0aa66";x.fillRect(0,0,400,300);x.fillStyle="#663300";x.font="bold 30px sans-serif";x.fillText("BELLA MASSA QA",20,160);return c.toDataURL("image/png").split(",")[1];
  }),"base64");
  await page.locator('input[type=file]').nth(2).setInputFiles({name:"logo-qa.png",mimeType:"image/png",buffer:png});
  await page.getByRole("button",{name:"Remover logo"}).waitFor();
  await page.locator('input[type=file]').nth(3).setInputFiles({name:"capa-qa.png",mimeType:"image/png",buffer:png});
  await page.getByRole("button",{name:"Remover capa"}).waitFor();
  const first=page.locator(".ai-style-card").first();
  await first.locator(".ai-style-footer button").last().click();
  await page.locator(".ai-selected").waitFor();
  await page.locator(".ai-selected-more summary").click();
   for(const prompt of ["Quero verde com cantos arredondados","Agora azul e uma lista compacta","Quero azul com animação 3D da lua"]){
   await page.getByRole("button",{name:"Ajustar cores, fotos e textos"}).click();
   await page.locator("#gallery-feedback").fill(prompt);
   await page.getByRole("button",{name:/Aplicar meu pedido/}).click();
  }
  assert.match(await page.locator(".ai-selected .mini-menu").getAttribute("class"),/layout-compact/);
  const selected=page.locator(".ai-selected .mini-menu");
  assert.match(await selected.getAttribute("class"),/corners-soft/);
  assert.match(await selected.getAttribute("style"),/#296bac/);
  await page.screenshot({path:path.join(evidence,"guided-style.png"),fullPage:true});
  await page.getByRole("button",{name:"Usar este modelo"}).click();
  await page.waitForURL(/\/cadastro(?:\?|$)/,{timeout:45_000});
  const launch=await page.evaluate(()=>JSON.parse(localStorage.getItem("pizzaria-menu-idea-v1")));
  assert.equal(launch.brandName,"Bella Massa QA");
  assert.equal(launch.ownerIntake.step,5);
  assert.match(launch.ownerIntake.answers.address,/Tucuns/);
  assert.match(launch.refinement,/3D/);
  assert.equal(launch.styleId!==undefined,true);
  assert.equal(launch.hasAssets,true);
  assert.match(launch.sourceText,/Suco natural/);
 });
 assert.deepEqual(errors,[]);
}catch(e){process.exitCode=1;console.error(e.stack);}
finally{
 await context?.close().catch(()=>{});
 await writeFile(path.join(root,"guest-browser.json"),JSON.stringify({base,mode:"structured chat without model calls",checks,errors},null,2));
 console.log("GUIDED QA "+JSON.stringify({passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,errors}));
}
