import test from "node:test";
import assert from "node:assert/strict";
import {parsePrivateOrderLink,savePrivateOrderLink,recentPrivateOrderLinks,savedPrivateOrderToken,browserPrivateOrderToken} from "../lib/device-orders.ts";
const id="11111111-1111-4111-8111-111111111111", other="22222222-2222-4222-8222-222222222222",token="a".repeat(64);
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test("remember order without customer account, persist only validated bearer links",()=>{
 const local=store();const link=`/pedido/${id}#${token}`;
 assert.equal(savePrivateOrderLink(local,"pizza-casa",link),true);
 assert.equal(savedPrivateOrderToken(local,id),token);
 assert.equal(local.getItem("pedido-track-pizza-casa"),link);
 assert.deepEqual(recentPrivateOrderLinks(local,"pizza-casa"),[link]);
 assert.equal(savePrivateOrderLink(local,"pizza-casa",`/pedido/${other}#${token}`),true);
 assert.equal(savePrivateOrderLink(local,"pizza-casa",link),true);
 assert.deepEqual(recentPrivateOrderLinks(local,"pizza-casa"),[link,`/pedido/${other}#${token}`]);
});

test("a valid private link takes priority and works when storage lookup or storage access throws",()=>{
 const denied=()=>{throw new Error("SecurityError: storage unavailable");};
 assert.equal(browserPrivateOrderToken(denied,id,token),token);
 assert.equal(browserPrivateOrderToken(denied,id),"");
 assert.equal(savedPrivateOrderToken({getItem:denied},id),"");
 const local=store();local.setItem("pedido-order-"+id,"b".repeat(64));
 assert.equal(browserPrivateOrderToken(()=>local,id,token),token);
 assert.equal(browserPrivateOrderToken(()=>local,id,"invalid fragment"),"b".repeat(64));
 assert.equal(browserPrivateOrderToken(()=>local,"invalid id",token),"");
});
test("reject fake URLs, foreign domains and malformed stored data",()=>{
 const local=store();
 for (const link of ["https://evil.test/pedido/"+id+"#"+token,"/pedido/"+id,"/pedido/"+id+"#short","/login#"+token])assert.equal(parsePrivateOrderLink(link),null);
 assert.equal(savePrivateOrderLink(local,"bad/slug",`/pedido/${id}#${token}`),false);
 local.setItem("pedido-recent-pizza-casa","broken");
 assert.deepEqual(recentPrivateOrderLinks(local,"pizza-casa"),[]);
 assert.equal(savedPrivateOrderToken(local,"malformed"),"");
});
