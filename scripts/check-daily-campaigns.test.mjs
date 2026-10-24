import test from 'node:test';
import assert from 'node:assert/strict';
import {demoRestaurant,restaurantSchema} from '../lib/domain.ts';
import {dailyCampaigns,brazilDay,campaignMessage,campaignPromotion,campaignFingerprint} from '../lib/daily-campaigns.ts';
import {fetchMenuSource} from '../lib/menu-source-client.ts';
import {assistanceSource,rememberAssistanceLink,pendingAssistanceLink,clearAssistanceLink} from '../lib/menu-assistance-client.ts';
import {installWasDismissed,dismissInstall,installDismissedKey} from '../lib/pwa-preference.ts';
const now=new Date('2026-10-25T01:30:00Z');
test('daily suggestions rotate on the Brazil day and use available pizzas, exact prices, sizes and owned photos without changing the menu',()=>{
 const data=demoRestaurant();data.products=data.products.map(p=>({...p,image:'/media/shop/'+p.id+'.jpg'}));const before=JSON.stringify(data),ideas=dailyCampaigns(data,now);
 assert.equal(brazilDay(now),'2026-10-24');assert.equal(ideas.length,3);assert.deepEqual(dailyCampaigns(data,now),ideas);assert.notDeepEqual(dailyCampaigns(data,new Date('2026-10-25T03:01:00Z')),ideas);
 for(const idea of ideas){assert.ok(idea.price>0);assert.ok(idea.photos.every(p=>p.startsWith('/media/shop/')));for(const part of idea.items){const p=data.products.find(p=>p.id===part.productId);assert.equal(p.enabled,true);if(p.kind==='pizza')assert.ok(p.sizes[part.size]>0);}assert.ok(restaurantSchema.safeParse({...data,promotions:[campaignPromotion(idea,now)]}).success);}
 assert.equal(JSON.stringify(data),before);assert.deepEqual(dailyCampaigns({...data,products:data.products.map(p=>({...p,enabled:false}))},now),[]);
});
test('copy for WhatsApp and Status has exact prices and no invented discount; bundles require approval; expired promotions cannot leak an old price',()=>{
 const data=demoRestaurant(),first=dailyCampaigns(data,now)[0],item=first.items[0];
 for(const format of ['whatsapp','status']){const text=campaignMessage(data,first,'https://example.test/p/casa',format);assert.ok(text.includes('https://example.test/p/casa'));assert.match(text,/Entrega à parte/);assert.doesNotMatch(text,/grátis|\d+%|desconto/i);assert.ok(text.length<650);}
 assert.throws(()=>campaignMessage(data,dailyCampaigns(data,now).find(p=>p.kind==='bundle'),'x'),/publique/);
 const offer={id:'offer',productId:item.productId,size:item.size,price:1000,startsAt:'2026-10-24T00:00:00Z',endsAt:'2026-10-25T02:00:00Z',enabled:true};
 const discounted=dailyCampaigns({...data,promotions:[offer]},now).find(c=>c.kind==='product'&&c.items[0].productId===item.productId);assert.equal(discounted.price,1000);
 const expired=dailyCampaigns({...data,promotions:[offer]},new Date('2026-10-25T02:01:00Z')).find(c=>c.id===discounted.id);assert.notEqual(expired.price,1000);
 assert.notEqual(campaignFingerprint(data,first),campaignFingerprint({...data,name:'Outro nome'},first));
});
test('shared iFood messages become a private request reference, never an automatic remote query',async()=>{
 const url='https://www.ifood.com.br/delivery/cabo-frio-rj/acai---maria/123e4567-e89b-42d3-a456-426614174000',message='Esse lugar é a sua cara! Use o ícone de coração para salvá-lo em seus Favoritos.\nAçaí Maria -\n'+url;
 assert.equal(assistanceSource(message).url,url);assert.equal(assistanceSource('https://evil.test/menu'),null);assert.equal(assistanceSource(message+'\nhttps://www.ifood.com.br/delivery/teste-rj/outra/123e4567-e89b-42d3-a456-426614174001'),null);
 const old=globalThis.fetch,storage=globalThis.localStorage,map=new Map();globalThis.fetch=()=>{throw Error('Remote fetching forbidden');};globalThis.localStorage={getItem:key=>map.get(key)||null,setItem:(key,v)=>map.set(key,v),removeItem:key=>map.delete(key)};
 try{rememberAssistanceLink(message);assert.equal(pendingAssistanceLink(),url);const result=await fetchMenuSource(url);assert.equal(result.count,0);assert.equal(result.status,'needs_content');assert.match(result.message,/equipe/);assert.equal(map.size,1);clearAssistanceLink();assert.equal(pendingAssistanceLink(),'');}finally{globalThis.fetch=old;globalThis.localStorage=storage;}
});
test('closing installation persists without expiry and survives blocked storage in the current session',()=>{
 const map=new Map(),storage={getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};assert.equal(installWasDismissed(storage),false);dismissInstall(storage);assert.equal(map.get(installDismissedKey),'1');assert.equal(installWasDismissed(storage),true);assert.equal(installWasDismissed({getItem(){throw Error('blocked');}}),true);assert.doesNotThrow(()=>dismissInstall({setItem(){throw Error('blocked');}}));
});
