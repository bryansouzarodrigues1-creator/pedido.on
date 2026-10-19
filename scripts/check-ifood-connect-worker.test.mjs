// Real workerd + D1, provider transport synthetic; no production credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {officialTransport,storeUrl} from './ifood-official-fixture.mjs';
const require=createRequire(import.meta.url),{Miniflare}=require(require.resolve('miniflare',{paths:[require.resolve('wrangler')]})),esbuild=require(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
test('workerd completes the distributed grant with same-browser state and no persistent provider tokens',async()=>{
 const built=await esbuild.build({stdin:{contents:"import {GET,POST} from './app/api/ifood/import/route.ts';export default {fetch:r=>r.method==='GET'?GET(r):POST(r)};",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'neutral',external:['cloudflare:workers']}),calls=[],transport=officialTransport(calls);
 const mf=new Miniflare({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-05-15',d1Databases:{DB:'ifood-official-local'},bindings:{AUTH_SESSION_KEY:'ab'.repeat(32),IFOOD_CLIENT_ID:'synthetic-client-id',IFOOD_CLIENT_SECRET:'synthetic-client-secret',PEDIDO_IFOOD_ENABLED:'true'},outboundService:async request=>{
  assert.equal(request.headers.has('cookie'),false);assert.equal(request.headers.has('x-pedido-csrf'),false);return transport(request.url,{method:request.method,headers:Object.fromEntries(request.headers),body:request.method==='POST'?await request.text():undefined});
 }});let cookie='__Host-pedido-csrf='+'ac'.repeat(32);
 const call=async(body,extra={})=>{const response=await mf.dispatchFetch('https://pizza.test/api/ifood/import',{method:body?'POST':'GET',headers:{Origin:'https://pizza.test',cookie,'x-pedido-csrf':'ac'.repeat(32),...(body?{'content-type':'application/json'}:{}),...extra},body:body?JSON.stringify(body.action==='complete'?{url:storeUrl,...body}:body):undefined});const set=response.headers.get('set-cookie');if(set)cookie='__Host-pedido-csrf='+'ac'.repeat(32)+'; '+set.split(';')[0];return response;};
 try{const db=await mf.getD1Database('DB');await db.exec('CREATE TABLE rate_buckets(id TEXT PRIMARY KEY,hits INTEGER NOT NULL,expires_at INTEGER NOT NULL)');
  assert.equal((await call({action:'start',url:storeUrl},{Origin:'https://evil.example'})).status,403);assert.equal(calls.length,0);
  let response=await call({action:'start',url:storeUrl});assert.equal(response.status,200,await response.clone().text());assert.match(response.headers.get('set-cookie'),/HttpOnly.*Secure/);assert.equal((await response.json()).pending.userCode,'HJLX-LPSQ');
  const cookieBefore=cookie;cookie=cookie.slice(0,-2)+'ee';assert.equal((await call({action:'complete',authorizationCode:'test-code'})).status,409);assert.equal(calls.length,1);cookie=cookieBefore;
  response=await call({action:'complete',authorizationCode:'test-code'});assert.equal(response.status,200,await response.clone().text());const result=await response.json();assert.equal(result.count,3);assert.equal(result.store.name,'Forno Azul de Teste');assert.doesNotMatch(JSON.stringify(result),/private\.access|secret|verifier/);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
  assert.equal((await (await call()).json()).pending,undefined);assert.equal((await db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'sqlite_%'").first()).n,1);
 }finally{await mf.dispose();}
});
