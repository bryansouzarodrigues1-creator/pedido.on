import test from "node:test";
import assert from "node:assert/strict";
import {normalizeBrazilWhatsApp,normalizeSupportWhatsApp,formatBrazilWhatsApp,supportWhatsAppLink} from "../lib/support-whatsapp.ts";

test("normalize Brazilian support and customer WhatsApp with mandatory DDD",()=>{
 assert.equal(normalizeBrazilWhatsApp("(22) 99999-8888"),"5522999998888");
 assert.equal(normalizeBrazilWhatsApp("+55 (22) 99999-8888"),"5522999998888");
 assert.equal(normalizeBrazilWhatsApp("5522999998888"),"5522999998888");
 assert.equal(formatBrazilWhatsApp("5522999998888"),"+55 (22) 99999-8888");
});
test("refuse malformed, missing DDD and arbitrary external phone numbers",()=>{
 for(const raw of ["99999-8888","(22) 8888-8888","00000000000","559999999999999","+1 202 555 1000","22abc99998888"]){
  assert.equal(normalizeBrazilWhatsApp(raw),null,raw);
 }
});
test("generate only WhatsApp links for validated Brazilian mobile number",()=>{
 const link=supportWhatsAppLink("(22) 99999-8888","Olá, gostaria de ajuda.");
 assert.equal(link,"https://wa.me/5522999998888?text="+encodeURIComponent("Olá, gostaria de ajuda."));
 assert.equal(supportWhatsAppLink("555", "teste"),null);
});
test("preserve explicitly configured eight-digit support numbers without adding a digit",()=>{
 for(const raw of ["(22) 9888-7777","+55 (22) 9888-7777","552298887777"]){
  assert.equal(normalizeSupportWhatsApp(raw),"552298887777");
  assert.equal(formatBrazilWhatsApp(raw),"+55 (22) 9888-7777");
  assert.equal(new URL(supportWhatsAppLink(raw,"Preciso de ajuda.")).pathname,"/552298887777");
 }
 assert.equal(normalizeBrazilWhatsApp("(22) 9888-7777"),null);
 assert.equal(normalizeSupportWhatsApp("(55) 9888-7777"),"555598887777");
 assert.equal(normalizeSupportWhatsApp("(55) 99999-8888"),"5555999998888");
 assert.equal(normalizeSupportWhatsApp("+55 (22) 99999-8888"),"5522999998888");
});
test("support configuration still rejects missing DDDs, foreign numbers and injected URLs",()=>{
 for(const raw of ["9888-7777","99999-8888","+1 202 555 1000","22abc98887777","https://wa.me/552298887777","(02) 9888-7777","(22) 1888-7777","552299999888800"]){
  assert.equal(normalizeSupportWhatsApp(raw),null,raw);
  assert.equal(formatBrazilWhatsApp(raw),null,raw);
  assert.equal(supportWhatsAppLink(raw,"teste"),null,raw);
 }
});
