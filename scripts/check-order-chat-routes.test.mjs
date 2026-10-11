import test from "node:test";
import assert from "node:assert/strict";
import {fixture} from "./test-backend-fixture.mjs";
const token="ef".repeat(32);
const withToken={"x-pedido-order-token":token};
test("chat is private to tracked order and owning pizzeria",async()=>{
 const f=fixture();
 try{
  const created=await f.create(),id=created.order.id;
  const deny=await f.call("customerChat","GET",{id});
  assert.equal(deny.status,404);
  const wrong=await f.call("customerChat","GET",{id},undefined,{"x-pedido-order-token":"a".repeat(64)});
  assert.equal(wrong.status,404);
  const initial=await f.call("customerChat","GET",{id},undefined,withToken);
  assert.equal(initial.status,200);assert.equal((await initial.json()).messages.length,0);
  const customer=await f.call("customerChat","POST",{id},{text:"Minha pizza sem cebola?"},withToken);
  assert.equal(customer.status,201,await customer.clone().text());
  const owner=await f.call("ownerChat","POST",{id:"shop-a",orderId:id},{text:"Combinado!"});
  assert.equal(owner.status,201,await owner.clone().text());
  assert.equal((await f.call("ownerChat","GET",{id:"shop-b",orderId:id})).status,404);
  assert.equal((await f.call("ownerChat","POST",{id:"shop-b",orderId:id},{text:"Invasão"})).status,404);
  const msgs=(await (await f.call("customerChat","GET",{id},undefined,withToken)).json()).messages;
  assert.deepEqual(msgs.map(m=>m.sender),["customer","restaurant"]);
  assert.equal(msgs[0].body,"Minha pizza sem cebola?");
  assert.equal(msgs[1].body,"Combinado!");
  assert.ok(!JSON.stringify(msgs).includes(token));
  assert.equal((await f.call("customerChat","POST",{id},{text:""} ,withToken)).status,400);
  assert.equal((await f.call("customerChat","POST",{id},{text:"a".repeat(1001)},withToken)).status,400);
  f.db.prepare("UPDATE orders SET status='delivered' WHERE id=?").run(id);
  assert.equal((await f.call("customerChat","POST",{id},{text:"Outra mensagem"},withToken)).status,409);
  assert.equal((await f.call("ownerChat","POST",{id:"shop-a",orderId:id},{text:"Outra mensagem"})).status,409);
 }finally{f.close();}
});
