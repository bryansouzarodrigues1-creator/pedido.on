import {createRequire} from 'node:module';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..');
const tesseract=path.dirname(require.resolve('tesseract.js/package.json'));
const core=path.dirname(createRequire(path.join(tesseract,'package.json')).resolve('tesseract.js-core/package.json'));
const out=path.join(root,'public/ocr/v7');await mkdir(out,{recursive:true});
await copyFile(path.join(tesseract,'dist/worker.min.js'),path.join(out,'worker.min.js'));
for(const flavor of ['lstm','simd-lstm','relaxedsimd-lstm'])await copyFile(path.join(core,`tesseract-core-${flavor}.wasm.js`),path.join(out,`tesseract-core-${flavor}.wasm.js`));
const expected='7b0f1749aa255a593b14160c75f74690be740edcae94c5a45efc24ab50235f4d';
let bytes;try{bytes=await readFile(path.join(out,'por.traineddata.gz'));}catch{}
if(!bytes){
  // Both URLs publish the same asset in naptha/tessdata. An official-domain
  // DNS outage must not block releases; the pinned SHA still governs trust.
  for(const url of [
    'https://tessdata.projectnaptha.com/4.0.0_fast/por.traineddata.gz',
    'https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0_fast/por.traineddata.gz'
  ])try{
    const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12000)});
    if(res.ok){bytes=Buffer.from(await res.arrayBuffer());break;}
  }catch{/* Try the checksum-pinned mirror. */}
  if(!bytes)throw Error('Não foi possível preparar o idioma OCR em nenhuma das duas fontes conferidas.');
}
if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('O arquivo de idioma OCR difere da versão conferida.');
await writeFile(path.join(out,'por.traineddata.gz'),bytes);
await copyFile(path.join(tesseract,'LICENSE.md'),path.join(out,'TESSERACT-LICENSE.txt'));
await copyFile(path.join(core,'LICENSE'),path.join(out,'TESSERACT-CORE-LICENSE.txt'));
console.log('OCR v7 e português preparados na mesma origem do aplicativo; nenhuma chamada a modelo.');
