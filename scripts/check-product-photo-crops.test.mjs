import test from "node:test";
import assert from "node:assert/strict";
import {suggestProductCrops,detectProductPhotoCrops,chooseProductPhotoCrop} from "../lib/menu-photo-crops.ts";
import {readerItemSchema,applyReaderItems} from "../lib/menu-reader-policy.ts";
import {defaultRestaurant} from "../lib/domain.ts";

test("suggested screenshot crops are bounded and never intersect the OCR product text",()=>{
 const box={x0:300,y0:280,x1:570,y1:330};
 const candidates=suggestProductCrops(1000,1300,box);
 assert.deepEqual(candidates.map(x=>x.side),["left","right"]);
 for(const c of candidates){
  assert.ok(c.rect.x0>=0&&c.rect.y0>=0&&c.rect.x1<=1000&&c.rect.y1<=1300);
  assert.ok(c.rect.x1<=box.x0||c.rect.x0>=box.x1);
  assert.ok(c.rect.x1-c.rect.x0>=150);
 }
 assert.deepEqual(suggestProductCrops(200,700,box),[]);
 assert.deepEqual(suggestProductCrops(1000,1000),[]);
 assert.deepEqual(suggestProductCrops(1000,1000,{x0:-2,y0:3,x1:100,y1:120}),[]);
});

test("local photo search finds texture beyond adjacent whitespace and rejects plain/no-photo regions",()=>{
 const raster={width:220,height:200,data:new Uint8ClampedArray(220*200*4).fill(255)},box={x0:50,y0:160,x1:405,y1:240};
 const paint=(x0,y0,x1,y1,textured=true)=>{for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*220+x)*4,light=textured&&(x+y)%2===0;raster.data[i]=light?240:160;raster.data[i+1]=light?100:40;raster.data[i+2]=light?60:20;}};
 assert.deepEqual(detectProductPhotoCrops(1100,1000,box,raster),[]);
 paint(165,25,209,69);
 const [photo]=detectProductPhotoCrops(1100,1000,box,raster,[{x0:50,y0:396,x1:405,y1:476}]);
 assert.equal(photo.side,"right");assert.ok(photo.rect.x0>=820&&photo.rect.x0<=825);assert.ok(photo.rect.x1>=1045);assert.ok(photo.rect.y0<=125&&photo.rect.y1>=345);
 raster.data.fill(255);paint(165,25,209,69,false);
 assert.deepEqual(detectProductPhotoCrops(1100,1000,box,raster),[]);
 assert.deepEqual(detectProductPhotoCrops(1100,1000,box,{...raster,width:513}),[]);
});

test("the photo search stays clear of neighboring products and never uses another row's image",()=>{
 const raster={width:220,height:200,data:new Uint8ClampedArray(220*200*4).fill(255)};
 for(let y=100;y<144;y++)for(let x=165;x<209;x++){const i=(y*220+x)*4,light=(x+y)%2===0;raster.data[i]=light?240:160;raster.data[i+1]=light?100:40;raster.data[i+2]=light?60:20;}
 const box={x0:50,y0:160,x1:405,y1:240},neighbors=[{x0:50,y0:450,x1:405,y1:540}];
 assert.deepEqual(detectProductPhotoCrops(1100,1000,box,raster,neighbors),[]);
});

test("digital PDF cards can attach a photo above its product caption",()=>{
 const raster={width:220,height:200,data:new Uint8ClampedArray(220*200*4).fill(255)};
 for(let y=45;y<87;y++)for(let x=18;x<86;x++){
  const i=(y*220+x)*4,v=(x+y)%2===0;
  raster.data[i]=v?241:126;raster.data[i+1]=v?107:56;raster.data[i+2]=v?65:24;
 }
 const box={x0:110,y0:480,x1:400,y1:575};
 const result=detectProductPhotoCrops(1100,1000,box,raster);
 assert.deepEqual(result.map(x=>x.side),['top']);
 const crop=result[0].rect;
 assert.ok(crop.y1<=box.y0&&crop.x0>=0&&crop.x1<=1100);
 // A real product above this caption blocks image search into that row.
 const blocked=detectProductPhotoCrops(1100,1000,box,raster,[{x0:120,y0:245,x1:395,y1:460}]);
 assert.deepEqual(blocked,[]);
});

test('photo association prefers the caption-above card over a neighboring photo',()=>{
 const top={side:'top',rect:{x0:100,y0:250,x1:450,y1:440}};
 const neighbor={side:'right',rect:{x0:600,y0:250,x1:950,y1:440}};
 assert.deepEqual(chooseProductPhotoCrop([neighbor,top]),top);
 assert.equal(chooseProductPhotoCrop([neighbor,{...neighbor,side:'left'}]),null);
 assert.equal(chooseProductPhotoCrop([]),null);
});

test('a broad banner separated from the product row is not attributed to that product',()=>{
 const raster={width:220,height:200,data:new Uint8ClampedArray(220*200*4).fill(255)};
 for(let y=60;y<100;y++)for(let x=18;x<85;x++){
  const i=(y*220+x)*4,m=(x+y)%2===0;
  raster.data[i]=m?238:118;raster.data[i+1]=m?108:39;raster.data[i+2]=m?59:18;
 }
 const item={x0:110,y0:630,x1:395,y1:730};
 assert.deepEqual(detectProductPhotoCrops(1100,1000,item,raster),[]);
});

test("owner-approved screenshot photo follows existing product schema and importer, without automatic replacement",()=>{
 const before=defaultRestaurant("Pizzaria Exemplo");
 const image="/media/shop-a/crop-123.jpg";
 const base={id:"reader-1",sourceId:"page-1",sourceText:"Coca 2L R$ 12,90",name:"Coca 2L",description:"",category:"Bebidas",kind:"simple",price:1290,sizes:{p:null,m:null,g:null},issues:[],selected:true,action:"add"};
 const parsed=readerItemSchema.parse({...base,image});
 let id=0;const patch=applyReaderItems(before,[parsed],()=>`new-${++id}`);
 const product=patch.products.find(p=>p.name==="Coca 2L");
 assert.equal(product.image,image);
 assert.equal(before.products.length,0);
 const update=readerItemSchema.parse({...base,id:"reader-2",existingId:product.id,action:"update",price:1390});
 const updated=applyReaderItems({...before,...patch},[update],()=>`x-${++id}`);
 assert.equal(updated.products.find(p=>p.id===product.id).image,image);
 assert.equal(updated.products.find(p=>p.id===product.id).price,1390);
 assert.equal(readerItemSchema.safeParse({...base,image:"https://third-party.example/fake.jpg"}).success,false);
});
