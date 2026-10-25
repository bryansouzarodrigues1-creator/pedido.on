import test from "node:test";
import assert from "node:assert/strict";
import {supportWhatsAppLink,normalizeBrazilWhatsApp} from "../lib/support-whatsapp.ts";
import {readFileSync} from "node:fs";
test("recovery contact links accept only valid support numbers and encode the optional email",()=>{
 const number="5522999998888";
 const message="Olá, preciso recuperar acesso da Pizzaria.on. E-mail: dono+teste@example.com";
 assert.equal(normalizeBrazilWhatsApp(number),number);
 const link=supportWhatsAppLink(number,message);
 assert.equal(new URL(link).hostname,"wa.me");
 assert.equal(new URL(link).pathname,"/"+number);
 assert.equal(new URL(link).searchParams.get("text"),message);
 assert.equal(supportWhatsAppLink("1234567",message),null);
});
test("recovery interface retains the email flow and offers WhatsApp without exposing passwords",()=>{
 const ui=readFileSync(new URL("../components/auth-form.tsx",import.meta.url),"utf8");
 const api=readFileSync(new URL("../app/api/auth/[action]/route.ts",import.meta.url),"utf8");
 assert.match(ui,/Solicitar recuperação pelo WhatsApp/);
 assert.match(ui,/href="\/esqueci-senha">Esqueci minha senha/);
 assert.match(ui,/supportWhatsAppLink\(config\.supportWhatsApp/);
 assert.match(api,/supportWhatsApp:supportContactWhatsApp\(\)\?\.number\|\|null/);
 assert.doesNotMatch(ui,/Mensagem enviada com sua senha atual/);
});
