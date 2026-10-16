// Local OCR QA for an owner-supplied product detail screenshot. Never calls AI.
// Usage: node --experimental-strip-types scripts/check-menu-detail-ocr.mjs /absolute/screenshot.jpg
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {createWorker,OEM,PSM} from 'tesseract.js';
import {arrangeMenuWords,readMenuPages,readerItemReady} from '../lib/menu-reader-policy.ts';
const source=process.argv[2];if(!source||!path.isAbsolute(source))throw Error('Informe o caminho absoluto de uma captura autorizada de detalhe de produto.');
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),sharp=createRequire(wranglerRequire.resolve('miniflare/package.json'))('sharp');
const {width,height}=await sharp(source).metadata(),out=path.resolve('.sites-runtime/intake-qa');await mkdir(out,{recursive:true});
const worker=await createWorker('por',OEM.LSTM_ONLY,{langPath:path.resolve('public/ocr/v7'),cachePath:out});
try{await worker.setParameters({tessedit_pageseg_mode:height/width>1.6?PSM.AUTO:PSM.SINGLE_BLOCK,preserve_interword_spaces:'1'});const start=performance.now(),{data}=await worker.recognize(source,{rotateAuto:true},{text:true,blocks:true}),words=data.blocks?.flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words.map(w=>({text:w.text,confidence:w.confidence,box:w.bbox}))))),lines=arrangeMenuWords(words||[],width),result=readMenuPages([{id:'owner-detail',lines}]);
 assert.equal(result.items.length,1,'O detalhe deve trazer um produto base, sem transformar a interface em itens');const item=result.items[0];assert.ok(item.name.length>=3);if(item.reviewRequired){assert.equal(item.selected,false);assert.equal(readerItemReady(item),false);}
 const report={source:path.basename(source),ms:Math.round(performance.now()-start),mode:height/width>1.6?'AUTO':'SINGLE_BLOCK',items:result.items};await writeFile(path.join(out,'owner-detail-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({ms:report.ms,mode:report.mode,count:result.items.length,name:item.name,kind:item.kind,price:item.price,reviewRequired:!!item.reviewRequired,selected:item.selected}));
}finally{await worker.terminate();}
