import test from "node:test";
import assert from "node:assert/strict";
import {fixture} from "./test-backend-fixture.mjs";
const token="b".repeat(64);
const request=()=>({requestId:crypto.randomUUID(),token,phone:"(11) 99999-9999",address:"Rua de teste, 100, Centro",latitude:-22.9,longitude:-43.2});
test("customer waits for delivery approval before an order can expose Pix",async()=>{
 const f=fixture();f.env.PEDIDO_DELIVERY_APPROVAL_ENABLED="true";
 try{
  const order=f.input();
  const blocked=await f.call("create","POST",{slug:"pizzaria-a"},order);
  assert.equal(blocked.status,403);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM orders").get().n,0);
  const start=request();
  const answer=await f.call("delivery","POST",{slug:"pizzaria-a"},start);
  assert.equal(answer.status,201,await answer.clone().text());
  const value=await answer.json();
  assert.equal(value.status,"pending");
  const noToken=await f.call("delivery","GET",{slug:"pizzaria-a"});
  assert.equal(noToken.status,404);
  const replay=await f.call("delivery","POST",{slug:"pizzaria-a"},start);
  assert.equal(replay.status,200);
  assert.equal((await replay.json()).id,value.id);
  const status=await f.call("delivery","GET",{slug:"pizzaria-a"},undefined,{"x-pedido-delivery-token":token});
  // GET needs the public request id in its query.
  assert.equal(status.status,404);
  const beforeApprove=await f.call("create","POST",{slug:"pizzaria-a"},{...order,deliveryCheckId:value.id,deliveryCheckToken:token});
  assert.equal(beforeApprove.status,403);
  const owner=await f.call("deliveryOwner","GET",{id:"shop-a"});
  assert.equal(owner.status,200);
  assert.equal((await owner.json()).requests.length,1);
  const approval=await f.call("deliveryOwner","PATCH",{id:"shop-a"},{id:value.id,version:1,action:"approve"});
  assert.equal(approval.status,200,await approval.clone().text());
  assert.equal((await f.call("deliveryOwner","PATCH",{id:"shop-a"},{id:value.id,version:1,action:"approve"})).status,409);
  const altered=await f.call("create","POST",{slug:"pizzaria-a"},{...order,address:"Rua diferente, 10",deliveryCheckId:value.id,deliveryCheckToken:token});
  assert.equal(altered.status,403);
  const wrongToken=await f.call("create","POST",{slug:"pizzaria-a"},{...order,deliveryCheckId:value.id,deliveryCheckToken:"f".repeat(64)});
  assert.equal(wrongToken.status,403);
  const verified=await f.call("create","POST",{slug:"pizzaria-a"},{...order,deliveryCheckId:value.id,deliveryCheckToken:token});
  assert.equal(verified.status,201,await verified.clone().text());
  const result=await verified.json();assert.ok(result.trackingUrl.startsWith("/pedido/"));
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM orders").get().n,1);
 }finally{f.close();}
});
test("request approval stays owned by one pizzeria and rejection never allows Pix",async()=>{
 const f=fixture();f.env.PEDIDO_DELIVERY_APPROVAL_ENABLED="true";
 try{
  const input=request();
  const r=await f.call("delivery","POST",{slug:"pizzaria-a"},input),created=await r.json();
  assert.equal((await f.call("deliveryOwner","PATCH",{id:"shop-b"},{id:created.id,version:1,action:"approve"})).status,404);
  assert.equal((await f.call("deliveryOwner","PATCH",{id:"shop-a"},{id:created.id,version:1,action:"reject"})).status,200);
  assert.equal((await f.call("create","POST",{slug:"pizzaria-a"},{...f.input(),deliveryCheckId:created.id,deliveryCheckToken:token})).status,403);
  const pickup={...f.input(),method:"pickup",address:"",payment:"Dinheiro"};
  assert.equal((await f.call("create","POST",{slug:"pizzaria-a"},pickup)).status,201);
 }finally{f.close();}
});
test("delivery approval is opt-in until migration and launch checklist are complete",async()=>{
 const f=fixture();
 try{
  const r=await f.call("delivery","POST",{slug:"pizzaria-a"},request());
  assert.equal(r.status,503);
  assert.equal((await f.call("deliveryOwner","GET",{id:"shop-a"})).status,200);
  assert.equal((await (await f.call("deliveryOwner","GET",{id:"shop-a"})).json()).enabled,false);
  assert.equal((await f.call("create","POST",{slug:"pizzaria-a"},f.input())).status,201);
 }finally{f.close();}
});
