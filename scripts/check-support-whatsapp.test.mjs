import test from "node:test";
import assert from "node:assert/strict";
import {normalizeBrazilWhatsApp,formatBrazilWhatsApp,supportWhatsAppLink} from "../lib/support-whatsapp.ts";

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
