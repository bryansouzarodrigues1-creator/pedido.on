// Real menu components and cart, with demo data only; no account/order/payment writes.
import {createRequire} from "node:module";
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import {browserQaTarget,guardPublicGuestContext} from "./browser-qa-target.mjs";
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.QA_PLAYWRIGHT_MODULE||"playwright-core");
const {base,publicReadOnly}=browserQaTarget(),output=path.resolve(process.env.QA_BROWSER_OUTPUT||".sites-runtime/browser-ci/styles");
const ids=["forno-classico","noite-premium","essencial","familia","atelier","urbano","trattoria","festival","forno-brasa","napoli-rua","fatia-pop","pizza-vinho"];
const checks=[],errors=[];let context,page;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:process.env.QA_HEADLESS==="true"});
try{
 context=await browser.newContext({...devices["Pixel 7"],locale:"pt-BR",serviceWorkers:"block"});
 await guardPublicGuestContext(context,errors);page=await context.newPage();page.setDefaultTimeout(20_000);page.on("pageerror",e=>errors.push(e.message));
 await page.goto(base+"/criar",{waitUntil:"domcontentloaded",timeout:90_000});
 await page.waitForFunction(()=>document.querySelector("#pizzeria-idea")?.disabled===false);
 const current=await page.getByRole("button",{name:"Criar 12 modelos",exact:true}).count()>0;
 if(!current){
  assert.equal(publicReadOnly,true,"O candidato local precisa oferecer os 12 modelos.");
  await writeFile(path.join(output,"style-gallery-browser.json"),JSON.stringify({base,checks,errors,skipped:"Publicação anterior aos 12 estilos; esta rodada não os homologa."},null,2));
 }else{
  for(const id of ids){
   try{
    await page.goto(base+"/demo/"+id,{waitUntil:"load",timeout:90_000});
    await page.locator(".customer-menu.identity-"+id).waitFor();
    const geometry=[];
    for(const width of [320,412]){
     await page.setViewportSize({width,height:839});
     const v=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
     assert.ok(v.scroll<=v.width+1,id+" overflow: "+JSON.stringify(v));geometry.push(v);
    }
    const composition=await page.locator(".product-section .products-grid").first().evaluate(el=>({display:getComputedStyle(el).display,columns:getComputedStyle(el).gridTemplateColumns,firstDirection:getComputedStyle(el.querySelector("button")).flexDirection}));
    await page.screenshot({path:path.join(output,id+".png"),fullPage:true});
    await page.getByRole("textbox",{name:"Buscar no cardápio",exact:true}).fill("Margherita");
    await page.waitForFunction(()=>document.querySelectorAll(".product-section .products-grid>button").length===1);
    await page.locator(".product-section .products-grid>button").click();
    const builder=page.getByRole("dialog");
    await builder.getByRole("button",{name:"Meio a meio",exact:true}).click();
    await builder.getByLabel("Segundo sabor",{exact:true}).selectOption("calabresa");
    await builder.getByRole("radio",{name:/Catupiry/}).check();
    await builder.getByRole("button",{name:/^Adicionar.*70,00/}).click();
    const bar=page.locator(".mobile-cart-bar");await bar.waitFor();assert.match(await bar.textContent(),/70,00/);
    await bar.click();
    const cart=page.getByRole("dialog");assert.match(await cart.textContent(),/Margherita/);assert.match(await cart.textContent(),/Calabresa/);assert.match(await cart.textContent(),/Catupiry/);assert.match(await cart.textContent(),/70,00/);
    await page.screenshot({path:path.join(output,id+"-cart.png"),fullPage:true});await page.keyboard.press("Escape");
    const reference=await context.request.get(base+"/assets/style-references/"+id+".webp");
    assert.equal(reference.status(),200);assert.match(reference.headers()["content-type"],/^image\/webp/);
    const bytes=await reference.body();assert.ok(bytes.length>10000);assert.equal(bytes.toString("ascii",8,12),"WEBP");
    checks.push({name:id,ok:true,widths:geometry,composition,halfHalfWithCrustCents:7000,referenceBytes:bytes.length});
    console.log("PASS STYLE "+id);
   }catch(error){checks.push({name:id,ok:false,error:error.message});await page.screenshot({path:path.join(output,id+"-failure.png"),fullPage:true}).catch(()=>{});console.error("FAIL STYLE "+id+" "+error.message);}
  }
  await writeFile(path.join(output,"style-gallery-browser.json"),JSON.stringify({base,checks,errors,scope:"12 demonstrações funcionais; carrinho local; sem pedido, cadastro, publicação ou IA paga"},null,2));
  assert.equal(checks.filter(c=>c.ok).length,12);assert.deepEqual(errors,[]);
 }
}catch(error){console.error(error.stack);process.exitCode=1;}
finally{await context?.close().catch(()=>{});await browser.close();console.log("STYLES "+JSON.stringify({passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length,errors}));}
