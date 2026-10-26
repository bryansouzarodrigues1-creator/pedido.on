import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveWhatsappWindow} from '../lib/whatsapp-handoff.ts';
const url='https://wa.me/5511999999999?text=Pedido%20QA';
test('WhatsApp uses a separate window, removes its opener and leaves the menu untouched',()=>{
 const paths=[],opened=[];let closes=0;const tab={opener:{},closed:false,location:{replace:value=>paths.push(value)},close:()=>closes++};const handoff=reserveWhatsappWindow({open:(...args)=>{opened.push(args);return tab;}});
 assert.deepEqual(opened,[['about:blank','_blank']]);assert.equal(tab.opener,null);assert.equal(handoff.open(url),true);handoff.cancel();assert.deepEqual(paths,[url]);assert.equal(closes,0);
});
test('blocked popup uses the explicit link fallback and never navigates the original page',()=>{
 for(const browser of [{open:()=>null},{open:()=>{throw Error('blocked');}}]){const handoff=reserveWhatsappWindow(browser);assert.equal(handoff.open(url),false);assert.doesNotThrow(()=>handoff.cancel());}
});
test('failure closes the reserved tab and foreign URLs cannot use it',()=>{
 let closes=0,navigations=0;const browser={open:()=>({opener:{},closed:false,location:{replace:()=>navigations++},close:()=>closes++})};const failed=reserveWhatsappWindow(browser);failed.cancel();assert.equal(closes,1);
 for(const bad of ['https://evil.test/','https://wa.me.evil.test/5511999999999?text=x','javascript:alert(1)'])assert.equal(reserveWhatsappWindow(browser).open(bad),false);assert.equal(navigations,0);assert.equal(closes,4);
});
