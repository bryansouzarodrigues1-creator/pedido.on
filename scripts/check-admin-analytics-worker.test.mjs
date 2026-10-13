import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),{Miniflare}=require(require.resolve('miniflare',{paths:[require.resolve('wrangler')]})),esbuild=require(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
test('real workerd and local D1 execute the report batch and SQLite JSON aggregates',async()=>{
 const script=(await esbuild.build({stdin:{contents:`import {adminAnalytics} from './lib/admin-analytics.ts'; export default {fetch:async()=>Response.json(await adminAnalytics({days:'7',page:1,q:'',filter:'all',sort:'orders'},new Date('2026-10-13T02:15:00Z')))};`,resolveDir:process.cwd(),sourcefile:'analytics-worker-check.ts',loader:'ts'},bundle:true,write:false,platform:'neutral',format:'esm',external:['cloudflare:workers']})).outputFiles[0].text;
 const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-05-01',d1Databases:{DB:'admin-analytics-local'},d1Persist:false});try{
 const db=await mf.getD1Database('DB');for(const file of readdirSync('drizzle').filter(name=>name.endsWith('.sql')).sort())for(const statement of readFileSync(path.join('drizzle',file),'utf8').split('--> statement-breakpoint').filter(sql=>sql.trim()))await db.prepare(statement.trim()).run();
 const stamp='2026-10-12T20:00:00.000Z',menu=JSON.stringify({products:[{enabled:true,image:'/media/local/photo.jpg'}],pix:{enabled:true}});
 await db.prepare('INSERT INTO restaurants(id,owner_id,slug,name,data,published_data,published,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?)').bind('local','owner','local-shop','Local D1 shop',menu,menu,stamp,stamp).run();
 for(const [id,status,total] of [['done','delivered',9000],['cancel','canceled',7000],['pending','awaiting_payment',4000]])await db.prepare('INSERT INTO orders(id,restaurant_id,request_id,customer,phone,data,total,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,'local',id,'PRIVATE_CUSTOMER','PRIVATE_PHONE','{"address":"PRIVATE_ADDRESS"}',total,status,stamp).run();
 const response=await mf.dispatchFetch('http://local.test'),report=await response.json();assert.equal(response.status,200);assert.equal(report.summary.received,3);assert.equal(report.summary.confirmedValue,9000);assert.equal(report.summary.ticket,9000);assert.equal(report.catalog.pix,1);assert.equal(report.catalog.withPhotos,1);assert.equal(report.trend.at(-1).received,3);assert.equal(report.restaurants.rows[0].received,3);assert.doesNotMatch(JSON.stringify(report),/PRIVATE_CUSTOMER|PRIVATE_PHONE|PRIVATE_ADDRESS/);
 }finally{await mf.dispose();}
});
