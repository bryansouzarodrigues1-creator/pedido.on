// Read-only regression for a PDF supplied by the owner. The file is never
// copied into the repository, posted to a service, or written into an asset.
// Usage: node --experimental-strip-types scripts/verify-owner-menu.mjs /path/menu.pdf
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {pdfMenuLines} from '../lib/menu-pdf-layout.ts';
import {readMenuPages,readerItemReady,normalizeMenuText} from '../lib/menu-reader-policy.ts';
import {detectProductPhotoCrops} from '../lib/menu-photo-crops.ts';

const file=process.argv[2];
if(!file)throw Error('Forneça o caminho do PDF para validar.');
const bytes=await readFile(resolve(file));
const pdf=await getDocument({data:new Uint8Array(bytes),isEvalSupported:false,
 standardFontDataUrl:resolve('node_modules/pdfjs-dist/standard_fonts')+'/'}).promise;
const pages=[];
try{
 for(let i=1;i<=pdf.numPages;i++){
  const page=await pdf.getPage(i),base=page.getViewport({scale:1});
  const scale=Math.min(2.5,2600/Math.max(base.width,base.height),Math.sqrt(4500000/(base.width*base.height)));
  const viewport=page.getViewport({scale});
  const content=await page.getTextContent();
  if(process.env.QA_MENU_SPANS===String(i))console.error(JSON.stringify(content.items.filter(item=>'str' in item).map(item=>({text:item.str,x:Math.round(item.transform[4]),y:Math.round(item.transform[5]),w:Math.round(item.width)})),null,2));
  const lines=pdfMenuLines(content.items.filter(item=>'str' in item),viewport.transform,scale,Math.floor(viewport.width),Math.floor(viewport.height));
  const hasPrices=lines.some(line=>/R\s*\$\s*\d|\d+[,.]\d{2}/i.test(line.text));
  pages.push({id:`original-${i}`,lines:hasPrices?lines:[],lineCount:lines.length,width:Math.floor(viewport.width),height:Math.floor(viewport.height)});
 }
}finally{await pdf.destroy();}
if(process.env.QA_MENU_TRACE)console.error(JSON.stringify(pages.filter(p=>process.env.QA_MENU_TRACE.split(',').includes(p.id.slice(-1))).map(p=>({page:p.id,lines:p.lines.map(l=>({text:l.text,x:Math.round(l.box?.x0||0),y:Math.round(l.box?.y0||0),flags:[l.layoutUncertain,l.textUncertain]}))})),null,2));
const result=readMenuPages(pages),items=result.items;
if(process.env.QA_MENU_ITEMS)console.error(JSON.stringify(items.filter(item=>item.sourceId===`original-${process.env.QA_MENU_ITEMS}`),null,2));
if(process.env.QA_MENU_IMAGE_PATH){
 const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
 const miniflareRequire=createRequire(wranglerRequire.resolve('miniflare/package.json')),sharp=miniflareRequire('sharp');
 const {data,info}=await sharp(resolve(process.env.QA_MENU_IMAGE_PATH)).resize({width:384,height:384,fit:'inside'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const raster={width:info.width,height:info.height,data};
 const pg=process.env.QA_MENU_IMAGE_PAGE||'2';
 const imageItems=items.filter(item=>item.sourceId===`original-${pg}`&&item.box);
 const readerWidth=pages[Number(pg)-1].width,readerHeight=pages[Number(pg)-1].height;
 console.error('Photo candidates '+JSON.stringify(imageItems.map(item=>({name:item.name,review:item.reviewRequired,
  crop:detectProductPhotoCrops(readerWidth,readerHeight,item.box,raster,imageItems.filter(other=>other!==item).map(other=>other.box))})),null,2));
}
const expected=[
 [2,'Calabresa da Vila',5300,6800],[2,'Quatro Queijos',6500,8200],[2,'Margherita',5500,7200],
 [3,'Muçarela',4500,5900],[3,'Calabresa',4900,6400],[3,'Portuguesa',5700,7400],[3,'Frango com Catupiry',5600,7300],
 [3,'Margherita',5300,6900],[3,'Napolitana',5100,6700],[3,'Presunto & Queijo',5200,6800],
 [3,'Milho com Bacon',5700,7500],[3,'Vegetariana',5900,7700],[3,'Atum com Cebola',6000,7900],
 [4,'Brasa da Casa',6800,8700],[4,'Rústica de Parma',7200,9200],[4,'Búfala & Pesto',6900,8900],
 [4,'Quatro Queijos',6500,8200],[4,'Camarão Cremoso',7900,10300],[4,'Costela BBQ',7500,9600],
 [4,'Funghi & Alho-Poró',7000,9100],[4,'Picante do Forno',6700,8600],
 [5,'Pão de alho gratinado',2400],[5,'Bruschetta clássica',2900],[5,'Batatas rústicas',2700],
 [5,'Palitos de muçarela',3200],[5,'Combo Dupla',8400],[5,'Noite em Família',15900],
 [5,'Festa do Forno',23500],
 [6,'Chocolate & Morango',4800,6400],[6,'Banana com Canela',4200,5600],
 [6,'Doce de Leite',4600,6200],[6,'Água mineral 500 ml',500],[6,'Água com gás 500 ml',600],
 [6,'Refrigerante lata 350 ml',700],[6,'Refrigerante 600 ml',1000],[6,'Refrigerante 2 L',1500],
 [6,'Suco natural 400 ml',1200],[6,'Chá gelado 400 ml',1000],[6,'Brownie com sorvete',2500],
 [6,'Tiramisu no pote',2300],[6,'Mousse de chocolate',1900],
 [7,'Requeijão cremoso',1000],[7,'Cheddar',1000],[7,'Chocolate',1200],
 [7,'Muçarela extra',900],[7,'Bacon',800],[7,'Tomate-cereja',600],[7,'Molho da casa',400]
];
const comparisons=expected.map(([page,name,m,g])=>{
 const matched=items.find(item=>item.sourceId===`original-${page}`&&normalizeMenuText(item.name)===normalizeMenuText(name));
 return {page,name,found:!!matched,correct:!!matched&&(g!==undefined?matched.sizes.m===m&&matched.sizes.g===g:matched.price===m),
  ...(matched?{actual:matched.kind==='pizza'?matched.sizes:matched.price,ready:readerItemReady(matched),review:!!matched.reviewRequired,description:matched.description}:{} )};
});
const bad=comparisons.filter(x=>!x.correct);
console.log(JSON.stringify({source:'owner-supplied PDF (local-only)',pages:pages.map(p=>({page:p.id,lines:p.lineCount,items:items.filter(i=>i.sourceId===p.id).length})),
 expected:expected.length,recognized:items.length,exactPrices:comparisons.filter(c=>c.correct).length,ready:items.filter(readerItemReady).length,
 reviewRequired:items.filter(i=>i.reviewRequired).length,missingOrWrong:bad,extra:items.filter(i=>!expected.some(([page,name])=>i.sourceId===`original-${page}`&&normalizeMenuText(i.name)===normalizeMenuText(name))).map(i=>({page:i.sourceId,name:i.name,price:i.price,sizes:i.sizes,review:i.reviewRequired})),
 ...(process.env.QA_MENU_DETAILS==='1'?{matches:comparisons}:{})},null,2));
if(process.env.QA_MENU_STRICT!=='0'){
 assert.equal(bad.length,0,'Produtos ou preços divergem do PDF de referência.');
 assert.equal(items.length,expected.length,'O leitor introduziu ou perdeu produtos em relação ao PDF original.');
 assert.equal(items.filter(readerItemReady).length,45,'A revisão de duplicatas ou dos preços conflitantes mudou.');
}
