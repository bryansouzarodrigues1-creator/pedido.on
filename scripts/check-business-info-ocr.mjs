import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createWorker,OEM,PSM} from 'tesseract.js';
import {createRequire} from 'node:module';
import {readBusinessInfo} from '../lib/business-info-reader.ts';
import {enhanceDarkMenuCrop} from '../lib/menu-ocr-refinement.ts';
import {businessInfoFixtures,businessInfoExpectedHours} from './business-info-fixtures.mjs';
const output=path.resolve('.sites-runtime/business-info-ocr'),fixtures=await businessInfoFixtures(output),report=[];
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),miniflareRequire=createRequire(wranglerRequire.resolve('miniflare/package.json')),sharp=miniflareRequire('sharp');
await mkdir(output,{recursive:true});const worker=await createWorker('por',OEM.LSTM_ONLY,{langPath:path.resolve('public/ocr/v7'),cachePath:output});
try{await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK,preserve_interword_spaces:'1'});
 for(const [name,file] of Object.entries(fixtures)){
  const started=performance.now(),pixels=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),enhanced=enhanceDarkMenuCrop(new Uint8ClampedArray(pixels.data),pixels.info.width,pixels.info.height,false),input=await sharp(Buffer.from(enhanced),{raw:{width:pixels.info.width,height:pixels.info.height,channels:4}}).png().toBuffer();
  const {data}=await worker.recognize(input,{rotateAuto:true},{text:true,blocks:true});
  const lines=data.blocks?.flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines.map(line=>({text:line.words.map(word=>word.text).join(' '),confidence:Math.min(...line.words.map(word=>word.confidence))}))))||data.text.split('\n').map(text=>({text}));
  const result=readBusinessInfo([{id:name,lines}]),get=field=>result.suggestions.filter(s=>s.field===field);
  await writeFile(path.join(output,name+'.json'),JSON.stringify({text:data.text,lines,result},null,2));
  if(name.startsWith('google')){
   assert.equal(get('hours').length,1,name);assert.equal(get('hours')[0].value,businessInfoExpectedHours,name);
   assert.equal(get('address')[0].value,'Rua das Palmeiras, 42 - Centro',name);assert.equal(get('whatsapp')[0].value,'(22) 99999-1234',name);
  }else{
   assert.equal(get('hours')[0].value,'Terça a domingo, das 18h às 23h');assert.equal(get('address')[0].value,'Avenida das Flores, 75');assert.equal(get('whatsapp')[0].value,'(22) 98888-4321');assert.equal(get('eta')[0].value,'30 a 50 min');
  }
  assert.match(result.text,/15\/11\/2026/,'Dates remain literal text, without a timezone conversion');
  report.push({fixture:name,passed:true,ms:Math.round(performance.now()-started),fields:result.suggestions.map(s=>s.field),scope:'OCR real em documento sintético, sem API paga'});
 }
}finally{await worker.terminate();await writeFile(path.join(output,'summary.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));
