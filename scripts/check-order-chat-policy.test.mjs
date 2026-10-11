import test from "node:test";
import assert from "node:assert/strict";
import {chatInput,chatClosed,CHAT_LIMIT,CHAT_POLL_MS} from "../lib/order-chat-policy.ts";
test("chat rejects empty, oversized or unexpected input",()=>{
 assert.equal(chatInput.safeParse({text:" Bom dia "}).data.text,"Bom dia");
 for(const x of [{text:""},{text:"a".repeat(1001)},{text:"oi",sender:"restaurant"},{text:12}])assert.equal(chatInput.safeParse(x).success,false);
});
test("closed orders cannot get more messages and polling is bounded",()=>{
 assert.equal(chatClosed("delivered"),true);
 assert.equal(chatClosed("canceled"),true);
 assert.equal(chatClosed("awaiting_payment"),false);
 assert.equal(CHAT_LIMIT,100);
 assert.ok(CHAT_POLL_MS>=5000);
});
