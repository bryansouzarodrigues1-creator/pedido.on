import test from "node:test";
import assert from "node:assert/strict";
import {stripSitesIdentity,standaloneLaunchGate} from "../lib/self-host-policy.ts";

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

test("new standalone Worker cannot accept any business request by default",async()=>{
 for(const [method,path] of [
  ["GET","/"],["POST","/api/orders"],["POST","/api/auth/login"],
  ["GET","/api/restaurants"],["POST","/api/billing/checkout"],
  ["POST","/api/admin/status"],["GET","/media/private-document"],
  ["GET","/manifest.webmanifest"],["GET","/healthz"],
 ]) {
  const req=new Request("https://staging.invalid"+path,{method});
  const r=standaloneLaunchGate(req,undefined);
  assert.ok(r,method+" "+path);
  assert.equal(r.status,503,path);
  assert.match(r.headers.get("cache-control"),/no-store/);
  assert.equal(r.headers.get("x-content-type-options"),"nosniff");
  const body=await r.json();
  assert.equal(body.publicAppReady ?? false,false);
 }
});
test("staging guard does not trust arbitrary ready-like strings or request headers",()=>{
 const req=new Request("https://staging.invalid/api/orders",{
  method:"POST",headers:{"x-ready":"reconciled-and-approved","oai-authenticated-user-id":"forged"}
 });
 for(const flag of [undefined,"true","1","ready","test","reconciled-and-approved "]) {
  const result=standaloneLaunchGate(req,flag);
  assert.ok(result,"flag "+flag);
  assert.equal(result.status,503);
 }
 assert.equal(standaloneLaunchGate(req,"reconciled-and-approved"),null);
});
test("health check is not a signal to cut over traffic",async()=>{
 const res=standaloneLaunchGate(new Request("https://staging.invalid/healthz"),undefined);
 assert.ok(res);
 assert.equal(res.status,503);
 assert.deepEqual(await res.json(),{
  status:"staging-only",publicAppReady:false,
  productionDataMigrated:false,businessRoutesEnabled:false
 });
});
