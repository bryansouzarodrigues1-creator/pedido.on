import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {structuredMenuStore} from '../lib/menu-store-info.ts';
import {importIfoodLink} from '../lib/ifood-import.ts';
const f=JSON.parse(readFileSync(new URL('./fixtures/owner-intake-forno-azul.json',import.meta.url)));
const business={'@type':'Restaurant',name:f.name,url:f.url,address:{'@type':'PostalAddress',streetAddress:'Rua Fornalha de Teste, 137, Bairro Fictício',addressLocality:'Armação dos Búzios',addressRegion:'RJ',addressCountry:'BR'},telephone:f.whatsapp,openingHoursSpecification:{'@type':'OpeningHoursSpecification',dayOfWeek:['Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],opens:'18:00',closes:'23:30'}};
const html=value=>'<script type="application/ld+json">'+JSON.stringify(value)+'</script>';
test('public restaurant metadata supplies only explicit facts, including overnight-safe hours and a telephone suggestion',()=>{
 assert.deepEqual(structuredMenuStore(html(business),f.url),{name:f.name,address:f.address,hours:f.hours,telephone:f.whatsapp});
 const night={...business,openingHoursSpecification:{dayOfWeek:'https://schema.org/Saturday',opens:'18:00',closes:'00:00'}};
 assert.equal(structuredMenuStore(html(night),f.url).hours,'sábado, 18:00 às 00:00');
});
test('footer corporate data, other stores and conflicting businesses cannot become the owner address',()=>{
 assert.equal(structuredMenuStore(html({'@type':'Organization',name:'iFood',address:business.address}),f.url),undefined);
 assert.equal(structuredMenuStore(html({...business,url:f.url.replace('000000000050','000000000051')}),f.url),undefined);
 assert.equal(structuredMenuStore(html({'@graph':[business,{...business,name:'Outra loja'}]}),f.url),undefined);
 assert.deepEqual(structuredMenuStore('<footer>Rua da plataforma, 100. Abre amanhã 11h</footer>',f.url),undefined);
});
test('incomplete or invalid hours and addresses are omitted instead of invented',()=>{
 const data=structuredMenuStore(html({...business,address:{addressLocality:'Búzios'},openingHoursSpecification:{dayOfWeek:'Someday',opens:'25:00',closes:'23:30'},telephone:'0800 invalid'}),f.url);
 assert.deepEqual(data,{name:f.name});
 assert.equal(structuredMenuStore(html({...business,openingHoursSpecification:undefined,openingHours:'Tu-Su 18:00-23:30'}),f.url).hours,f.hours);
});
test('business metadata can be offered for confirmation even when products are not publicly exposed',async()=>{
 const r=await importIfoodLink(f.url,async()=>new Response(html(business),{headers:{'content-type':'text/html'}}));
 assert.equal(r.status,'needs_content');assert.equal(r.count,0);assert.equal(r.store.address,f.address);assert.match(r.message,/Confira/);
 const denied=await importIfoodLink(f.url,async()=>new Response('Forbidden',{status:403}));assert.equal(denied.store,undefined);assert.equal(denied.count,0);
});
