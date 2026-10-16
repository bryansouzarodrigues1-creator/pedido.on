// Real local OCR against reproducible images; no AI API and no customer data.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createWorker,OEM,PSM} from 'tesseract.js';
import {readMenuPages,readerItemReady,arrangeMenuWords} from '../lib/menu-reader-policy.ts';
const req=createRequire(import.meta.url),wranglerReq=createRequire(req.resolve('wrangler/package.json')),miniflareReq=createRequire(wranglerReq.resolve('miniflare/package.json')),sharp=miniflareReq('sharp');
const out=path.resolve('.sites-runtime/ocr-qa');await mkdir(out,{recursive:true});
const row=(text,x,y)=>`<text x="${x}" y="${y}" font-family="DejaVu Sans" font-size="34" fill="#171717">${text}</text>`;
const heading=(text,x,y)=>`<text x="${x}" y="${y}" font-family="DejaVu Sans" font-size="38" font-weight="bold" fill="#171717">${text}</text>`;
const simple=`<svg xmlns="http://www.w3.org/2000/svg" width="1550" height="950"><rect width="100%" height="100%" fill="#fffaf1"/>${heading('PIZZAS',70,90)}${row('P',840,160)}${row('M',1090,160)}${row('G',1330,160)}${row('Calabresa',70,240)}${row('29,90',790,240)}${row('39,90',1040,240)}${row('49,90',1280,240)}${row('Molho, queijo, calabresa e cebola',70,295)}${row('Frango',70,385)}${row('32,90',790,385)}${row('42,90',1040,385)}${row('52,90',1280,385)}${row('Molho, queijo, frango e catupiry',70,440)}${heading('BEBIDAS',70,560)}${row('Refrigerante 2L',70,640)}${row('R$ 12,00',1050,640)}${heading('BORDAS RECHEADAS',70,760)}${row('Catupiry',70,850)}${row('R$ 8,00',1050,850)}</svg>`;
const columns=`<svg xmlns="http://www.w3.org/2000/svg" width="1700" height="800"><rect width="100%" height="100%" fill="#ffffff"/>${heading('PIZZAS',60,90)}${row('Calabresa G R$ 49,90',60,190)}${row('Molho, queijo e calabresa',60,255)}${row('Frango G R$ 52,90',60,370)}${row('Molho, queijo e frango',60,435)}${heading('BEBIDAS',1010,90)}${row('Refrigerante 2L R$ 12,00',1010,190)}${row('Suco R$ 8,00',1010,370)}${heading('BORDAS',1010,500)}${row('Catupiry R$ 8,00',1010,590)}</svg>`;
const staggered=columns.replace(heading('BEBIDAS',1010,90),heading('BEBIDAS',1010,140));

const darkWord=(text,x,y,size=32,color='#f9f4ec')=>'<text x="'+x+'" y="'+y+'" font-family="DejaVu Sans" font-size="'+size+'" fill="'+color+'">'+text+'</text>';
const dark='<svg xmlns="http://www.w3.org/2000/svg" width="1550" height="1100"><rect width="100%" height="100%" fill="#080808"/>'+
 darkWord('PIZZAS SALGADAS',65,125,50,'#f43333')+
 darkWord('Média',960,210,29)+darkWord('Grande',1230,210,29)+
 darkWord('Dois queijos M: 118 | G: 218',65,310,33)+darkWord('R$ 42',960,310)+darkWord('R$ 47',1230,310)+
 darkWord('Mussarela M: 101 | G: 201',65,430,33)+darkWord('R$ 42',960,430)+darkWord('R$ 47',1230,430)+
 darkWord('BEBIDAS',65,585,48,'#f43333')+
 darkWord('Coca-cola 600ml',65,685)+darkWord('R$ 9,00',1170,685)+'</svg>';

const fixtures=[['table',simple],['columns',columns],['staggered-columns',staggered],['photo',simple],['dark-sku',dark]];
for(const [name,svg] of fixtures){let image=sharp(Buffer.from(svg));if(name==='photo')image=image.rotate(2,{background:'#f5f0e7'}).modulate({brightness:.82}).jpeg({quality:72});else image=image.png();await image.toFile(path.join(out,`${name}.png`));}
const start=performance.now();const worker=await createWorker('por',OEM.LSTM_ONLY,{langPath:path.resolve('public/ocr/v7'),cachePath:out});
await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK,preserve_interword_spaces:'1'});
const setupMs=Math.round(performance.now()-start),report=[];
try{for(const [name] of fixtures){const started=performance.now(),{data}=await worker.recognize(path.join(out,`${name}.png`),{rotateAuto:true},{text:true,blocks:true});const words=data.blocks?.flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words.map(w=>({text:w.text,confidence:w.confidence,box:w.bbox})))));const lines=words?.length?arrangeMenuWords(words,name.includes('columns')?1700:1550):data.text.split('\n').map(text=>({text}));const result=readMenuPages([{id:name,lines}]);await writeFile(path.join(out,`${name}.json`),JSON.stringify({text:data.text,lines,result},null,2));report.push({name,ms:Math.round(performance.now()-started),items:result.items.length,ready:result.items.filter(readerItemReady).length,names:result.items.map(v=>v.name)});
 if(name==='table'||name==='photo'){assert.equal(result.items.length,4,name+': nenhum produto extra ou ausente');const pizza=result.items.find(v=>v.name.toLowerCase()==='calabresa');assert.ok(pizza,'Tabela: sabor ausente');assert.deepEqual(pizza.sizes,{p:2990,m:3990,g:4990});assert.ok(result.items.some(v=>v.kind==='simple'&&v.price===1200));assert.ok(result.items.some(v=>v.kind==='crust'&&v.price===800));}
 if(name==='dark-sku'){assert.equal(result.items.length,3,'Dark catalog: product count must match');assert.deepEqual(result.items.map(item=>item.name),['Dois queijos','Mussarela','Coca-cola 600ml']);assert.deepEqual(result.items[0].sizes,{p:null,m:4200,g:4700});assert.deepEqual(result.items[1].sizes,{p:null,m:4200,g:4700});assert.equal(result.items[2].kind,'simple');assert.equal(result.items[2].price,900);assert.ok(result.items.every(readerItemReady));}
 if(name.includes('columns')){assert.equal(result.items.length,5,name+': nenhum produto extra ou ausente');assert.ok(result.items.some(v=>v.name.toLowerCase()==='calabresa'&&v.sizes.g===4990),'Colunas: nome/preço da pizza');assert.ok(result.items.some(v=>v.kind==='simple'&&v.price===1200),'Colunas: bebida');assert.ok(result.items.some(v=>v.kind==='crust'&&v.price===800),'Colunas: borda');}
 const expected=name==='dark-sku'?[['Dois queijos','pizza',{p:null,m:4200,g:4700}],['Mussarela','pizza',{p:null,m:4200,g:4700}],['Coca-cola 600ml','simple',900]]:name.includes('columns')?[['Calabresa','pizza',{p:null,m:null,g:4990}],['Frango','pizza',{p:null,m:null,g:5290}],['Refrigerante 2L','simple',1200],['Suco','simple',800],['Catupiry','crust',800]]:[['Calabresa','pizza',{p:2990,m:3990,g:4990}],['Frango','pizza',{p:3290,m:4290,g:5290}],['Refrigerante 2L','simple',1200],['Catupiry','crust',800]];
 for(const [label,kind,price] of expected){const item=result.items.find(v=>v.name.toLowerCase()===label.toLowerCase());assert.ok(item,name+': nome ausente '+label);assert.equal(item.kind,kind,name+': categoria/tipo '+label);assert.deepEqual(kind==='pizza'?item.sizes:item.price,price,name+': preços '+label);}
 report.at(-1).priceFieldsChecked=name==='dark-sku'?5:name.includes('columns')?5:8;
 }}finally{await worker.terminate();}
await writeFile(path.join(out,'report.json'),JSON.stringify({setupMs,report},null,2));console.log(JSON.stringify({setupMs,report}));
