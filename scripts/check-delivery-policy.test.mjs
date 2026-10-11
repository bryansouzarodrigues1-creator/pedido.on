import test from "node:test";import assert from "node:assert/strict";
import {deliveryCheckRequest,canUseDeliveryCheck,normalizedDeliveryPhone,sameDeliveryContact} from "../lib/delivery-policy.ts";
const valid={requestId:"a1a1a1a1-1111-4111-8111-111111111111",token:"a".repeat(64),phone:"(21) 99999-9999",address:"Rua das Flores, 22 - Centro"};
test("delivery pre-approval collects meaningful address and phone, with optional precise location",()=>{
 assert.equal(deliveryCheckRequest.safeParse(valid).success,true);
 assert.equal(deliveryCheckRequest.safeParse({...valid,latitude:-22.9,longitude:-43.2}).success,true);
 for(const patch of [{phone:"invalid"},{address:"Rua"},{latitude:88},{latitude:91,longitude:0},{longitude:-181,latitude:0},{token:"bad"},{unexpected:"data"}])assert.equal(deliveryCheckRequest.safeParse({...valid,...patch}).success,false);
});
test("only approved and non-expired checks can unlock delivery, never unreviewed or rejected",()=>{
 const time=1000;for(const status of ["pending","rejected"])assert.equal(canUseDeliveryCheck({status,expiresAt:99999},time),false);
 assert.equal(canUseDeliveryCheck({status:"approved",expiresAt:1001},time),true);
 assert.equal(canUseDeliveryCheck({status:"approved",expiresAt:1000},time),false);
 assert.equal(canUseDeliveryCheck(null,time),false);
});
test("approved phone and address cannot be silently changed at checkout",()=>{
 assert.equal(normalizedDeliveryPhone("(21) 99999-9999"),"5521999999999");
 assert.equal(sameDeliveryContact(valid,{phone:"21999999999",address:" RUA das Flores, 22 - Centro "}),true);
 assert.equal(sameDeliveryContact(valid,{phone:"11999999999",address:valid.address}),false);
 assert.equal(sameDeliveryContact(valid,{phone:valid.phone,address:"Outra rua, 25"}),false);
});
