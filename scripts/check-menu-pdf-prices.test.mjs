import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {pdfMenuLines} from '../lib/menu-pdf-layout.ts';
import {arrangeMenuWords,menuAmount,readMenuPages,readerItemReady} from '../lib/menu-reader-policy.ts';
import {saveReading,loadReading,removeReading} from '../lib/menu-reader-storage.ts';

const span=(str,x,width,font=12,y=700)=>({str,width,height:font,transform:[font,0,0,font,x,y]});
const parse=items=>{const lines=pdfMenuLines([span('BEBIDAS',20,90,20,760),...items],[1,0,0,-1,0,800],1,600,800);return {lines,...readMenuPages([{id:'pdf',lines}])};};

test('PDF cents in a separate smaller span stay in the amount, including nonzero cents',()=>{
 for(const [integer,cents,expected] of [['10',',50',1050],['6',',50',650],['11',',50',1150],['9',',00',900]]){
  const {items}=parse([span('Refrigerante lata',20,140),span('R$',300,15,9),span(integer,320,22,18),span(cents,342,20,10)]);
  assert.equal(items.length,1);assert.equal(items[0].price,expected);assert.equal(readerItemReady(items[0]),true);
 }
 assert.equal(menuAmount('10 ,50'),1050);assert.equal(menuAmount('10 .50'),1050);
 assert.equal(menuAmount('1150'),115000,'No decimal separator can be invented');
 assert.equal(menuAmount('10 ,500'),null);
});

test('low confidence in the separate cents is included in OCR price confidence',()=>{
 const word=(text,x,width,confidence=96)=>({text,confidence,box:{x0:x,y0:80,x1:x+width,y1:100}});
 const lines=arrangeMenuWords([word('Refrigerante',20,120),word('R$',300,20),word('10',330,25),word(',50',356,28,35)],600);
 const item=readMenuPages([{id:'ocr',lines:[{text:'Bebidas'},...lines]}]).items[0];
 assert.equal(item.price,1050);assert.equal(readerItemReady(item),false);assert.equal(item.selected,false);
});

test('corrupted PDF font characters cannot become a confidently selected product',()=>{
 const {lines,items}=parse([span('¡gua mineral',20,140),span('R$ 5,00',400,60)]);
 assert.equal(lines.find(l=>l.text.includes('¡gua')).textUncertain,true);
 assert.equal(items[0].name,'¡gua mineral');assert.equal(items[0].price,500);
 assert.equal(readerItemReady(items[0]),false);assert.equal(items[0].selected,false);assert.match(items[0].issues.join(' '),/caracteres ilegíveis/);
});

test('unresolved distant product columns in a PDF stay unselected',()=>{
 const {lines,items}=parse([span('Sonho de valsa',20,110),span('Bacon',250,50),span('Tomate',460,55),span('R$ 2,50',530,55)]);
 assert.equal(lines.find(l=>l.text.includes('Sonho')).layoutUncertain,true);
 assert.equal(readerItemReady(items[0]),false);assert.equal(items[0].selected,false);
 assert.match(items[0].issues.join(' '),/misturar colunas/);
});

test('an ordinary product with a distant right-aligned price remains ready',()=>{
 const {lines,items}=parse([span('Água mineral sem gás',20,190),span('R$ 5,50',500,60)]);
 assert.ok(lines.every(l=>!l.layoutUncertain&&!l.textUncertain));
 assert.equal(items[0].price,550);assert.equal(readerItemReady(items[0]),true);
});

test('PDF ambiguity flags survive browser storage and a fresh parsing pass',async()=>{
 const id='pdf-flags-'+crypto.randomUUID(),page={id:'pdf',name:'cardapio.pdf',image:'data:image/jpeg;base64,AA==',width:600,height:800,lines:[{text:'Bebidas'},{text:'Produto R$ 5,00',textUncertain:true,layoutUncertain:true}]};
 await saveReading({restaurantId:id,savedAt:Date.now(),pages:[page],items:[],unmatched:[]});
 try{const saved=await loadReading(id);assert.equal(saved.pages[0].lines[1].textUncertain,true);assert.equal(saved.pages[0].lines[1].layoutUncertain,true);assert.equal(readerItemReady(readMenuPages(saved.pages).items[0]),false);}finally{await removeReading(id);}
});
