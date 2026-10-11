import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {Miniflare}=require(require.resolve('miniflare',{paths:[require.resolve('wrangler')]}));
const ts=require('typescript');
const provider=ts.transpileModule(readFileSync(new URL('../lib/ai-provider.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const endpoint='https://pedido-on-estudio.lovable.app/api/pedido-on/image';
const script=provider+`\nexport default {async fetch(){const response=await requestAiProvider(${JSON.stringify(endpoint)},{jobId:'test-job',token:'one-use-capability'});return new Response(await response.text(),{status:response.status});}}`;
test('real Workers runtime sends the capability once and returns image bytes',async()=>{
 let calls=0;
 const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-05-15',outboundService:async request=>{calls++;assert.equal(request.url,endpoint);assert.equal(request.method,'POST');assert.deepEqual(await request.json(),{jobId:'test-job',token:'one-use-capability'});return new Response('image bytes');}});
 try{const response=await mf.dispatchFetch('http://internal/');assert.equal(response.status,200);assert.equal(await response.text(),'image bytes');assert.equal(calls,1);}finally{await mf.dispose();}
});
test('real Workers runtime does not forward capability tokens to redirects',async()=>{
 let calls=0;
 const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-05-15',outboundService:async request=>{calls++;assert.equal(request.url,endpoint);return new Response(null,{status:307,headers:{Location:'https://other.example/collect'}});}});
 try{const response=await mf.dispatchFetch('http://internal/');assert.equal(response.status,307);assert.equal(calls,1);}finally{await mf.dispose();}
});
