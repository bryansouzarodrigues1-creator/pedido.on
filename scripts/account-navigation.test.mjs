import test from 'node:test';
import assert from 'node:assert/strict';
import {accountNavigation,readAccountNavigation} from '../lib/account-navigation.ts';

test('public navigation uses the current server account, no cached email/password or local login flag',async()=>{
 const requests=[];const fetcher=async(url,options)=>{requests.push({url,options});return Response.json({user:{name:'Dono fictício',email:'ficticio@example.test',provider:'supabase'}});};
 const state=await readAccountNavigation(undefined,fetcher);assert.equal(state,'account');assert.deepEqual(accountNavigation(state),{href:'/app',label:'Meu painel',brandHref:'/app'});
 assert.equal(requests.length,1);assert.equal(requests[0].url,'/api/auth/session');assert.equal(requests[0].options.cache,'no-store');assert.equal(requests[0].options.credentials,'same-origin');assert.ok(requests[0].options.signal);assert.equal(requests[0].options.body,undefined);
});
test('only an explicit anonymous session shows Entrar; malformed or unavailable responses do not simulate logout',async()=>{
 assert.equal(await readAccountNavigation(undefined,async()=>Response.json({user:null})),'guest');
 for(const fetcher of [async()=>new Response('gateway indisponível',{status:503}),async()=>new Response('<html>erro</html>'),async()=>Response.json({}),async()=>Response.json({user:{}}),async()=>{throw Error('offline');}]){
  const state=await readAccountNavigation(undefined,fetcher);assert.equal(state,'unavailable');assert.equal(accountNavigation(state).href,'/app');assert.notEqual(accountNavigation(state).label,'Entrar');
 }
 assert.deepEqual(accountNavigation('guest'),{href:'/entrar',label:'Entrar',brandHref:'/'});
});
test('creator and calculator keep their anonymous destinations, while recognized accounts return to the guarded panel',()=>{
 assert.equal(accountNavigation('guest','Já tenho conta').label,'Já tenho conta');
 assert.deepEqual(accountNavigation('guest','Voltar ao início','/'),{href:'/',label:'Voltar ao início',brandHref:'/'});
 for(const state of ['account','checking','unavailable'])assert.equal(accountNavigation(state).href,'/app');
});
test('an aborted public-session read does not issue a new request',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 assert.equal(await readAccountNavigation(controller.signal,async()=>{calls++;return Response.json({user:null});}),'unavailable');assert.equal(calls,0);
});
