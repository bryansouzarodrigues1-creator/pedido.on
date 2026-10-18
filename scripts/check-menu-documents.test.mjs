import test from 'node:test';
import assert from 'node:assert/strict';
import {pdfMenuLines} from '../lib/menu-pdf-layout.ts';
import {readMenuAttachment,savedMenuPage} from '../lib/menu-attachment.ts';
import {readMenuPages} from '../lib/menu-reader-policy.ts';
const read=text=>readMenuPages([{id:'document',lines:text.split('\n').map(text=>({text}))}]).items;
const url='https://www.ifood.com.br/delivery/cabo-frio-rj/forno-azul-de-teste/900caad5-258e-4bf7-9458-353cb0bffe60';
test('PDF text geometry keeps table columns and prices with their own product',()=>{
 const row=(str,x,y,width)=>({str,width,height:12,transform:[12,0,0,12,x,y]});
 const lines=pdfMenuLines([row('PIZZAS',30,750,60),row('P',260,710,10),row('G',360,710,10),row('Calabresa',30,670,100),row('32,90',260,670,40),row('52,90',360,670,40),row('Margherita',30,630,100),row('35,90',260,630,40),row('55,90',360,630,40)],[1,0,0,-1,0,842],1,595,842);
 const items=readMenuPages([{id:'pdf',lines}]).items;
 assert.equal(items.length,2);assert.deepEqual(items[0].sizes,{p:3290,m:null,g:5290});assert.deepEqual(items[1].sizes,{p:3590,m:null,g:5590});
 for(const line of lines)if(line.box)assert.ok(line.box.x0>=0&&line.box.y0>=0&&line.box.x1<=595&&line.box.y1<=842);
});
test('TXT accepts UTF-8 and Windows-1252 without corrupting Portuguese names',async()=>{
 for(const file of [new File(['BEBIDAS\nÁgua mineral R$ 5,00'],'menu.txt',{type:'text/plain'}),new File([Uint8Array.from(Buffer.from('BEBIDAS\nÁgua mineral R$ 5,00','latin1'))],'menu.txt')]){
  const result=await readMenuAttachment(file);assert.equal(read(result.text)[0].name,'Água mineral');assert.equal(read(result.text)[0].price,500);assert.deepEqual(result.pages,[]);
 }
});
test('saved iFood pages recover explicit store facts and products without evaluating HTML',()=>{
 const data={'@type':'Restaurant',url,name:'Forno Azul de Teste',address:{streetAddress:'Rua Fornalha de Teste, 184',addressLocality:'Cabo Frio',addressRegion:'RJ'},openingHours:'Tu-Su 18:00-23:30',hasMenu:{'@type':'Menu',hasMenuSection:[{'@type':'MenuSection',name:'Bebidas',hasMenuItem:[{'@type':'MenuItem',name:'Suco de laranja',offers:{price:'12.50',priceCurrency:'BRL'}}]}]}};
 const result=savedMenuPage(`<link rel="canonical" href="${url}"><script type="application/ld+json">${JSON.stringify(data)}</script><script>throw new Error('never execute')</script><img src="https://invalid.test/leak">`);
 assert.equal(result.source.url,url);assert.equal(result.source.store.name,'Forno Azul de Teste');assert.match(result.source.store.address,/184/);assert.match(result.source.store.hours,/23:30/);assert.equal(read(result.text)[0].price,1250);assert.doesNotMatch(result.text,/never execute|invalid.test/);
});
test('saved visible HTML can be read without inventing store facts from a URL',()=>{
 const result=savedMenuPage('<head><title>Ignore</title></head><script>bad()</script><div>BEBIDAS</div><p>&Aacute;gua mineral R$ 5,00</p>');
 assert.equal(result.source,undefined);assert.doesNotMatch(result.text,/bad\(|Ignore/);assert.equal(read(result.text)[0].price,500);
 assert.throws(()=>savedMenuPage('<script>only code</script>'),/não contém os produtos/);
 assert.throws(()=>savedMenuPage('a'.repeat(1500001)),/1,5 MB/);
});
test('document limits and unknown files fail without returning partial content',async()=>{
 await assert.rejects(readMenuAttachment(new File(['x'.repeat(240001)],'menu.txt')),/60 mil/);
 await assert.rejects(readMenuAttachment(new File(['anything'],'menu.exe')),/TXT ou CSV/);
 await assert.rejects(readMenuAttachment(new File(['not PDF'],'menu.pdf',{type:'application/pdf'})),/PDF válido/);
});
