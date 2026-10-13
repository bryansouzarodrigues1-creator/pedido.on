import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture,site} from './test-backend-fixture.mjs';
import {readAdminQuery,adminPeriod,changePercent} from '../lib/admin-analytics-policy.ts';

const now=new Date('2026-10-13T02:15:00.000Z'); // still October 12 in São Paulo
const query=patch=>({...readAdminQuery(new URLSearchParams()),days:'7',...patch});
function order(f,id,shop,status,total,created='2026-10-12T20:00:00.000Z',payment='pay_on_delivery'){
 f.db.prepare('INSERT INTO orders (id,restaurant_id,request_id,customer,phone,data,total,status,payment_status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,shop,id,'BUYER_PRIVATE_SENTINEL','PHONE_PRIVATE_SENTINEL','{"address":"ADDRESS_PRIVATE_SENTINEL","note":"NOTE_PRIVATE_SENTINEL"}',total,status,payment,created);
}
function snapshot(f){return JSON.stringify(['restaurants','orders','image_jobs','studio_jobs','account_profiles','account_trials'].map(table=>f.db.prepare('SELECT * FROM '+table).all()));}
async function get(f,params=''){return f.dispatch('adminAnalytics','GET',new Request(site+'/api/admin/analytics'+params),{});}

test('analytics rejects anonymous and other accounts before reading or parsing metrics',async()=>{
 const f=fixture();try{f.env.PLATFORM_ADMIN_ACCOUNT_ID='owner-a';f.state.user=null;assert.equal((await get(f,'?days=invalid')).status,401);f.state.user={userId:'owner-b',email:'owner@example.test',displayName:'Pretends admin'};assert.equal((await get(f)).status,403);f.state.user={userId:'owner-a',email:'owner@example.test',displayName:'Owner'};const ok=await get(f);assert.equal(ok.status,200,await ok.clone().text());assert.match(ok.headers.get('Cache-Control'),/no-store/);assert.equal((await get(f,'?days=365')).status,400);assert.equal((await get(f,'?page=-1')).status,400);}finally{f.close();}
});
test('received orders and merchant-confirmed value exclude canceled, unconfirmed and future orders correctly',async()=>{
 const f=fixture();try{
 order(f,'confirmed','shop-a','confirmed',5000);order(f,'done','shop-b','delivered',10000);order(f,'cancel','shop-a','canceled',7000,undefined,'approved');order(f,'pix','shop-a','awaiting_payment',1000,undefined,'pending');order(f,'proof','shop-b','awaiting',2000,undefined,'proof_sent');order(f,'previous','shop-a','confirmed',3000,'2026-10-01T20:00:00.000Z');order(f,'future','shop-a','delivered',90000,'2026-10-14T00:00:00.000Z');
 const before=snapshot(f),report=await f.load('lib/admin-analytics.ts').adminAnalytics(query(),now);
 assert.equal(report.summary.received,5);assert.equal(report.summary.confirmed,2);assert.equal(report.summary.confirmedValue,15000);assert.equal(report.summary.ticket,7500);assert.equal(report.summary.delivered,1);assert.equal(report.summary.canceled,1);assert.equal(report.summary.pending,2);assert.equal(report.summary.shopsWithOrders,2);assert.equal(report.previous.received,1);assert.equal(report.summary.receivedChange,400);
 assert.equal(report.trend.reduce((sum,point)=>sum+point.received,0),5);assert.equal(report.trend.find(p=>p.day==='2026-10-12').received,5);assert.equal(report.restaurants.rows.find(p=>p.id==='shop-a').lastOrderEver,'2026-10-12T20:00:00.000Z');assert.equal(snapshot(f),before);
 }finally{f.close();}
});
test('period boundaries use Brasília days across UTC midnight and include the exact start once',async()=>{
 const period=adminPeriod(7,now);assert.equal(period.start,'2026-10-06T03:00:00.000Z');assert.equal(period.previousStart,'2026-09-29T03:00:00.000Z');assert.equal(period.dayKeys.at(-1),'2026-10-12');assert.equal(period.dayKeys.length,7);assert.equal(changePercent(5,0),null);
 const f=fixture();try{order(f,'before','shop-a','confirmed',100,'2026-10-06T02:59:59.999Z');order(f,'start','shop-a','confirmed',200,period.start);order(f,'utc-next-day','shop-a','confirmed',300,'2026-10-13T01:00:00.000Z');const report=await f.load('lib/admin-analytics.ts').adminAnalytics(query(),now);assert.equal(report.summary.received,2);assert.equal(report.previous.received,1);assert.equal(report.trend[0].received,1);assert.equal(report.trend.at(-1).received,1);}finally{f.close();}
});
test('activation counts each known account once, including legacy owners and new accounts with no shop',async()=>{
 const f=fixture();try{
 const stamp='2026-10-12T20:00:00.000Z';f.db.prepare('INSERT INTO account_profiles VALUES (?,?,?,?,?,?)').run('owner-a','NAME_PRIVATE_SENTINEL','EMAIL_PRIVATE_SENTINEL','supabase',stamp,stamp);f.db.prepare('INSERT INTO account_profiles VALUES (?,?,?,?,?,?)').run('owner-new','New owner','OTHER_EMAIL_PRIVATE_SENTINEL','supabase',stamp,stamp);f.db.prepare('INSERT INTO account_trials VALUES (?,?,NULL,NULL)').run('owner-new',stamp);
 f.db.prepare('INSERT INTO restaurants (id,owner_id,slug,name,data,published,created_at,updated_at) VALUES (?,?,?,?,?,0,?,?)').run('third','owner-a','third-shop','Other shop','{}',stamp,stamp);order(f,'first','shop-a','awaiting',1000);
 const report=await f.load('lib/admin-analytics.ts').adminAnalytics(query(),now);assert.equal(report.funnel.accounts,3);assert.equal(report.funnel.withShop,2);assert.equal(report.funnel.published,2);assert.equal(report.funnel.withOrder,1);assert.equal(report.restaurants.rows.find(r=>r.id==='shop-a').accountShops,2);assert.doesNotMatch(JSON.stringify(report),/NAME_PRIVATE_SENTINEL|EMAIL_PRIVATE_SENTINEL|OTHER_EMAIL_PRIVATE_SENTINEL|owner-a/);
 }finally{f.close();}
});
test('usage describes published configuration and current job states without paid calls or sensitive data',async()=>{
 const f=fixture(),original=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error('No external calls allowed');};try{
 const stamp='2026-10-12T20:00:00.000Z',data={...f.data,products:[{...f.data.products[0],enabled:true,image:'/media/shop-a/photo.jpg'}],deliveryZones:[{name:'Centro'}],promotions:[{enabled:true,startsAt:'2026-10-12T00:00:00-03:00',endsAt:'2026-10-13T00:00:00-03:00'}]};f.db.prepare('UPDATE restaurants SET data=?,published_data=? WHERE id=?').run(JSON.stringify(data),JSON.stringify(data),'shop-a');f.db.prepare('UPDATE restaurants SET published=0,data=?,published_data=NULL WHERE id=?').run(JSON.stringify(data),'shop-b');
 f.db.prepare('INSERT INTO image_jobs (id,owner_id,restaurant_id,request_id,input_hash,token_hash,prompt,asset,state,period_key,result_url,created_at,expires_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('image','owner-a','shop-a','image','INPUT_HASH_PRIVATE','TOKEN_PRIVATE_SENTINEL','PROMPT_PRIVATE_SENTINEL','cover','completed','2026-10','RESULT_URL_PRIVATE',stamp,stamp,stamp);
 const report=await f.load('lib/admin-analytics.ts').adminAnalytics(query(),now);assert.equal(report.catalog.promotions,1);assert.equal(report.catalog.withPhotos,1);assert.equal(report.catalog.deliveryZones,1);assert.equal(report.catalog.pix,1);assert.equal(report.restaurants.rows.find(p=>p.id==='shop-a').images,1);assert.equal(calls,0);assert.doesNotMatch(JSON.stringify(report),/PRIVATE_SENTINEL|RESULT_URL_PRIVATE|INPUT_HASH_PRIVATE|pizza@example.test|pixSnapshot|trackingHash/);
 const {AdminReport}=f.load('components/admin-report.tsx'),html=renderToStaticMarkup(createElement(AdminReport,{initialData:report}));assert.match(html,/Valor confirmado/);assert.match(html,/Não inclui cancelados/);assert.match(html,/conta conta uma vez/);assert.doesNotMatch(html,/PRIVATE_SENTINEL/);
 }finally{globalThis.fetch=original;f.close();}
});
test('search uses literal percent and underscore, filters are constrained and pages have no duplicate rows',async()=>{
 const f=fixture();try{
 const stamp='2026-10-12T20:00:00.000Z';for(let i=0;i<29;i++)f.db.prepare('INSERT INTO restaurants (id,owner_id,slug,name,data,published,created_at,updated_at) VALUES (?,?,?,?,?,0,?,?)').run('extra-'+i,'owner-a','extra-'+i,i===0?'Oferta 100%_real':'New '+i,'{}',stamp,stamp);
 const load=patch=>f.load('lib/admin-analytics.ts').adminAnalytics(query(patch),now),first=await load(),second=await load({page:2});assert.equal(first.restaurants.total,31);assert.equal(first.restaurants.rows.length,25);assert.equal(second.restaurants.rows.length,6);assert.equal(new Set([...first.restaurants.rows,...second.restaurants.rows].map(row=>row.id)).size,31);
 assert.equal((await load({q:'%_'})).restaurants.total,1);assert.equal((await load({q:"' OR 1=1 --"})).restaurants.total,0);assert.equal((await load({filter:'draft'})).restaurants.total,29);assert.equal((await load({filter:'without_orders'})).restaurants.total,2);assert.throws(()=>readAdminQuery(new URLSearchParams('sort=id;DROP TABLE orders')));
 }finally{f.close();}
});
test('malformed legacy menu JSON is counted safely without changing the stored record',async()=>{
 const f=fixture();try{f.db.prepare('UPDATE restaurants SET data=?,published_data=? WHERE id=?').run('{broken','{broken','shop-a');const before=snapshot(f),report=await f.load('lib/admin-analytics.ts').adminAnalytics(query(),now);assert.equal(report.restaurants.rows.find(row=>row.id==='shop-a').draftProducts,0);assert.equal(snapshot(f),before);}finally{f.close();}
});
