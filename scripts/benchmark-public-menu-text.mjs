// Read-only regression against the same public PDF used by the OCR benchmark.
// This checks PDF.js digital text separately; it does not measure photo OCR.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {pdfMenuLines} from '../lib/menu-pdf-layout.ts';
import {readMenuPages,readerItemReady} from '../lib/menu-reader-policy.ts';

const source='https://4estylos.com.br/public/archives/CARDAPIO_PIZZARIA_2025.pdf';
const sha256='437c75008bda1d024215f2adcce0ce97fccbabb42e237a330219cc8f340816c1';
let bytes;
if(process.env.QA_MENU_PDF_PATH)bytes=await readFile(process.env.QA_MENU_PDF_PATH);
else{
 const response=await fetch(source,{signal:AbortSignal.timeout(30000),headers:{accept:'application/pdf'}});
 assert.ok(response.ok&&response.headers.get('content-type')?.includes('pdf'),'Expected the public PDF');
 const parts=[];let size=0;
 for await(const part of response.body){size+=part.length;if(size>26000000)throw Error('PDF exceeded 26MB limit');parts.push(part);}
 bytes=Buffer.concat(parts);
}
assert.equal(createHash('sha256').update(bytes).digest('hex'),sha256,'Re-review a changed reference PDF');
const pdf=await getDocument({data:new Uint8Array(bytes),isEvalSupported:false}).promise;
const report={source,sha256,pages:[],checks:[],paidAiCalls:0,customerData:false,mode:'PDF.js digital text, not photo OCR'};
try{
 for(const n of [11,19]){
  const page=await pdf.getPage(n),original=page.getViewport({scale:1});
  const scale=Math.min(2.5,2600/Math.max(original.width,original.height),Math.sqrt(4500000/(original.width*original.height)));
  const viewport=page.getViewport({scale}),content=await page.getTextContent();
  const lines=pdfMenuLines(content.items.filter(v=>'str' in v),viewport.transform,scale,Math.floor(viewport.width),Math.floor(viewport.height));
  const result=readMenuPages([{id:'public-pdf-'+n,lines}]);
  report.pages.push({page:n,items:result.items.length,ready:result.items.filter(readerItemReady).length,fontWarnings:lines.filter(l=>l.textUncertain).length,layoutWarnings:lines.filter(l=>l.layoutUncertain).length});
  if(n===19){
   // "Refigerante" is the spelling printed in the source, not a correction.
   for(const [name,expected] of [['Refrigerante 1Lt',1050],['Refigerante lata 350ml',650],['Refrigerante Coca cola 1Lt',1150],['Refrigerante Coca cola zero 1Lt',1150]]){
    const item=result.items.find(i=>i.name===name);assert.ok(item,name);assert.equal(item.price,expected,name);assert.equal(readerItemReady(item),true,name);
    report.checks.push({name,price:expected,exact:true});
   }
   const corrupt=result.items.find(i=>i.name.startsWith('¡gua'));assert.ok(corrupt);assert.equal(readerItemReady(corrupt),false);assert.equal(corrupt.selected,false);
   report.checks.push({name:'Corrupted PDF font requires review',ok:true});
  }else{
   const mixed=result.items.find(i=>i.name==='Sonho de valsa Bacon Tomate');assert.ok(mixed);assert.equal(readerItemReady(mixed),false);assert.equal(mixed.selected,false);
   report.checks.push({name:'Unresolved product columns require review',ok:true});
  }
 }
}finally{await pdf.destroy();}
const directory=path.resolve('.sites-runtime/public-pdf-text-benchmark');await mkdir(directory,{recursive:true});
await writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
