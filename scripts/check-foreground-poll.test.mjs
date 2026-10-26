import test from 'node:test';
import assert from 'node:assert/strict';
import {startForegroundPoll} from '../lib/foreground-poll.ts';
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function environment(){return {window:new EventTarget(),document:Object.assign(new EventTarget(),{visibilityState:'visible'}),navigator:{onLine:true}};}
test('background aborts a pending read; resume coalesces lifecycle events and never overlaps reads',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1000});const env=environment(),reads=[];let resolve;
 const stop=startForegroundPoll(signal=>{reads.push(signal);return new Promise(done=>{resolve=done;});},8000,env);
 assert.equal(reads.length,1);env.document.visibilityState='hidden';env.document.dispatchEvent(new Event('visibilitychange'));assert.equal(reads[0].aborted,true);
 env.document.visibilityState='visible';env.document.dispatchEvent(new Event('resume'));env.window.dispatchEvent(new Event('pageshow'));assert.equal(reads.length,1);
 resolve();await settle();assert.equal(reads.length,2);env.window.dispatchEvent(new Event('focus'));env.document.dispatchEvent(new Event('visibilitychange'));assert.equal(reads.length,2);
 resolve();await settle();stop();t.mock.timers.tick(9000);await settle();assert.equal(reads.length,2);
});
test('quick hide/show still restarts polling after a completed read',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1000});const env=environment();let reads=0;const stop=startForegroundPoll(async()=>{reads++;},8000,env);await settle();
 env.document.visibilityState='hidden';env.document.dispatchEvent(new Event('visibilitychange'));env.document.visibilityState='visible';env.document.dispatchEvent(new Event('visibilitychange'));t.mock.timers.tick(501);await settle();assert.equal(reads,2);stop();
});
test('offline and frozen screens issue no reads; reconnect refreshes without waiting for the normal interval',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1000});const env=environment();env.navigator.onLine=false;let reads=0;const stop=startForegroundPoll(async()=>{reads++;},45000,env);assert.equal(reads,0);
 env.navigator.onLine=true;env.window.dispatchEvent(new Event('online'));await settle();assert.equal(reads,1);env.document.visibilityState='hidden';env.document.dispatchEvent(new Event('freeze'));t.mock.timers.tick(60000);await settle();assert.equal(reads,1);
 env.document.visibilityState='visible';env.window.dispatchEvent(new Event('pageshow'));await settle();assert.equal(reads,2);stop();
});
test('a stuck read gets a deadline and a failed read does not stop future refreshes',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1000});const env=environment(),signals=[];const stop=startForegroundPoll(signal=>{signals.push(signal);return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));},8000,env);
 t.mock.timers.tick(20001);await settle();assert.equal(signals[0].reason.name,'TimeoutError');t.mock.timers.tick(8000);await settle();assert.equal(signals.length,2);stop();await settle();assert.equal(signals[1].aborted,true);
});
