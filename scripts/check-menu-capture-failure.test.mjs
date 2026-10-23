import test from 'node:test';
import assert from 'node:assert/strict';
import {captureFailureReport,failureForAssistance,ownerFailureMessage,savedFailure} from '../lib/menu-capture-failure.ts';
const url='https://www.ifood.com.br/delivery/cidade-rj/pizzaria/123e4567-e89b-42d3-a456-426614174000';
const report=()=>({
 format:'pizzaria-on-capture-report-v1',checkedAt:'2026-10-23T11:41:13.988Z',
 sourceUrl:url,storeId:'123e4567-e89b-42d3-a456-426614174000',
 outcome:'blocked',documentStatus:403,stopReason:'http_403',
 itemCount:0,exportableCount:0,pendingCount:0,pizzaSizesPending:0,
 scrolls:0,blockedRequests:0,truncated:false,completeness:'unverified',partial:true,elapsedMs:551
});
test('a blocked capture produces only a bounded failure marker for the exact store',()=>{
 const marker=failureForAssistance(report(),url);
 assert.deepEqual(savedFailure.parse(marker),{kind:'ifood-capture-failure-v1',reason:'http_403'});
 assert.match(ownerFailureMessage(marker.reason),/403/);
 assert.doesNotMatch(JSON.stringify(marker),/sourceUrl|phone|session|product/);
 assert.throws(()=>failureForAssistance(report(),url.replace('4000','4001')),/outra loja/);
});
test('real 403 report cannot be turned into a menu, success, another store or contradictory status',()=>{
 for(const patch of [
  {outcome:'captured_for_review'},{outcome:'empty'},{itemCount:2},{exportableCount:1},
  {documentStatus:200},{stopReason:'http_429'}, {storeId:'223e4567-e89b-42d3-a456-426614174000'},
  {sourceUrl:'https://example.com/evil'},{foo:'extra'}
 ])assert.throws(()=>failureForAssistance({...report(),...patch},url));
 assert.equal(captureFailureReport.safeParse(report()).success,true);
});
