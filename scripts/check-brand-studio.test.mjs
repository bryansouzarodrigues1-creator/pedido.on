import test from 'node:test';
import assert from 'node:assert/strict';
import {brandSvg,brandFilename} from '../lib/brand-studio.ts';
import {fixture,png} from './test-backend-fixture.mjs';

const identity={name:'São João & Filhos',tagline:'Pizza feita com carinho.',theme:'editorial',accent:'#BD391D'};

test('identity artwork escapes customer text and rejects color injection',()=>{
 const svg=brandSvg({...identity,name:'<script>alert(1)</script> & "Pizza"',tagline:'</text><image href="https://example.test"/>'},'cover');
 assert.equal(svg.includes('<script>'),false);
 assert.equal(svg.includes('<image'),false);
 assert.ok(svg.includes('&lt;script&gt;'));
 assert.ok(svg.includes('&quot;Pizza&quot;'));
 assert.throws(()=>brandSvg({...identity,accent:'red" onload="alert(1)'},'logo'));
 assert.ok(brandSvg(identity,'cover').includes('São João &amp; Filhos'));
 assert.equal(brandFilename('../../São João & Filhos','profile'),'sao-joao-filhos-perfil.png');
});

test('applying identity media preserves prices and Pix, and waits for explicit publication',async()=>{
 const f=fixture();
 try{
  const form=new FormData();form.append('file',new Blob([png],{type:'image/png'}),'pizzaria-logo.png');
  const uploaded=await f.call('media','POST',{id:'shop-a'},form);
  assert.equal(uploaded.status,201,await uploaded.clone().text());
  const {url}=await uploaded.json();assert.ok(url.startsWith('/media/shop-a/'));
  const before=f.db.prepare('SELECT * FROM restaurants WHERE id=?').get('shop-a');
  const data={...f.data,theme:'dark',accent:'#BDE46C',tagline:identity.tagline,logo:url};
  const saved=await f.call('restaurant','PUT',{id:'shop-a'},{revision:before.revision,data});
  assert.equal(saved.status,200,await saved.clone().text());
  const draft=f.db.prepare('SELECT * FROM restaurants WHERE id=?').get('shop-a');
  const persisted=JSON.parse(draft.data);
  assert.deepEqual(persisted.products,f.data.products);
  assert.deepEqual(persisted.pix,f.data.pix);
  assert.equal(draft.published_data,before.published_data);
  assert.equal(draft.revision,before.revision+1);
  const published=await f.call('publish','POST',{id:'shop-a'},{revision:draft.revision,published:true});
  assert.equal(published.status,200,await published.clone().text());
  const live=JSON.parse(f.db.prepare('SELECT published_data FROM restaurants WHERE id=?').get('shop-a').published_data);
  assert.equal(live.logo,url);assert.equal(live.theme,'dark');assert.deepEqual(live.products,f.data.products);assert.deepEqual(live.pix,f.data.pix);
 }finally{f.close();}
});

test('identity uploads and application cannot cross restaurant ownership',async()=>{
 const f=fixture();
 try{
  const form=new FormData();form.append('file',new Blob([png],{type:'image/png'}),'logo.png');
  const blocked=await f.call('media','POST',{id:'shop-b'},form);
  assert.equal(blocked.status,404);assert.equal(f.objects.size,0);
  const current=f.db.prepare('SELECT * FROM restaurants WHERE id=?').get('shop-a');
  const reused=await f.call('restaurant','PUT',{id:'shop-a'},{revision:current.revision,data:{...f.data,logo:'/media/shop-b/foreign.png'}});
  assert.equal(reused.status,400);
  assert.equal(f.db.prepare('SELECT data FROM restaurants WHERE id=?').get('shop-a').data,current.data);
 }finally{f.close();}
});
