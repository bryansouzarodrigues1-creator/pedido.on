// Post-deploy, read-only verification. Run once for each public origin.
// Never registers users, sends messages, generates AI content or starts billing.
import assert from "node:assert/strict";
import {TRIAL_DAYS} from "../lib/trial-policy.ts";

const origin=process.argv[2];
const allowed=new Set(["https://pizzaria-on.netlify.app","https://forno-cardapios.waves4845.chatgpt.site"]);
assert.ok(allowed.has(origin),"Informe o endereço oficial de produção.");
assert.equal(TRIAL_DAYS,10);
const response=await fetch(origin+"/cadastro",{redirect:"manual",signal:AbortSignal.timeout(20000),headers:{"Cache-Control":"no-cache"}});
assert.equal(response.status,200,"O cadastro deve responder HTTP 200.");
const html=await response.text();
const expected=String(TRIAL_DAYS)+" DIAS GRÁTIS";
assert.ok(html.includes(expected),"O HTML público do cadastro não anuncia "+expected+". Implante o backend atualizado antes de divulgar.");
assert.ok(!html.includes("1 MÊS GRÁTIS · 30 DIAS"),"O cadastro ainda publica a oferta antiga de 30 dias.");
const configResponse=await fetch(origin+"/api/auth/config?registration=1",{redirect:"manual",signal:AbortSignal.timeout(20000)});
assert.equal(configResponse.status,200,"A configuração de autenticação pública deve estar disponível.");
const config=await configResponse.json();
assert.equal(config.enabled,true);
assert.equal(config.registrationEnabled,true);
assert.equal(config.directSignup,true);
console.log(JSON.stringify({origin,signupOfferDays:TRIAL_DAYS,signupReady:true,scope:"Leitura HTTP apenas. Não houve cadastro, pagamento, pedido ou geração paga."}));
