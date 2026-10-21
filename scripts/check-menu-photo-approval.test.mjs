import test from 'node:test';
import assert from 'node:assert/strict';
import {readMenuPages} from '../lib/menu-reader-policy.ts';
import {attachApprovedMenuPhotos,uploadApprovedMenuPhoto} from '../lib/menu-photo-upload.ts';

const sample='data:image/jpeg;base64,'+Buffer.from('fake-jpeg').toString('base64');
const items=()=>readMenuPages([{id:'source',lines:[{text:'Bebidas'},{text:'Água mineral R$ 5,00'},{text:'Suco natural R$ 12,00'}]}]).items;

test('photo suggestions never upload without explicit approval for this selected product',async()=>{
 const selected=items(),photos=Object.fromEntries(selected.map(item=>[item.id,sample]));let uploaded=0;
 const out=await attachApprovedMenuPhotos(selected,photos,{[selected[0].id]:true},'restaurant',()=>{},async()=>{uploaded++;return '/media/restaurant/confirmed.jpg';});
 assert.equal(uploaded,1);assert.equal(out[0].image,'/media/restaurant/confirmed.jpg');assert.equal(out[1].image,undefined);
 assert.equal(selected[0].image,undefined,'Do not mutate owner review state');
 selected[0].selected=false;
 await attachApprovedMenuPhotos(selected,photos,{[selected[0].id]:true,[selected[1].id]:false},'restaurant',()=>{},async()=>{throw Error('No upload expected');});
});

test('successful photo approvals report durable links one by one even if another upload fails',async()=>{
 const selected=items(),photos=Object.fromEntries(selected.map(item=>[item.id,sample]));const saved=[];
 await assert.rejects(attachApprovedMenuPhotos(selected,photos,Object.fromEntries(selected.map(item=>[item.id,true])),'restaurant',(...args)=>saved.push(args),async(_id,_photo)=>{
  if(saved.length)throw Error('Network failure');return '/media/restaurant/first.jpg';
 }),/Network failure/);
 assert.deepEqual(saved,[[selected[0].id,'/media/restaurant/first.jpg']]);
});

test('photo upload rejects forged URLs and invalid assets before posting',async()=>{
 let calls=0;const send=async input=>{
  calls++;
  if(input.startsWith('data:'))return new Response(Buffer.from('jpeg'),{headers:{'content-type':'image/jpeg'}});
  return Response.json({url:'/media/another-restaurant/not-ours.jpg'});
 };
 await assert.rejects(uploadApprovedMenuPhoto('restaurant','https://remote.invalid/malicious',send),/não está disponível/);
 assert.equal(calls,0);
 await assert.rejects(uploadApprovedMenuPhoto('restaurant',sample,send),/Não foi possível guardar/);
 assert.equal(calls,2);
});

test("photos already copied into the same restaurant R2 require owner approval but no second upload",async()=>{
 const chosen=items(),photo="/media/restaurant/ready.jpg",id=chosen[0].id;let uploads=0;
 const result=await attachApprovedMenuPhotos(chosen,{[id]:photo},{[id]:true},"restaurant",()=>{},async()=>{uploads++;throw Error("no upload expected");});
 assert.equal(uploads,0);assert.equal(result[0].image,photo);
 assert.equal(chosen[0].image,undefined,"preview must not mutate source");
 const rejected=await attachApprovedMenuPhotos(chosen,{[id]:photo},{[id]:false},"restaurant",()=>{},async()=>{throw Error("should not call");});
 assert.equal(rejected[0].image,undefined);
 await assert.rejects(attachApprovedMenuPhotos(chosen,{[id]:"/media/other/foreign.jpg"},{[id]:true},"restaurant",()=>{},async()=>{throw Error("Upload refuses non-JPEG suggestion");}),/Upload refuses/);
});
