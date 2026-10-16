// Public menu OCR benchmark: read-only and one source per run; do not commit the PDF or images.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createRequire} from 'node:module';
import {createWorker,OEM,PSM} from 'tesseract.js';
import {arrangeMenuWords,readMenuPages,readerItemReady,normalizeMenuText} from '../lib/menu-reader-policy.ts';

const source='https://4estylos.com.br/public/archives/CARDAPIO_PIZZARIA_2025.pdf';
const expectedSha='437c75008bda1d024215f2adcce0ce97fccbabb42e237a330219cc8f340816c1';
const directory=path.resolve('.sites-runtime/public-ocr-benchmark');
const temp=await import('node:fs/promises').then(fs=>fs.mkdtemp(path.join(tmpdir(),'pizzaria-public-ocr-')));
const run=promisify(execFile);
const require=createRequire(import.meta.url),wrangler=require(require.resolve('wrangler/package.json')),miniflare=createRequire(wrangler.resolve('miniflare/package.json')),sharp=miniflare('sharp');
await mkdir(directory,{recursive:true});
const references={
 11:[
  ['Dois queijos',{m:4200,g:4700}],['Mussarela',{m:4200,g:4700}],
  ['Marguerita',{m:4200,g:4800}],['Milho verde',{m:4300,g:4900}],
  ['Alho crocante',{m:4200,g:5000}],['Mista',{m:4200,g:5000}],
  ['Calabresa',{m:4400,g:5500}],['Calamilho',{m:4600,g:5700}],
 ],
 19:[
  ['Coca-cola 600ml',900],['Coca-cola 600ml zero',900],['Refrigerante 1Lt',1050],
  ['Coca-cola lata 350ml',700],['Coca-cola lata zero 350ml',700],['Refrigerante lata 350ml',650],
  ['Água saborizada 510 ml',800],['Scweppes Citrus lata 350ml',700],['Água 350ml',500],
  ['Água 350ml com gás',500],['Água copo 200ml',300],
  ['Refrigerante Coca cola 1Lt',1150],['Refrigerante Coca cola zero 1Lt',1150],
 ]};
let worker;
const report={source,sha256:expectedSha,fixturePages:[11,19],ready:0,matched:0,expected:21,pages:[],testMode:'observational',paidAiCalls:0,customerData:false};
try{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 let response;try{response=await fetch(source,{signal:controller.signal,headers:{accept:'application/pdf'}});}finally{clearTimeout(timer);}
 if(!response.ok||!response.headers.get('content-type')?.includes('pdf'))throw Error('Public PDF was not accessible as PDF: HTTP '+response.status);
 const parts=[];let bytes=0;for await(const part of response.body){bytes+=part.length;if(bytes>26000000)throw Error('PDF exceeded 26MB limit');parts.push(part);}
 const pdf=Buffer.concat(parts),checksum=createHash('sha256').update(pdf).digest('hex');
 assert.equal(checksum,expectedSha,'The public benchmark PDF has changed; re-review the reference before proceeding.');
 const pdfFile=path.join(temp,'reference.pdf');await writeFile(pdfFile,pdf);
 worker=await createWorker('por',OEM.LSTM_ONLY,{langPath:path.resolve('public/ocr/v7'),cachePath:temp});
 await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK,preserve_interword_spaces:'1'});
 for(const page of [11,19]){
   const dest=path.join(temp,'page-'+page);
   await run('pdftoppm',['-f',String(page),'-l',String(page),'-scale-to-y','2200','-png','-singlefile',pdfFile,dest],{timeout:60000});
   const metadata=await sharp(dest+'.png').metadata(),started=performance.now();
   const {data}=await worker.recognize(dest+'.png',{rotateAuto:true},{text:true,blocks:true});
   const words=data.blocks?.flatMap(block=>block.paragraphs.flatMap(p=>p.lines.flatMap(line=>line.words.map(w=>({text:w.text,confidence:w.confidence,box:w.bbox})))))||[];
   const lines=words.length?arrangeMenuWords(words,metadata.width):data.text.split('\n').map(text=>({text}));
   const parsed=readMenuPages([{id:'public-'+page,lines}]),ready=parsed.items.filter(readerItemReady);
   const comparisons=references[page].map(([name,value])=>{
     const item=parsed.items.find(i=>normalizeMenuText(i.name)===normalizeMenuText(name));
     const good=!!item&&readerItemReady(item)&&(typeof value==='number'?item.price===value:Object.entries(value).every(([key,price])=>item.sizes[key]===price));
     return {name,found:!!item,ready:!!item&&readerItemReady(item),priceExact:good};
   });
   const pageReport={page,imageSize:[metadata.width,metadata.height],durationMs:Math.round(performance.now()-started),recognized:parsed.items.length,ready:ready.length,unmatched:parsed.unmatched.length,exactNameMatches:comparisons.filter(c=>c.found).length,exactPriceMatches:comparisons.filter(c=>c.priceExact).length,expected:comparisons.length,checks:comparisons,issueSamples:parsed.items.slice(0,18).map(i=>({name:i.name,kind:i.kind,review:i.reviewRequired||false,issueCount:i.issues.length,price:i.price,sizes:i.sizes}))};
   report.pages.push(pageReport);report.ready+=ready.length;report.matched+=pageReport.exactPriceMatches;
 }
 await writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({expected:report.expected,exactPriceMatches:report.matched,ready:report.ready,pages:report.pages.map(p=>({page:p.page,ready:p.ready,recognized:p.recognized,matched:p.exactPriceMatches,expected:p.expected,durationMs:p.durationMs}))}));
}finally{
 await worker?.terminate().catch(()=>{});
 await rm(temp,{recursive:true,force:true});
}
