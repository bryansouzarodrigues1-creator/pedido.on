import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {retainedMenuPages,hasLegacyMenuPdf,MENU_PDF_READER_VERSION} from '../lib/menu-pdf-source.ts';
import {saveReading,loadReading,removeReading} from '../lib/menu-reader-storage.ts';

const page=(name,id='page')=>({id,name,image:'data:image/jpeg;base64,AAAA',width:650,height:850,lines:[]});

test('re-uploading a seven-page PDF frees its own slots and retains other sources without mutating the old reading',()=>{
 const pages=[...Array.from({length:7},(_,i)=>page(`menu.pdf · p. ${i+1}`,`pdf-${i}`)),page('outra-foto.jpg','photo')];
 const original=structuredClone(pages),remaining=retainedMenuPages(pages,[{name:'menu.pdf',type:'application/pdf'}]);
 assert.deepEqual(remaining.map(p=>p.id),['photo']);assert.deepEqual(pages,original);
 assert.equal(8-remaining.length,7,'The replacement fits even when all eight slots were used');
});

test('a replacement matches only the same PDF name and generated page suffix',()=>{
 const pages=[page('menu.pdf · p. 1'),page('menu-outro.pdf · p. 1','other'),page('menu.pdf · p. 1 copy','photo')];
 assert.deepEqual(retainedMenuPages(pages,[{name:'menu.pdf',type:''}]).map(p=>p.id),['other','photo']);
 assert.equal(retainedMenuPages(pages,[{name:'menu.jpg',type:'image/jpeg'}]).length,3);
});

test('PDF reader version survives storage and old readings stay recognizable without deleting their pages',async()=>{
 const id='pdf-version-qa',old=page('menu.pdf · p. 1'),fresh={...old,pdfReaderVersion:MENU_PDF_READER_VERSION};
 assert.equal(hasLegacyMenuPdf([old]),true);assert.equal(hasLegacyMenuPdf([fresh]),false);
 assert.equal(hasLegacyMenuPdf([page('foto.jpg')]),false);
 try{
  await saveReading({restaurantId:id,savedAt:Date.now(),pages:[fresh],items:[],unmatched:[],text:''});
  const saved=await loadReading(id);assert.ok(saved);assert.equal(saved.pages[0].pdfReaderVersion,MENU_PDF_READER_VERSION);assert.equal(hasLegacyMenuPdf(saved.pages),false);
 }finally{await removeReading(id);}
});
