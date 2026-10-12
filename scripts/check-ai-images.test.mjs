import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,png} from './test-backend-fixture.mjs';
import {imageEndpoint,imageFormat,imageLimits,imagePrompt,imageInput} from '../lib/image-policy.ts';
import {creationRequest} from '../lib/creation-request.ts';
import {defaultCreationTarget} from '../lib/creation-intent.ts';
import {studioImagePatch} from '../lib/studio-policy.ts';
import {handleGenerate,IMAGE_MODEL,CLAIM_URL} from '../services/image-service/src/lib/pedido-image.server.ts';
const input=()=>({requestId:crypto.randomUUID(),asset:'logo',description:'Símbolo rústico de forno a lenha e pizza.',theme:'editorial',accent:'#BD391D'});
const endpoint='https://pedido-on-imagens.lovable.app/api/pedido-on/image';
function enable(f){f.env.PEDIDO_IMAGE_ENABLED='true';f.env.PEDIDO_IMAGE_ENDPOINT=endpoint;}

test('the full visual brief reaches the image service and overrides the old brand reference',()=>{
 const brief='Logo com azul elétrico, amarelo intenso e um forno em estilo pop art.';
 const prompt=imagePrompt('Pizzaria do teste',imageInput.parse({...input(),description:brief}));
 assert.ok(prompt.includes(JSON.stringify(brief)));
 assert.ok(prompt.includes('use essa referência somente onde o pedido não especificar outra aparência'));
 assert.equal(prompt.includes('Logo simples'),false);
 const largest=imagePrompt('n'.repeat(100),imageInput.parse({...input(),asset:'product',productId:'p',description:'d'.repeat(600)}),{name:'n'.repeat(100),description:'d'.repeat(600)});
 assert.ok(largest.length<=3000,'The Lovable claim parser must accept the longest valid product brief');
});

test('the mobile request crosses app, one-use claim and Lovable image handler, saves bytes and requires explicit draft application',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);
 const message='Gere algo marcante de pizza de queijo';let modelCalls=0,textCalls=0;
 const request=creationRequest(defaultCreationTarget,message,'ai',f.data,crypto.randomUUID());
 const before=f.db.prepare('SELECT data,published_data,revision FROM restaurants WHERE id=?').get('shop-a');
 globalThis.fetch=async(url,init)=>{
  if(url!==endpoint){textCalls++;throw Error('The image request must not reach the text service');}
  return handleGenerate(new Request(endpoint,{method:'POST',body:init.body}),{apiKey:'mock-key',fetch:async(destination,options)=>{
   if(destination===CLAIM_URL){const claim=await f.call('imageClaim','POST',{},JSON.parse(options.body));assert.equal(claim.status,200);return claim;}
   assert.equal(destination,'https://ai.gateway.lovable.dev/v1/images/generations');modelCalls++;
   const body=JSON.parse(options.body);assert.equal(body.model,IMAGE_MODEL);
   assert.ok(body.contents[0].parts[0].text.includes(JSON.stringify(message)));
   assert.equal(JSON.stringify(body).includes(f.data.pix.key),false);
   return Response.json({data:[{b64_json:Buffer.from(png).toString('base64')}]});
  }});
 };
 try{
  assert.equal(request.path,'ai/images');
  const response=await f.call('images','POST',{id:'shop-a'},request.body);assert.equal(response.status,200,await response.clone().text());const result=await response.json();
  assert.equal(result.asset,'cover');assert.equal(modelCalls,1);assert.equal(textCalls,0);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM studio_jobs').get().n,0);
  assert.deepEqual(f.db.prepare('SELECT data,published_data,revision FROM restaurants WHERE id=?').get('shop-a'),before);
  const stored=f.objects.get(result.url.slice('/media/'.length));assert.deepEqual(stored.bytes,png);assert.equal(stored.options.httpMetadata.contentType,'image/png');
  assert.equal((await f.call('images','POST',{id:'shop-a'},request.body)).status,200);assert.equal(modelCalls,1);
  const data={...f.data,...studioImagePatch(f.data,{asset:'cover',url:result.url})};
  const saved=await f.call('restaurant','PUT',{id:'shop-a'},{revision:before.revision,data});assert.equal(saved.status,200,await saved.clone().text());
  const after=f.db.prepare('SELECT data,published_data FROM restaurants WHERE id=?').get('shop-a');
  assert.equal(JSON.parse(after.data).cover,result.url);assert.equal(after.published_data,before.published_data);
  assert.deepEqual(JSON.parse(after.data).products,f.data.products);assert.deepEqual(JSON.parse(after.data).pix,f.data.pix);
 }finally{globalThis.fetch=original;f.close();}
});

test('image requests only target the configured HTTPS service and reject disguised files',()=>{
 assert.equal(imageEndpoint(endpoint),endpoint);
 for(const url of ['http://pedido-on-imagens.lovable.app/api/pedido-on/image','https://localhost/api/pedido-on/image','https://evil.test/?url='+endpoint,'https://a.lovable.app/api/pedido-on/image?redirect=evil','https://a.lovable.app:444/api/pedido-on/image'])assert.equal(imageEndpoint(url),'');
 assert.throws(()=>imageFormat(new TextEncoder().encode('<svg onload="alert(1)"/>'),'image/png'));
 assert.throws(()=>imageFormat(png,'text/html'));
 assert.throws(()=>imageFormat(new Uint8Array(imageLimits.maxBytes+1),'image/png'));
});

test('disabled image AI, foreign shops and forged origins never call a provider',async()=>{
 const f=fixture(),original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('not expected');};
 try{
  assert.equal((await f.call('images','POST',{id:'shop-a'},input())).status,503);
  enable(f);
  assert.equal((await f.call('images','POST',{id:'shop-b'},input())).status,404);
  assert.equal((await f.call('images','POST',{id:'shop-a'},input(),{Origin:'https://evil.test'})).status,403);
  assert.equal((await f.call('images','POST',{id:'shop-a'},{...input(),model:'expensive'})).status,400);
  assert.equal(calls,0);
 }finally{globalThis.fetch=original;f.close();}
});

test('generation claims once, stays owned, preserves the menu and caches repeated requests',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);let calls=0;let token;
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,endpoint);assert.equal(options.redirect,'manual');calls++;
  const body=JSON.parse(options.body);token=body.token;assert.deepEqual(Object.keys(body).sort(),['jobId','token']);
  const claim=await f.call('imageClaim','POST',{},body);assert.equal(claim.status,200);const data=await claim.json();assert.equal(data.protocol,'pedido-image-v1');assert.equal(data.ratio,'1:1');assert.equal(data.prompt.includes(f.data.pix.key),false);
  assert.equal((await f.call('imageClaim','POST',{},body)).status,401);
  return new Response(png,{headers:{'Content-Type':'image/png'}});
 };
 try{
  const before=f.db.prepare('SELECT * FROM restaurants WHERE id=?').get('shop-a'),body=input();
  const generated=await f.call('images','POST',{id:'shop-a'},body);assert.equal(generated.status,200,await generated.clone().text());const result=await generated.json();
  assert.ok(result.url.startsWith('/media/shop-a/'));assert.equal(result.usage.used,1);assert.equal(result.usage.limit,3);
  assert.equal(f.objects.size,1);assert.equal((await f.call('images','POST',{id:'shop-a'},body)).status,200);assert.equal(calls,1);
  assert.equal((await f.call('images','POST',{id:'shop-a'},{...body,description:'Outro símbolo e outros elementos.'})).status,409);
  const job=f.db.prepare('SELECT * FROM image_jobs').get();assert.notEqual(job.token_hash,token);assert.equal(job.state,'completed');assert.equal(JSON.stringify(result).includes(token),false);
  const after=f.db.prepare('SELECT * FROM restaurants WHERE id=?').get('shop-a');assert.equal(after.data,before.data);assert.equal(after.published_data,before.published_data);
 }finally{globalThis.fetch=original;f.close();}
});

test('concurrent repeats reserve once and platform limits cannot be bypassed by failures',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);let calls=0;
 globalThis.fetch=async(_url,options)=>{calls++;const claim=await f.call('imageClaim','POST',{},JSON.parse(options.body));assert.equal(claim.status,200);return new Response('provider unavailable',{status:502});};
 try{
  const body=input(),responses=await Promise.all([f.call('images','POST',{id:'shop-a'},body),f.call('images','POST',{id:'shop-a'},body)]);
  assert.ok(responses.every(r=>[409,503].includes(r.status)));assert.equal(calls,1);assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM image_jobs').get().n,1);
  for(let i=1;i<2;i++){assert.equal((await f.call('images','POST',{id:'shop-a'},input())).status,503);assert.equal(calls,i+1);}
  assert.equal((await f.call('images','POST',{id:'shop-a'},input())).status,429);assert.equal(calls,2);
  assert.equal((await (await f.call('images','GET',{id:'shop-a'})).json()).used,2);
 }finally{globalThis.fetch=original;f.close();}
});

test('unclaimed failures refund safely and wrong or expired claim tokens stay denied',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);assert.equal((await f.call('imageClaim','POST',{},{...body,token:'ab'.repeat(32)})).status,401);f.db.prepare("UPDATE image_jobs SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(body.jobId);assert.equal((await f.call('imageClaim','POST',{},body)).status,401);return new Response('rejected before generation',{status:401});};
 try{assert.equal((await f.call('images','POST',{id:'shop-a'},input())).status,503);assert.equal((await (await f.call('images','GET',{id:'shop-a'})).json()).used,0);assert.equal(f.db.prepare('SELECT state FROM image_jobs').get().state,'cancelled');assert.equal(f.objects.size,0);}finally{globalThis.fetch=original;f.close();}
});

test('monthly quota belongs to the owner and creating another shop cannot multiply it',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);let calls=0;
 f.db.prepare('UPDATE restaurants SET owner_id=? WHERE id=?').run('owner-a','shop-b');
 globalThis.fetch=async(_url,options)=>{calls++;assert.equal((await f.call('imageClaim','POST',{},JSON.parse(options.body))).status,200);return new Response(png,{headers:{'Content-Type':'image/png'}});};
 try{
  for(let i=0;i<3;i++){
   assert.equal((await f.call('images','POST',{id:i%2===0?'shop-b':'shop-a'},input())).status,200);
   f.db.prepare("UPDATE image_jobs SET created_at='2026-01-01T00:00:00.000Z' WHERE state='completed'").run();
   // Model separate daily windows for this owner without altering its monthly limit.
   f.db.exec("DELETE FROM rate_buckets");
  }
  assert.equal((await f.call('images','POST',{id:'shop-b'},input())).status,429);assert.equal(calls,3);
  assert.equal((await (await f.call('images','GET',{id:'shop-b'})).json()).used,3);
 }finally{globalThis.fetch=original;f.close();}
});

test('an explicit provider no-credit rejection refunds the reserved attempt',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);
 globalThis.fetch=async(_url,options)=>{assert.equal((await f.call('imageClaim','POST',{},JSON.parse(options.body))).status,200);return new Response('no credits',{status:402});};
 try{const response=await f.call('images','POST',{id:'shop-a'},input());assert.equal(response.status,503);assert.ok((await response.json()).error.includes('devolvida'));assert.equal((await (await f.call('images','GET',{id:'shop-a'})).json()).used,0);assert.equal(f.db.prepare('SELECT state FROM image_jobs').get().state,'cancelled');}finally{globalThis.fetch=original;f.close();}
});
test('product photos require an existing owned product and an activated updated service',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);let calls=0;
 globalThis.fetch=async(_url,options)=>{calls++;const r=await f.call('imageClaim','POST',{},JSON.parse(options.body));assert.equal(r.status,200);const c=await r.json();assert.equal(c.asset,'product');assert.equal(c.ratio,'1:1');assert.ok(c.prompt.includes('Margherita'));assert.equal(c.prompt.includes(f.data.pix.key),false);return new Response(png,{headers:{'content-type':'image/png'}});};
 try{const body={...input(),asset:'product',productId:'margherita'};assert.equal((await f.call('images','POST',{id:'shop-a'},body)).status,503);f.env.PEDIDO_STUDIO_ENABLED='true';f.env.PEDIDO_STUDIO_ENDPOINT='https://pedido-on-imagens.lovable.app/api/pedido-on/studio';assert.equal((await f.call('images','POST',{id:'shop-a'},{...body,productId:'unknown'})).status,400);assert.equal((await f.call('images','POST',{id:'shop-b'},body)).status,404);assert.equal(calls,0);assert.equal((await f.call('images','POST',{id:'shop-a'},body)).status,200);assert.equal(calls,1);}finally{globalThis.fetch=original;f.close();}
});

test('a connection failure before claim reports no charge and does not create a paid retry',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);let calls=0;
 globalThis.fetch=async()=>{calls++;throw new TypeError('Provider connection failed');};
 try{const body=input(),r=await f.call('images','POST',{id:'shop-a'},body),v=await r.json();assert.equal(r.status,503);assert.equal(v.attempt,'cancelled');assert.match(v.error,/Nenhuma imagem foi descontada/);assert.equal((await (await f.call('images','GET',{id:'shop-a'})).json()).used,0);const retry=await f.call('images','POST',{id:'shop-a'},body);assert.equal(retry.status,409);assert.equal((await retry.json()).attempt,'cancelled');assert.equal(calls,1);assert.equal(f.objects.size,0);}finally{globalThis.fetch=original;f.close();}
});

test('an image connection lost after claim stays counted and is reported separately',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);
 globalThis.fetch=async(_url,options)=>{assert.equal((await f.call('imageClaim','POST',{},JSON.parse(options.body))).status,200);throw new TypeError('Connection lost');};
 try{const r=await f.call('images','POST',{id:'shop-a'},input()),v=await r.json();assert.equal(r.status,503);assert.equal(v.attempt,'failed');assert.doesNotMatch(v.error,/Nenhuma imagem foi descontada/);assert.equal((await (await f.call('images','GET',{id:'shop-a'})).json()).used,1);}finally{globalThis.fetch=original;f.close();}
});
