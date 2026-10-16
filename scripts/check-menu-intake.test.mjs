import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readMenuPages,readerItemReady,applyReaderItems} from '../lib/menu-reader-policy.ts';
import {defaultRestaurant} from '../lib/domain.ts';
import {menuFileText} from '../lib/menu-file.ts';
import {structuredIfoodMenu,importIfoodLink} from '../lib/ifood-import.ts';
import {fixture} from './test-backend-fixture.mjs';
const url='https://www.ifood.com.br/delivery/cabo-frio-rj/aione-pizzas-jardim-pero/900caad5-258e-4bf7-9458-353cb0bffe60';
const read=text=>readMenuPages([{id:'source',lines:text.split('\n').map(text=>({text}))}]);
test('screenshot product detail excludes the merchant rating, delivery fee, optional beverage and photo noise',()=>{
 const result=read('q- R$ Mm 249\nF: ese. sê\nne\nDelícias Burguer - Hamburgueria\n4,7 (376) · 40-50 min · R$ 9,00\nX tudo\nPão artesanal, alface, tomate, carne de hambúrguer,\ncheddar, mussarela, presunto, ovo, calabresa, bacon,\nbatata palha.\nPra voltar a pedir\nNão aceito com alguns cupons\nR$ 0,90 R$ 34,99\nDeseja uma bebida gelada?\nEscolha até 6 opções\nGuaraná Antártica lata\n+ R$ 7,99\nO preço com desconto aparece na sacola\n1 Adicionar R$ 0,90');
 assert.equal(result.items.length,1);const item=result.items[0];assert.equal(item.name,'X tudo');assert.equal(item.kind,'simple');assert.equal(item.price,90);assert.match(item.description,/batata palha/);assert.equal(item.selected,false);assert.equal(readerItemReady(item),false);assert.throws(()=>applyReaderItems(defaultRestaurant('Teste'),[{...item,selected:true}]),/preços e tamanhos/);assert.equal(readerItemReady({...item,reviewRequired:false,price:3499}),true);
});
test('unpriced OCR rubbish and interface prices never become product cards',()=>{const result=read('Sa\nF: ese. sê\nne\n*4,7 40-50 min * R$ 9,00\nBebidas\nSuco R$ 8,00\nAdicionar R$ 8,00');assert.deepEqual(result.items.map(i=>i.name),['Suco']);assert.ok(result.unmatched.length>=4);});
test('a low-confidence priced row needs explicit review before bulk selection can import it',()=>{const result=readMenuPages([{id:'p',lines:[{text:'Bebidas'},{text:'Suco R$ 8,00',confidence:62}]}]);assert.equal(result.items.length,1);assert.equal(result.items[0].selected,false);assert.equal(readerItemReady(result.items[0]),false);assert.equal(readerItemReady({...result.items[0],reviewRequired:false}),true);});
test('the CSV template and quoted custom categories preserve prices, sizes and descriptions',()=>{
 const text=menuFileText('modelo.csv',readFileSync(new URL('../public/modelo-cardapio.csv',import.meta.url),'utf8')),items=read(text).items;assert.equal(items.length,2);assert.deepEqual(items[0].sizes,{p:2990,m:3990,g:4990});assert.equal(items[1].price,1200);assert.equal(items[1].kind,'simple');
 const custom=read(menuFileText('menu.csv','nome;categoria;tipo;descricao;preco\n"Combo; da casa";Promoções especiais;simple;"Pizza, bebida";79,90')).items;assert.equal(custom.length,1);assert.equal(custom[0].name,'Combo; da casa');assert.equal(custom[0].category,'Promoções especiais');assert.equal(custom[0].price,7990);
 assert.throws(()=>menuFileText('menu.csv','nome;preco\nCalabresa;xyz'),/preço/);assert.throws(()=>menuFileText('menu.exe','x'),/TXT ou CSV/);assert.throws(()=>menuFileText('menu.csv','nome;preco\n"aberto;5'),/aspas/);
});
test('public iFood extraction uses actual MenuItem offers, not ratings, delivery fees or a slug name',async()=>{
 const html='<script type="application/ld+json">'+JSON.stringify({'@type':'Restaurant',name:'Loja',aggregateRating:{ratingValue:4.7,ratingCount:376},hasMenu:{'@type':'Menu',hasMenuSection:[{'@type':'MenuSection',name:'Bebidas',hasMenuItem:[{'@type':'MenuItem',name:'Suco',description:'Suco de laranja',offers:{price:'8.50',priceCurrency:'BRL'}},{'@type':'MenuItem',name:'Preço estrangeiro',offers:{price:'4',priceCurrency:'USD'}}]}]}})+'</script>';
 assert.equal(structuredIfoodMenu(html).count,1);let calls=0;const imported=await importIfoodLink(url,async(target,opts)=>{calls++;assert.equal(target,url);assert.equal(opts.redirect,'manual');return new Response(html,{headers:{'Content-Type':'text/html'}});});assert.equal(calls,1);assert.equal(imported.status,'imported');assert.equal(read(imported.text).items[0].price,850);
});
test('iFood block, redirects, non-HTML and oversized streams report a real content requirement',async()=>{
 for(const response of [new Response('blocked',{status:403}),new Response('',{status:302,headers:{Location:'http://127.0.0.1'}}),Response.json({name:'No catalogue'}),new Response('x',{headers:{'Content-Type':'text/html','Content-Length':'1500001'}}),new Response('x'.repeat(1500001),{headers:{'Content-Type':'text/html'}})]){const result=await importIfoodLink(url,async()=>response);assert.equal(result.status,'needs_content');assert.equal(result.count,0);assert.equal(result.text,'');assert.match(result.message,/TXT\/CSV/);}
 let calls=0;for(const bad of ['http://127.0.0.1/','https://www.ifood.com.br.evil.test/a',url.replace('https:','http:')])await assert.rejects(importIfoodLink(bad,async()=>{calls++;}),/link completo/);assert.equal(calls,0);
});
test('the anonymous source endpoint bounds requests, checks origin and returns the provider block truthfully',async()=>{
 const f=fixture(),original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response('blocked',{status:403});};
 try{const route=f.load('app/api/menu-source/route.ts'),req=(origin,body)=>new Request('https://pedido.example/api/menu-source',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':'203.0.113.2'},body:JSON.stringify(body)});assert.equal((await route.POST(req('https://evil.test',{url}))).status,403);assert.equal((await route.POST(req('https://pedido.example',{url:'http://127.0.0.1'}))).status,400);assert.equal(calls,0);const response=await route.POST(req('https://pedido.example',{url}));assert.equal(response.status,200);assert.equal((await response.json()).status,'needs_content');assert.equal(calls,1);for(let i=0;i<5;i++)await route.POST(req('https://pedido.example',{url}));assert.equal((await route.POST(req('https://pedido.example',{url}))).status,429);assert.equal(calls,6);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM studio_jobs').get().n,0);}finally{globalThis.fetch=original;f.close();}
});
