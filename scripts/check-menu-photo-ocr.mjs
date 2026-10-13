// Reproducible screenshot layouts with the repository's existing photo asset.
// This exercises real local Tesseract; it is not an iFood/99Food integration or mobile QA.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createWorker,OEM,PSM} from 'tesseract.js';
import {arrangeMenuWords,readMenuPages} from '../lib/menu-reader-policy.ts';
import {detectProductPhotoCrops} from '../lib/menu-photo-crops.ts';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const sharp=createRequire(wranglerRequire.resolve('miniflare/package.json'))('sharp');
const out=path.resolve('.sites-runtime/photo-ocr-qa');await mkdir(out,{recursive:true});
const width=1100,height=1000,photo=await sharp('public/assets/pizza.webp').resize(220,220).png().toBuffer();
const text=(label,x,y,size=32)=>`<text x="${x}" y="${y}" font-family="DejaVu Sans" font-size="${size}" fill="#171717">${label}</text>`;
const fixtures=[];
for(const [name,side,step,withPhoto] of [['right','right',310,true],['left','left',310,true],['close','right',235,true],['no-photo','right',310,false]]){
 const x=side==='left'?335:55,photoX=side==='left'?55:825;
 const rows=[['Calabresa',4990],['Frango',5290],['Portuguesa',5590]];
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/>${text('PIZZAS',x,75,40)}`;
 const overlays=[],bounds=[];
 rows.forEach(([label,price],i)=>{
  const top=125+i*step;
  svg+=text(`${label} G R$ ${(price/100).toFixed(2).replace('.',',')}`,x,top+60)+text('Molho, queijo e tomate',x,top+110,27);
  if(withPhoto){overlays.push({input:photo,left:photoX,top});bounds.push({name:label,rect:{x0:photoX,y0:top,x1:photoX+220,y1:top+220}});}
 });svg+='</svg>';
 const filename=path.join(out,name+'.png');await sharp(Buffer.from(svg)).composite(overlays).png().toFile(filename);
 fixtures.push({name,side,filename,bounds});
}
const worker=await createWorker('por',OEM.LSTM_ONLY,{langPath:path.resolve('public/ocr/v7'),cachePath:out});
await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK,preserve_interword_spaces:'1'});
const report=[];
try{
 for(const fixture of fixtures){
  const started=performance.now();
  const {data}=await worker.recognize(fixture.filename,{rotateAuto:true},{text:true,blocks:true});
  const words=data.blocks?.flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words.map(w=>({text:w.text,confidence:w.confidence,box:w.bbox})))))||[];
  const lines=arrangeMenuWords(words,width);
  if(Math.abs(data.rotateRadians||0)>.001)for(const line of lines)delete line.box;
  const result=readMenuPages([{id:fixture.name,lines}]);
  assert.equal(result.items.length,3,fixture.name+': unexpected OCR products');
  await writeFile(path.join(out,fixture.name+'.json'),JSON.stringify({text:data.text,words,lines,result},null,2));
  const sample=await sharp(fixture.filename).resize({width:384}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const raster={width:sample.info.width,height:sample.info.height,data:sample.data};
  const entries=[];
  for(const [index,expected] of [['Calabresa',4990],['Frango',5290],['Portuguesa',5590]].entries()){
   const item=result.items.find(v=>v.name.toLowerCase()===expected[0].toLowerCase());
   assert.ok(item,fixture.name+': missing '+expected[0]);assert.equal(item.sizes.g,expected[1]);
   const neighbors=result.items.filter(v=>v.id!==item.id).flatMap(v=>v.box?[v.box]:[]);
   const candidates=detectProductPhotoCrops(width,height,item.box,raster,neighbors);
   for(const candidate of candidates){const rect=candidate.rect;await sharp(fixture.filename).extract({left:rect.x0,top:rect.y0,width:rect.x1-rect.x0,height:rect.y1-rect.y0}).png().toFile(path.join(out,`${fixture.name}-${index}-${candidate.side}.png`));}
   const candidate=candidates.find(v=>v.side===fixture.side),target=fixture.bounds[index]?.rect;
   const area=rect=>(rect.x1-rect.x0)*(rect.y1-rect.y0);
   const overlap=(a,b)=>Math.max(0,Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0))*Math.max(0,Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0));
   const coverage=candidate&&target?overlap(candidate.rect,target)/area(target):null;
   const neighborOverlap=candidate?fixture.bounds.filter((_,i)=>i!==index).reduce((total,p)=>total+overlap(candidate.rect,p.rect),0):0;
   if(target){assert.ok(candidate,fixture.name+': missing photo candidate');assert.ok(coverage>=.9,fixture.name+': truncated photo');assert.equal(neighborOverlap,0,fixture.name+': wrong neighboring photo');}
   else assert.deepEqual(candidates,[],fixture.name+': invented photo candidate');
   entries.push({name:item.name,box:item.box,candidates,photoCoverage:coverage===null?null:Number(coverage.toFixed(3)),neighborOverlap});
  }
  report.push({name:fixture.name,ms:Math.round(performance.now()-started),rotateRadians:data.rotateRadians,items:entries,unmatched:result.unmatched});
 }
}finally{await worker.terminate();}
await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
