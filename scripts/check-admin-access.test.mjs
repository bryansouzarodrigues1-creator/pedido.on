import test from "node:test";
import assert from "node:assert/strict";
import {fixture} from "./test-backend-fixture.mjs";
import {adminAccessAction,effectiveAccess,grantExpiry,moreGenerousPlan} from "../lib/account-access-policy.ts";
const reason="Cortesia autorizada para teste da pizzaria.";
test("one account access action validates its reason and prevents contradictory actions",()=>{
 const original={restaurantId:"shop-b",mode:"grant",plan:"profissional",durationDays:30,reason,expectedVersion:0};
 assert.equal(adminAccessAction.safeParse(original).success,true);
 for(const input of [{...original,reason:"curto"},{...original,mode:"suspended"},{...original,plan:"enterprise"},{...original,durationDays:365},{...original,expectedVersion:-1}])assert.equal(adminAccessAction.safeParse(input).success,false);
 assert.equal(grantExpiry(30,1000),1000+30*86400);
 assert.equal(grantExpiry(null,1000),null);
 assert.equal(moreGenerousPlan("profissional","rede"),"rede");
 assert.equal(moreGenerousPlan("profissional","essencial"),"profissional");
 assert.equal(moreGenerousPlan("essencial",null),"essencial");
 assert.equal(effectiveAccess({mode:"grant",plan:"profissional",expiresAt:999},1000).mode,"normal");
 assert.equal(effectiveAccess({mode:"suspended",plan:"profissional",expiresAt:999},1000).mode,"suspended");
});
test("private admin grants Pro, suspends new orders and restores standard access with audit",async()=>{
 const f=fixture();f.env.PLATFORM_ADMIN_ACCOUNT_ID="owner-a";
 try{
  const canServeMenu=f.load("lib/billing.ts").canServeMenu;
  const request=(mode,extra={},version=0)=>f.call("adminAccess","PATCH",{}, {restaurantId:"shop-b",mode,reason,...extra,expectedVersion:version});
  assert.equal(await canServeMenu("owner-b","shop-b"),true);
  const grant=await request("grant",{plan:"profissional",durationDays:30});
  assert.equal(grant.status,200,await grant.clone().text());const granted=await grant.json();
  assert.equal(granted.access.plan,"profissional");assert.equal(granted.access.mode,"grant");assert.equal(granted.access.version,1);
  assert.equal(await canServeMenu("owner-b","shop-b"),true);
  assert.equal((await request("suspended",{},0)).status,409);
  const suspended=await request("suspended",{},1);
  assert.equal(suspended.status,200,await suspended.clone().text());
  assert.equal((await suspended.json()).access.mode,"suspended");
  assert.equal(await canServeMenu("owner-b","shop-b"),false);
  assert.equal((await f.call("create","POST",{slug:"pizzaria-b"},f.input())).status,404);
  assert.equal((await request("normal",{},2)).status,200);
  assert.equal(await canServeMenu("owner-b","shop-b"),true);
  const rows=f.db.prepare("SELECT action,plan,reason FROM account_access_events WHERE owner_id='owner-b' ORDER BY created_at").all();
  assert.equal(rows.length,3);assert.equal(rows[0].reason,reason);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM subscriptions").get().n,0);
 }finally{f.close();}
});
test("other owners and even an administrator cannot change their own privileged account",async()=>{
 const f=fixture();f.env.PLATFORM_ADMIN_ACCOUNT_ID="owner-a";
 try{
  const input={restaurantId:"shop-a",mode:"suspended",reason,expectedVersion:0};
  assert.equal((await f.call("adminAccess","PATCH",{},input)).status,403);
  f.state.user={userId:"owner-b",displayName:"Owner B",email:"b@example.test",provider:"chatgpt",loginMethod:"internal"};
  assert.equal((await f.call("adminAccess","PATCH",{},{...input,restaurantId:"shop-b"})).status,403);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM account_access").get().n,0);
 }finally{f.close();}
});
