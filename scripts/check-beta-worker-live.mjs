#!/usr/bin/env node
/**
 * PUBLIC / READ-ONLY acceptance for Cloudflare beta. Does not log in, create
 * users, place orders, run paid AI, call Asaas or touch private R2 objects.
 */
import assert from "node:assert/strict";
const ORIGIN="https://pizzaria-on-backend-staging-20261017.bryansouzarodrigues06.workers.dev";
const styles=["forno-classico","noite-premium","essencial","familia","atelier","urbano",
 "trattoria","festival","forno-brasa","napoli-rua","fatia-pop","pizza-vinho"];
const tests=[
 {path:"/criar",status:200,type:"text/html",terms:["pizzaria"]},
 {path:"/entrar",status:200,type:"text/html"},
 {path:"/api/auth/config?registration=1",status:200,type:"application/json",auth:true},
 {path:"/api/restaurants",status:401,type:"application/json",private:true},
 {path:"/api/admin/status",status:401,type:"application/json",private:true},
 {path:"/api/billing/status",status:401,type:"application/json",private:true},
 ...styles.map(style=>({path:"/demo/"+style,status:200,type:"text/html",
  terms:["Margherita","Calabresa","Chocolate","Frango com Catupiry","Dupla da noite","Guaraná"]}))
];
async function check(test){
 const result={path:test.path,ok:false,status:0,notes:[]};
 try{
  const response=await fetch(ORIGIN+test.path,{method:"GET",redirect:"manual",
   headers:{"Accept":"text/html, application/json","User-Agent":"pizzaria-beta-12styles-readonly/1.0"},
   signal:AbortSignal.timeout(25000)});
  result.status=response.status;
  assert.equal(response.status,test.status,"HTTP");
  assert.ok((response.headers.get("content-type")||"").startsWith(test.type),"Content-Type");
  const limit=2200000,bytes=await response.arrayBuffer();
  assert.ok(bytes.byteLength<limit,"body size");
  const body=new TextDecoder().decode(bytes);
  if(test.private){
   assert.match(response.headers.get("cache-control")||"",/no-store/,"private no-store");
   const data=JSON.parse(body);
   assert.deepEqual(Object.keys(data),["error"],"private route leaked");
  }
  if(test.auth){
   const data=JSON.parse(body);
   assert.equal(data.enabled,true,"Supabase auth not enabled");
   assert.equal(data.registrationEnabled,true,"public signup disabled");
   assert.equal(data.inviteRequired,false,"signup still invite-only");
  }
  if(test.terms){
   for(const term of test.terms){
    assert.ok(body.toLowerCase().includes(term.toLowerCase()),"missing demo content: "+term);
   }
  }
  result.ok=true;
 }catch(e){result.notes.push(String(e instanceof Error?e.message:e).slice(0,210));}
 return result;
}
const results=[];
for(let i=0;i<tests.length;i+=4)results.push(...await Promise.all(tests.slice(i,i+4).map(check)));
const passed=results.filter(x=>x.ok).length;
console.log(JSON.stringify({origin:ORIGIN,mode:"public GET only",passed,total:tests.length,styles:styles.length,
 results,scope:"No orders, logins, Asaas, paid AI, or private media accessed."},null,2));
if(passed!==tests.length)process.exitCode=1;
