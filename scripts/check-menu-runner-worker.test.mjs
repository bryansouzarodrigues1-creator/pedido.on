import test from 'node:test';
import assert from 'node:assert/strict';
import {assistanceRuntime,requestBody,capture,shopA,store} from './menu-assistance-worker-fixture.mjs';
import {runnerResultFromCapture} from './menu-runner-result-fixture.mjs';
const route='/api/admin/menu-import-results';
const deliver=(f,id,result=runnerResultFromCapture(capture()),extra={})=>f.call(route,{method:'POST',actor:'owner-admin',body:{requestId:id,result,reviewed:true},...extra});
async function requested(f){const r=await f.owner('POST',requestBody());assert.equal(r.status,201);return (await r.json()).request.id;}

test('admin can deliver a runner result to the requested shop while its drafts and publication stay intact',async()=>{
 const f=await assistanceRuntime();try{
  const before=(await f.db.prepare('SELECT * FROM restaurants ORDER BY id').all()).results,id=await requested(f),data=capture();
  data.items.push({...data.items[1],id:'pending',name:'Preço pendente',priceCents:null,rawPrice:'A partir de R$ 8,00',needsReview:true,selected:false});
  const response=await deliver(f,id,runnerResultFromCapture(data));assert.equal(response.status,200,await response.clone().text());
  const body=await response.json();assert.equal(body.stats.total,3);assert.equal(body.stats.pending,1);assert.equal(body.stats.uploadedPhotos,0);
  const owner=(await (await f.owner()).json()).request;assert.equal(owner.status,'received');assert.equal(owner.capture.items.length,3);
  assert.equal(owner.capture.items[0].sizeChoice,null);assert.equal(owner.capture.items[2].selected,false);
  assert.deepEqual((await f.db.prepare('SELECT * FROM restaurants ORDER BY id').all()).results,before);
  assert.equal((await deliver(f,id)).status,409);assert.equal((await f.db.prepare('SELECT pairing_hash FROM menu_import_assistance WHERE id=?').bind(id).first()).pairing_hash,null);
 }finally{await f.close();}
});
test('runner delivery requires platform admin, same origin, CSRF, explicit review and an existing active request',async()=>{
 const f=await assistanceRuntime();try{
  const id=await requested(f);
  for(const [actor,status] of [['',401],['owner-a',403],['owner-b',403]])assert.equal((await deliver(f,id,undefined,{actor})).status,status);
  assert.equal((await deliver(f,id,undefined,{headers:{'x-pedido-csrf':''}})).status,403);
  assert.equal((await deliver(f,id,undefined,{headers:{origin:'https://other.test'}})).status,403);
  assert.equal((await deliver(f,id,undefined,{body:{requestId:id,result:runnerResultFromCapture(capture()),reviewed:false}})).status,400);
  assert.equal((await deliver(f,'99999999-9999-4999-8999-999999999999')).status,404);
  assert.equal((await f.db.prepare('SELECT status FROM menu_import_assistance WHERE id=?').bind(id).first()).status,'requested');
 }finally{await f.close();}
});
test('blocked, malformed, wrong-store and oversized results never consume a live pairing code',async()=>{
 const f=await assistanceRuntime();try{
  const id=await requested(f),code=await f.pair(id),wrong=capture();wrong.sourceUrl=store.replace(/000$/,'001');
  assert.equal((await deliver(f,id,runnerResultFromCapture(wrong))).status,409);
  const blocked=runnerResultFromCapture(capture());blocked.report.outcome='blocked';blocked.report.documentStatus=403;
  assert.equal((await deliver(f,id,blocked)).status,400);
  const bad=runnerResultFromCapture(capture());bad.capture.categories[0].items[0].imageMediaUrl='/media/'+shopA+'/forged.png';
  assert.equal((await deliver(f,id,bad)).status,400);
  const huge=runnerResultFromCapture(capture());huge.capture.storeName='x'.repeat(710000);
  assert.equal((await deliver(f,id,huge)).status,413);
  assert.equal((await f.db.prepare('SELECT status FROM menu_import_assistance WHERE id=?').bind(id).first()).status,'paired');
  assert.equal((await f.extension('/api/menu-import-deliveries',code,capture())).status,200);
 }finally{await f.close();}
});
test('runner delivery preserves only matching stored photos and invalidates the old extension code',async()=>{
 const f=await assistanceRuntime();try{
  const id=await requested(f),code=await f.pair(id),photo=await f.photo(code);assert.equal(photo.status,201);const url=(await photo.json()).url;
  const response=await deliver(f,id);assert.equal(response.status,200);assert.equal((await response.json()).stats.uploadedPhotos,1);
  assert.equal((await (await f.owner()).json()).request.capture.items[0].imageMediaUrl,url);
  assert.equal((await f.extension('/api/menu-import-deliveries',code,capture())).status,401);
  assert.equal((await f.photo(code,{itemId:'late'})).status,401);
 }finally{await f.close();}
});
test('two operators or an operator and extension can deliver at most once; cancelled requests stay cancelled',async()=>{
 for(const competitor of ['admin','extension','cancelled']){
  const f=await assistanceRuntime();try{
   const id=await requested(f),code=await f.pair(id);
   if(competitor==='cancelled'){assert.equal((await f.owner('DELETE')).status,200);assert.equal((await deliver(f,id)).status,409);}
   else {const responses=await Promise.all([deliver(f,id),competitor==='admin'?deliver(f,id):f.extension('/api/menu-import-deliveries',code,capture())]);
    assert.equal(responses.filter(r=>r.status===200).length,1);assert.ok(responses.every(r=>[200,401,409].includes(r.status)));}
  }finally{await f.close();}
 }
});
test('an in-flight photo cannot attach after an administrator receives the runner result',async()=>{
 let reached,release,timeout;const entered=new Promise(resolve=>{reached=resolve;}),gate=new Promise(resolve=>{release=resolve;});
 const f=await assistanceRuntime({pauseUploads:true,outbound:async request=>{assert.equal(request.url,'https://upload-barrier.example.test/');reached();await gate;return new Response('released');}});
 try{const id=await requested(f),code=await f.pair(id),upload=f.photo(code);
  await Promise.race([entered,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Upload did not reach barrier')),10000);})]);clearTimeout(timeout);
  assert.equal((await deliver(f,id)).status,200);release();assert.equal((await upload).status,401);
  assert.equal((await f.bucket.list()).objects.length,0);assert.equal((await (await f.owner()).json()).request.stats.uploadedPhotos,0);
 }finally{clearTimeout(timeout);release();await f.close();}
});
