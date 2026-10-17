import test from "node:test";
import assert from "node:assert/strict";
import {stripSitesIdentity} from "../lib/self-host-policy.ts";

test("standalone worker strips untrusted Sites login headers before business routes",async()=>{
 const source=new Request("https://pizzaria.example/api/account",{method:"POST",headers:{
  "oai-authenticated-user-id":"forged-owner",
  "oai-authenticated-user-email":"owner@example.test",
  "oai-authenticated-user-full-name":"Owner",
  "oai-authenticated-user-full-name-encoding":"percent-encoded-utf-8",
  "x-oai-forged":"x",
  "x-openai-forged":"x",
  "openai-experiment":"x",
  "cookie":"__Host-pedido-session="+("a".repeat(64)),
  "content-type":"application/json",
  "x-pedido-proxy-origin":"https://test.example"
 },body:'{"safe":true}'});
 const cleaned=stripSitesIdentity(source);
 assert.equal(cleaned.headers.get("oai-authenticated-user-id"),null);
 assert.equal(cleaned.headers.get("oai-authenticated-user-email"),null);
 assert.equal(cleaned.headers.get("x-oai-forged"),null);
 assert.equal(cleaned.headers.get("x-openai-forged"),null);
 assert.equal(cleaned.headers.get("openai-experiment"),null);
 assert.equal(cleaned.headers.get("cookie"),source.headers.get("cookie"));
 assert.equal(cleaned.headers.get("content-type"),"application/json");
 assert.equal(cleaned.headers.get("x-pedido-proxy-origin"),"https://test.example");
 assert.equal(cleaned.method,"POST");
 assert.equal(await cleaned.text(),'{"safe":true}');
});
test("standalone sanitizer does not mutate original incoming request",()=>{
 const original=new Request("https://pizzaria.example/",{headers:{"oai-authenticated-user-id":"pretender"}});
 stripSitesIdentity(original);
 assert.equal(original.headers.get("oai-authenticated-user-id"),"pretender");
});
