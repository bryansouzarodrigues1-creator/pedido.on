import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {handleStudio} from '../services/image-service/src/lib/pedido-studio.server.ts';
import {handleGenerate} from '../services/image-service/src/lib/pedido-image.server.ts';

const require=createRequire(import.meta.url);
const {Miniflare}=require(require.resolve('miniflare',{paths:[require.resolve('wrangler')]}));
const ts=require('typescript');
const job={jobId:'3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e',token:'a'.repeat(64)};
const proposal={reply:'Confira a prévia.',theme:'dark',accent:'#dc3828',productDescriptions:[]};
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64'));
const routes={
 studio:{claim:'https://forno-cardapios.waves4845.chatgpt.site/api/ai/studio/claim',gateway:'https://ai.gateway.lovable.dev/v1/chat/completions',handler:handleStudio,claimBody:{protocol:'pedido-studio-v1',prompt:'{"brand":{"name":"Pizzaria de teste"},"message":"Visual escuro e vermelho."}'},modelBody:{choices:[{finish_reason:'stop',message:{content:JSON.stringify(proposal)}}]}},
 image:{claim:'https://forno-cardapios.waves4845.chatgpt.site/api/ai/images/claim',gateway:'https://ai.gateway.lovable.dev/v1/images/generations',handler:handleGenerate,claimBody:{protocol:'pedido-image-v1',prompt:'Pizza com molho de tomate e mozzarella.',asset:'cover',ratio:'16:9'},modelBody:{data:[{b64_json:Buffer.from(png).toString('base64')}]}}
};
function moduleFile(name){
 const source=readFileSync(new URL('../services/image-service/src/lib/'+name+'.ts',import.meta.url),'utf8').replace('./pedido-image.server.ts','./pedido-image.server.mjs');
 return {type:'ESModule',path:name+'.mjs',contents:ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText};
}
function runtime(outboundService){
 return new Miniflare({compatibilityDate:'2026-05-15',modules:[{type:'ESModule',path:'index.mjs',contents:`import {handleStudio} from './pedido-studio.server.mjs';import {handleGenerate} from './pedido-image.server.mjs';export default {fetch(request){return new URL(request.url).pathname==='/studio'?handleStudio(request,{fetch,apiKey:'mock-key'}):handleGenerate(request,{fetch,apiKey:'mock-key'});}};`},moduleFile('pedido-image.server'),moduleFile('pedido-studio.server')],outboundService});
}
const request=kind=>new Request('http://internal/'+kind,{method:'POST',body:JSON.stringify(job)});
const dispatch=(mf,kind)=>mf.dispatchFetch('http://internal/'+kind,{method:'POST',body:JSON.stringify(job)});

test('Lovable handlers complete their single-use claim and model request in workerd',async()=>{
 let active,calls=[];
 const mf=runtime(async req=>{
  calls.push(req.url);const body=await req.json();
  if(req.url===active.claim){assert.deepEqual(body,job);assert.equal(req.headers.get('authorization'),null);return Response.json(active.claimBody);}
  assert.equal(req.url,active.gateway);assert.equal(req.headers.get('authorization'),'Bearer mock-key');assert.equal(JSON.stringify(body).includes(job.token),false);
  return Response.json(active.modelBody);
 });
 try{for(const [kind,route] of Object.entries(routes)){
  active=route;calls=[];const res=await dispatch(mf,kind);assert.equal(res.status,200,await res.clone().text());assert.deepEqual(calls,[route.claim,route.gateway]);
  if(kind==='studio')assert.deepEqual(await res.json(),proposal);else{assert.equal(res.headers.get('content-type'),'image/png');assert.deepEqual(new Uint8Array(await res.arrayBuffer()),png);}
 }}finally{await mf.dispose();}
});

test('Lovable workerd refuses callback and gateway redirects without forwarding secrets',async()=>{
 let active,redirectPhase,calls=[];
 const mf=runtime(async req=>{
  calls.push(req.url);
  assert.ok(req.url===active.claim||req.url===active.gateway,'Unexpected token/key forwarding');
  if((redirectPhase==='claim'&&req.url===active.claim)||(redirectPhase==='gateway'&&req.url===active.gateway))return new Response(null,{status:307,headers:{Location:'https://other.example/collect'}});
  return Response.json(active.claimBody);
 });
 try{for(const [kind,route] of Object.entries(routes)){active=route;for(const phase of ['claim','gateway']){
  redirectPhase=phase;calls=[];const res=await dispatch(mf,kind);assert.equal(res.status,phase==='claim'?401:502);assert.deepEqual(calls,phase==='claim'?[route.claim]:[route.claim,route.gateway]);assert.equal((await res.text()).includes(job.token),false);
 }}}finally{await mf.dispose();}
});

test('Lovable workerd denies expired or replayed capabilities with zero model requests',async()=>{
 let active,status,calls=[];
 const mf=runtime(async req=>{calls.push(req.url);assert.equal(req.url,active.claim);return Response.json({error:'denied'},{status});});
 try{for(const [kind,route] of Object.entries(routes)){active=route;for(const denied of [401,409]){
  status=denied;calls=[];const res=await dispatch(mf,kind);assert.equal(res.status,denied);assert.deepEqual(calls,[route.claim]);
 }}}finally{await mf.dispose();}
});

test('Lovable never retries a rejected paid request or accepts a redirection on Node',async()=>{
 for(const [kind,route] of Object.entries(routes))for(const scenario of ['claim-redirect','gateway-redirect',402,429,500]){
  const calls=[];const outbound=async(url,init)=>{
   calls.push(url);assert.equal(init.redirect,'manual');
   if(url===route.claim)return scenario==='claim-redirect'?new Response(null,{status:302,headers:{Location:'https://other.example/collect'}}):Response.json(route.claimBody);
   assert.equal(url,route.gateway);return scenario==='gateway-redirect'?new Response(null,{status:302,headers:{Location:'https://other.example/collect'}}):new Response('private provider response',{status:scenario});
  };
  const res=await route.handler(request(kind),{fetch:outbound,apiKey:'mock-key'});
  assert.equal(res.status,scenario==='claim-redirect'?401:scenario===402||scenario===429?scenario:502);assert.equal(calls.length,scenario==='claim-redirect'?1:2);assert.equal((await res.text()).includes('private provider response'),false);
 }
});
