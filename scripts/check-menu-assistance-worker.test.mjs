import test from 'node:test';
import assert from 'node:assert/strict';
import {readMenuPages} from '../lib/menu-reader-policy.ts';
import {applyReaderItems,prepareReaderItems} from '../lib/menu-reader-policy.ts';
import {assistanceToReaderText} from '../lib/menu-assistance-policy.ts';
import {sha256,sealTokens} from '../lib/auth-policy.ts';
import {buildAssistanceReview,assistanceReadingState} from '../lib/menu-assistance-review.ts';
import {defaultRestaurant} from '../lib/domain.ts';
import {assistanceRuntime,requestBody,capture,shopA,shopB,store} from './menu-assistance-worker-fixture.mjs';

test('long assisted catalog keeps every approved product and its description for owner review',()=>{
 const data=capture();data.items=Array.from({length:200},(_,i)=>({...data.items[1],id:'item-'+i,name:'Bebida de teste '+i,description:'Descrição original '.repeat(30)}));
 const text=assistanceToReaderText(data),read=readMenuPages([{id:'assisted',lines:text.split('\n').map(text=>({text}))}]);
 assert.equal(read.items.length,200);assert.equal(read.items.at(-1).name,'Bebida de teste 199');
 assert.match(read.items.at(-1).description,/Descrição original/);
});

test('one request flows through owner, admin, scoped photos, one-use delivery and an explicitly saved draft',async()=>{
 const f=await assistanceRuntime({support:'(22) 99999-8888'});try{
  const before=await f.db.prepare('SELECT * FROM restaurants ORDER BY id').all();
  let r=await f.owner('POST',requestBody());assert.equal(r.status,201,await r.clone().text());const info=(await r.json()).request;
  assert.equal(info.contactWhatsApp,'5522999998888');
  r=await f.call('/api/admin/menu-import-assistance',{actor:'owner-admin'});const q=(await r.json()).requests;assert.equal(q.length,1);assert.equal(q[0].id,info.id);
  const code=await f.pair(info.id),stored=await f.db.prepare('SELECT * FROM menu_import_assistance WHERE id=?').bind(info.id).first();
  assert.notEqual(stored.pairing_hash,code.split('.')[1]);
  r=await f.photo(code);assert.equal(r.status,201,await r.clone().text());const image=(await r.json()).url;assert.ok(image.startsWith('/media/'+shopA+'/'));
  assert.equal((await f.photo(code)).status,200);
  const incoming=capture();incoming.items[1].imageMediaUrl='/media/'+shopB+'/forged.png';
  r=await f.extension('/api/menu-import-deliveries',code,incoming);assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).stats.uploadedPhotos,1);
  assert.equal((await f.extension('/api/menu-import-deliveries',code,incoming)).status,401);
  assert.equal((await f.photo(code,{itemId:'another'})).status,401);
  r=await f.owner();assert.match(r.headers.get('cache-control'),/private.*no-store/);const owner=await r.json();
  assert.equal(owner.supportWhatsApp.number,'5522999998888');assert.equal(owner.request.capture.items[0].imageMediaUrl,image);assert.equal(owner.request.capture.items[1].imageMediaUrl,null);
  assert.deepEqual((await f.db.prepare('SELECT * FROM restaurants ORDER BY id').all()).results,before.results,'Receiving never edits a draft or published menu');
  const row=before.results.find(x=>x.id===shopA),data=JSON.parse(row.data),review=readMenuPages([{id:'received',lines:owner.request.menuText.split('\n').map(text=>({text}))}]);
  review.items.find(i=>i.name==='Margherita').image=image;
  const approved=prepareReaderItems(review.items,data).map(item=>({...item,selected:true}));
  const patch=applyReaderItems(data,approved);r=await f.call('/api/restaurants/'+shopA,{method:'PUT',body:{revision:row.revision,data:{...data,...patch}}});assert.equal(r.status,200,await r.clone().text());
  const after=await f.db.prepare('SELECT * FROM restaurants WHERE id=?').bind(shopA).first();assert.equal(after.published_data,row.published_data);assert.equal(JSON.parse(after.data).products.find(i=>i.name==='Margherita').image,image);
 }finally{await f.close();}
});

test('owner/admin routes enforce consent, CSRF, ownership and private contact visibility',async()=>{
 const f=await assistanceRuntime();try{
  for(const [actor,status] of [['',401],['owner-b',404]])assert.equal((await f.owner('GET',undefined,{actor})).status,status);
  for(const actor of ['', 'owner-a','owner-b'])assert.equal((await f.call('/api/admin/menu-import-assistance',{actor})).status,actor?403:401);
  for(const invalid of [{...requestBody(),contactPermission:false},{...requestBody(),authorized:false},{...requestBody(),contactWhatsApp:'99999-8888'}])assert.equal((await f.owner('POST',invalid)).status,400);
  assert.equal((await f.owner('POST',requestBody(),{headers:{'x-pedido-csrf':''}})).status,403);
  assert.equal((await f.owner('POST',requestBody(),{headers:{origin:'https://other.test'}})).status,403);
  let r=await f.owner('POST',requestBody());assert.equal(r.status,201);const id=(await r.json()).request.id;
  assert.equal((await f.owner('POST',requestBody())).status,409);
  assert.equal((await f.call('/api/admin/menu-import-assistance',{method:'POST',body:{requestId:id},actor:'owner-b'})).status,403);
  assert.equal((await f.owner('DELETE')).status,200);
  const cancelled=await f.db.prepare('SELECT * FROM menu_import_assistance WHERE id=?').bind(id).first();assert.equal(cancelled.contact_whatsapp,'');assert.equal(cancelled.contact_consent_at,'');assert.equal(cancelled.pairing_hash,null);
 }finally{await f.close();}
});

test('concurrent requests for one shop create exactly one active request',async()=>{
 const f=await assistanceRuntime();try{
  const responses=await Promise.all([f.owner('POST',requestBody()),f.owner('POST',requestBody())]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
  assert.equal((await f.db.prepare("SELECT COUNT(*) n FROM menu_import_assistance WHERE status IN ('requested','paired')").first()).n,1);
 }finally{await f.close();}
});

test('extension pairing rejects wrong origin/store, expired, rotated and cancelled codes',async()=>{
 const f=await assistanceRuntime();try{
  let r=await f.owner('POST',requestBody());const id=(await r.json()).request.id,old=await f.pair(id),code=await f.pair(id);
  assert.equal((await f.extension('/api/menu-import-deliveries',old,capture())).status,401);
  assert.equal((await f.extension('/api/menu-import-deliveries',code,capture(),{origin:'https://evil.test'})).status,403);
  const wrong=capture();wrong.sourceUrl=store.replace(/000$/,'001');assert.equal((await f.extension('/api/menu-import-deliveries',code,wrong)).status,409);
  await f.db.prepare('UPDATE menu_import_assistance SET pairing_expires_at=1 WHERE id=?').bind(id).run();assert.equal((await f.extension('/api/menu-import-deliveries',code,capture())).status,401);
  const fresh=await f.pair(id);assert.equal((await f.owner('DELETE')).status,200);assert.equal((await f.photo(fresh)).status,401);assert.equal((await f.extension('/api/menu-import-deliveries',fresh,capture())).status,401);
 }finally{await f.close();}
});

test('received capture opens all products without overflowing free text or replacing a pending reading',()=>{
 const data=capture();data.items=Array.from({length:200},(_,i)=>({...data.items[1],id:'item-'+i,name:'Bebida de teste '+i,description:'Descrição original '.repeat(30)}));
 data.items[0].imageMediaUrl='/media/'+shopA+'/photo.png';
 const review=buildAssistanceReview('123e4567-e89b-42d3-a456-426614174000',data,shopA,defaultRestaurant('QA'));
 assert.equal(review.items.length,200);assert.equal(review.text,store);assert.match(review.items.at(-1).description,/Descrição original/);
 assert.equal(Object.values(review.photoSuggestions)[0],'/media/'+shopA+'/photo.png');
 assert.equal(assistanceReadingState(review,review.assistanceRequestId),'resume');assert.equal(assistanceReadingState(review,'different'),'occupied');
 assert.equal(assistanceReadingState({...review,items:[],assistanceRequestId:undefined},'different'),'new');
});

test('empty approved selection and duplicate capture IDs do not consume a pairing code',async()=>{
 const f=await assistanceRuntime();try{
  const info=(await (await f.owner('POST',requestBody())).json()).request,code=await f.pair(info.id);
  const empty=capture();empty.items.forEach(item=>item.selected=false);
  assert.equal((await f.extension('/api/menu-import-deliveries',code,empty)).status,422);
  const duplicate=capture();duplicate.items[1].id=duplicate.items[0].id;assert.equal((await f.extension('/api/menu-import-deliveries',code,duplicate)).status,400);
  assert.equal((await f.db.prepare('SELECT status FROM menu_import_assistance WHERE id=?').bind(info.id).first()).status,'paired');
  const responses=await Promise.all([f.extension('/api/menu-import-deliveries',code,capture()),f.extension('/api/menu-import-deliveries',code,capture())]);
  assert.equal(responses.filter(r=>r.status===200).length,1);assert.ok(responses.every(r=>[200,401,409].includes(r.status)));
 }finally{await f.close();}
});

test('photo quota and duplicate retries remain atomic and clean up unused R2 objects',async()=>{
 const f=await assistanceRuntime();try{
  const info=(await (await f.owner('POST',requestBody())).json()).request,code=await f.pair(info.id);
  const duplicate=await Promise.all([f.photo(code),f.photo(code)]);assert.deepEqual(duplicate.map(r=>r.status).sort(),[200,201]);
  assert.equal((await f.bucket.list()).objects.length,1);
  const stamp=new Date().toISOString();await f.db.batch(Array.from({length:98},(_,i)=>f.db.prepare('INSERT INTO menu_import_assistance_photos(id,request_id,item_id,source_url,media_url,size_bytes,created_at) VALUES(?,?,?,?,?,?,?)').bind('seed-'+i,info.id,'seed-'+i,'https://static-images.ifood.com.br/'+i+'.png','/media/'+shopA+'/seed-'+i+'.png',100,stamp)));
  const responses=await Promise.all([f.photo(code,{itemId:'last-a'}),f.photo(code,{itemId:'last-b'})]);assert.deepEqual(responses.map(r=>r.status).sort(),[201,429]);
  assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM menu_import_assistance_photos WHERE request_id=?').bind(info.id).first()).n,100);
  assert.equal((await f.bucket.list()).objects.length,2,'Only the two actual successful uploads remain in R2');
 }finally{await f.close();}
});

test('an upload paused after authorization cannot finish after cancellation or delivery',async()=>{
 for(const action of ['cancel','deliver']){
  let reached,release,timeout;const entered=new Promise(resolve=>{reached=resolve;}),gate=new Promise(resolve=>{release=resolve;});
  const f=await assistanceRuntime({pauseUploads:true,outbound:async request=>{assert.equal(request.url,'https://upload-barrier.example.test/');reached();await gate;return new Response('released');}});
  try{
   const info=(await (await f.owner('POST',requestBody())).json()).request,code=await f.pair(info.id),upload=f.photo(code);
   await Promise.race([entered,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('The isolated upload did not reach its test barrier')),10000);})]);clearTimeout(timeout);
   const response=action==='cancel'?await f.owner('DELETE'):await f.extension('/api/menu-import-deliveries',code,capture());assert.equal(response.status,200);
   release();assert.equal((await upload).status,401);assert.equal((await f.bucket.list()).objects.length,0);
   assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM menu_import_assistance_photos').first()).n,0);
  }finally{clearTimeout(timeout);release();await f.close();}
 }
});

test('migration 0016 preserves existing restaurant, account and session records',async()=>{
 const f=await assistanceRuntime({migrate:false});try{
  await f.db.prepare('INSERT INTO account_profiles(owner_id,name,email,provider,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind('owner-a','Local test','test@example.test','chatgpt','2026-10-20','2026-10-20').run();
  await f.db.prepare('INSERT INTO auth_sessions(id,owner_id,email,display_name,scope,sealed_tokens,token_expires_at,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind('synthetic-session','owner-a','test@example.test','QA','account','synthetic-sentinel',2000000000,2000000000,'2026-10-20').run();
  const names=(await f.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").all()).results.map(r=>r.name);
  const snapshot=async()=>{const rows={};for(const name of names)rows[name]=(await f.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()).results;return rows;};
  const before=await snapshot();await f.migration('0016_owner_ifood_assistance.sql');assert.deepEqual(await snapshot(),before);assert.equal((await f.owner()).status,200);
 }finally{await f.close();}
});

test('configured eight-digit support contact survives the real worker response unchanged',async()=>{
 const f=await assistanceRuntime({support:'+55 (22) 9888-7777'});
 try{
  const response=await f.owner();assert.equal(response.status,200);
  assert.deepEqual((await response.json()).supportWhatsApp,{number:'552298887777',display:'+55 (22) 9888-7777'});
 }finally{await f.close();}
});

test('support contact is absent for missing or malformed configuration',async()=>{
 for(const support of ['', 'not-a-phone']){const f=await assistanceRuntime({support});try{const response=await f.owner();assert.equal(response.status,200);assert.equal((await response.json()).supportWhatsApp,null);}finally{await f.close();}}
});

test('menu-ready push reaches only the consenting owner; external push transport is simulated',async()=>{
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),jwk=await crypto.subtle.exportKey('jwk',keys.privateKey),publicKey=Buffer.from(await crypto.subtle.exportKey('raw',keys.publicKey)).toString('base64url');
 const receiver=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']),subscription={endpoint:'https://fcm.googleapis.com/fcm/send/isolated-menu-test',expirationTime:null,keys:{p256dh:Buffer.from(await crypto.subtle.exportKey('raw',receiver.publicKey)).toString('base64url'),auth:Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url')}};
 let deliveries=0;const f=await assistanceRuntime({push:{PEDIDO_PUSH_ENABLED:'true',PEDIDO_VAPID_PUBLIC_KEY:publicKey,PEDIDO_VAPID_PRIVATE_KEY:jwk.d,PEDIDO_VAPID_SUBJECT:'https://local.test'},outbound:async request=>{assert.equal(request.url,subscription.endpoint);assert.equal(request.headers.get('content-encoding'),'aes128gcm');deliveries++;return new Response(null,{status:201});}});
 try{
  const endpoint=await sha256(subscription.endpoint),now=Math.floor(Date.now()/1000),stamp=new Date().toISOString();
  await f.db.prepare('INSERT INTO push_subscriptions(id,owner_id,endpoint_hash,sealed_subscription,session_id,public_key_hash,orders,messages,delivery,expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,0,0,0,?,?,?)').bind('synthetic-device','owner-a',endpoint,await sealTokens(subscription,'ab'.repeat(32),'push:'+endpoint+':owner-a'),null,await sha256(publicKey),now+3600,stamp,stamp).run();
  const info=(await (await f.owner('POST',{...requestBody(),notifyWhenReady:true})).json()).request,code=await f.pair(info.id);
  const response=await f.extension('/api/menu-import-deliveries',code,capture());assert.equal(response.status,200,await response.clone().text());
  let queued;for(let i=0;i<50;i++){queued=await f.db.prepare('SELECT * FROM push_deliveries WHERE owner_id=?').bind('owner-a').first();if(queued?.state==='sent')break;await new Promise(resolve=>setTimeout(resolve,100));}
  assert.equal(queued?.state,'sent');const payload=JSON.parse(queued.payload);assert.equal(payload.kind,'menu');assert.match(payload.body,/conferir preços/);assert.doesNotMatch(payload.body,/publicado/);assert.equal(deliveries,1);
  const other=(await (await f.call('/api/restaurants/'+shopB+'/import-assistance',{method:'POST',actor:'owner-b',body:requestBody()})).json()).request,otherCode=await f.pair(other.id);
  assert.equal((await f.extension('/api/menu-import-deliveries',otherCode,capture())).status,200);assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM push_deliveries WHERE owner_id=?').bind('owner-b').first()).n,0);assert.equal(deliveries,1);
 }finally{await f.close();}
});

test('a blocked real runner report reaches only the matching owner without altering drafts, photos or publications',async()=>{
 const f=await assistanceRuntime();try{
  const original=await f.db.prepare('SELECT id,data,published_data,revision FROM restaurants ORDER BY id').all();
  const response=await f.owner('POST',requestBody());assert.equal(response.status,201);
  const requestId=(await response.json()).request.id,oldCode=await f.pair(requestId);
  const report={
   format:'pizzaria-on-capture-report-v1',checkedAt:'2026-10-23T11:41:13.988Z',
   sourceUrl:store,storeId:'123e4567-e89b-42d3-a456-426614174000',
   outcome:'blocked',documentStatus:403,stopReason:'http_403',itemCount:0,exportableCount:0,
   pendingCount:0,pizzaSizesPending:0,scrolls:0,blockedRequests:0,truncated:false,
   completeness:'unverified',partial:true,elapsedMs:551
  };
  const body={requestId,reviewed:true,report};
  const endpoint='/api/admin/menu-import-failures';
  assert.equal((await f.call(endpoint,{method:'POST',actor:'owner-a',body})).status,403);
  assert.equal((await f.call(endpoint,{method:'POST',actor:'owner-admin',body:{...body,reviewed:false}})).status,400);
  assert.equal((await f.call(endpoint,{method:'POST',actor:'owner-admin',body:{...body,report:{...report,itemCount:1}}})).status,409);
  assert.equal((await f.call(endpoint,{method:'POST',actor:'owner-admin',body:{...body,report:{...report,storeId:'223e4567-e89b-42d3-a456-426614174000'}}})).status,409);
  assert.equal((await f.call(endpoint,{method:'POST',actor:'owner-admin',body,headers:{'x-pedido-csrf':''}})).status,403);
  const marked=await f.call(endpoint,{method:'POST',actor:'owner-admin',body});
  assert.equal(marked.status,200,await marked.clone().text());
  const stored=await f.db.prepare('SELECT status,capture_json,pairing_hash,pairing_expires_at FROM menu_import_assistance WHERE id=?').bind(requestId).first();
  assert.equal(stored.status,'blocked');assert.equal(stored.pairing_hash,null);
  assert.equal(stored.pairing_expires_at,null);
  assert.deepEqual(JSON.parse(stored.capture_json),{kind:'ifood-capture-failure-v1',reason:'http_403'});
  const ownerResult=await (await f.owner()).json();
  assert.equal(ownerResult.request.status,'blocked');
  assert.match(ownerResult.request.failureMessage,/HTTP 403/);
  assert.equal(ownerResult.request.capture,undefined);
  assert.equal(ownerResult.request.menuText,undefined);
  assert.equal((await f.extension('/api/menu-import-deliveries',oldCode,capture())).status,401);
  assert.equal((await f.call(endpoint,{method:'POST',actor:'owner-admin',body})).status,409);
  const after=await f.db.prepare('SELECT id,data,published_data,revision FROM restaurants ORDER BY id').all();
  assert.deepEqual(after.results,original.results);
  assert.equal((await f.owner('POST',requestBody())).status,201,'owner can ask for help again after a failed capture');
 }finally{await f.close();}
});
