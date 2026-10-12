import test from 'node:test';
import assert from 'node:assert/strict';
import {abortable} from '../lib/menu-ocr.ts';

test('cancelling a pending OCR setup step releases the caller instead of awaiting a terminated worker',async()=>{const controller=new AbortController();let released=false;const pending=abortable(new Promise(()=>{}),controller.signal).finally(()=>{released=true;});controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(released,true);});
test('completed OCR steps keep their result and aborted steps do not accept a late result',async()=>{const first=new AbortController();assert.equal(await abortable(Promise.resolve('ready'),first.signal),'ready');first.abort();const second=new AbortController();let finish;const pending=abortable(new Promise(resolve=>{finish=resolve;}),second.signal);second.abort();finish('late');await assert.rejects(pending,{name:'AbortError'});});
