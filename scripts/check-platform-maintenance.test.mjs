import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './test-backend-fixture.mjs';
import {maintenanceActive,resetTables} from '../lib/platform-maintenance.ts';
function setup(){
 const f=fixture(),cutoff=new Date(Date.now()-1000),media=new Map([['old-photo',new Date(cutoff.getTime()-1000)],['new-photo',new Date(cutoff.getTime()+1000)]]);
 Object.assign(f.env,{PEDIDO_RESET_ID:crypto.randomUUID(),PEDIDO_RESET_CUTOFF:cutoff.toISOString(),PEDIDO_RESET_UNTIL:String(Math.floor(Date.now()/1000)+300)});
 f.env.BUCKET.list=async()=>({objects:[...media].map(([key,uploaded])=>({key,uploaded})),truncated:false});
 f.env.BUCKET.delete=async keys=>{for(const key of typeof keys==='string'?[keys]:keys)media.delete(key);};
 const run=f.load('lib/platform-maintenance.ts').runPlatformMaintenance;
 return {...f,run,media};
}
test('maintenance is inert unless explicitly armed with a bounded runtime window',async()=>{
 assert.equal(maintenanceActive({}),false);
 assert.equal(maintenanceActive({PEDIDO_RESET_ID:crypto.randomUUID(),PEDIDO_RESET_UNTIL:'99999999999',PEDIDO_RESET_CUTOFF:new Date().toISOString()}),false);
 const f=setup();try{delete f.env.PEDIDO_RESET_ID;await f.run(f.env);assert.equal(f.db.prepare('SELECT count(*) AS n FROM restaurants').get().n,2);assert.equal(f.media.size,2);}finally{f.close();}
});
test('authorized reset erases business rows, retains schema and newer media, and never repeats',async()=>{
 const f=setup();try{
  const schema=f.db.prepare("SELECT name,sql FROM sqlite_master WHERE type IN ('table','index') ORDER BY name").all();
  f.db.prepare("INSERT INTO account_profiles VALUES('old','QA','old@example.test','supabase','2026-10-20','2026-10-20')").run();
  await f.run(f.env,async()=>{throw Error('Unconfigured billing must not use network');});
  for(const table of resetTables)assert.equal(f.db.prepare('SELECT count(*) AS n FROM "'+table+'"').get().n,0,table);
  assert.deepEqual(f.db.prepare("SELECT name,sql FROM sqlite_master WHERE type IN ('table','index') ORDER BY name").all(),schema);
  assert.deepEqual([...f.media.keys()],['new-photo']);
  const row=f.db.prepare('SELECT * FROM platform_maintenance_runs').get();assert.equal(row.status,'done');assert.equal(row.media_deleted,1);assert.equal(JSON.parse(row.report_json).rowCounts.restaurants,2);
  f.db.prepare("INSERT INTO account_profiles VALUES('new','New','new@example.test','supabase','2026-10-26','2026-10-26')").run();
  await f.run(f.env);assert.equal(f.db.prepare('SELECT count(*) AS n FROM account_profiles').get().n,1);
 }finally{f.close();}
});
test('unexpected schema and media failures stop before clearing account data and can resume',async()=>{
 const f=setup();try{
  f.db.exec('CREATE TABLE future_business_table(id TEXT PRIMARY KEY)');await assert.rejects(f.run(f.env),/schema changed/);assert.equal(f.media.size,2);assert.equal(f.db.prepare('SELECT count(*) AS n FROM restaurants').get().n,2);
  f.db.exec('DROP TABLE future_business_table');const erase=f.env.BUCKET.delete;f.env.BUCKET.delete=async()=>{throw Error('Synthetic R2 outage');};await assert.rejects(f.run(f.env),/Synthetic R2 outage/);assert.equal(f.db.prepare('SELECT count(*) AS n FROM restaurants').get().n,2);
  f.env.BUCKET.delete=erase;await f.run(f.env);assert.equal(f.db.prepare('SELECT count(*) AS n FROM restaurants').get().n,0);
 }finally{f.close();}
});
test('database erasure rolls back on failure and Asaas diagnostics use only GET with no secret in reports',async()=>{
 const f=setup();try{
  Object.assign(f.env,{PEDIDO_BILLING_ENABLED:'true',PEDIDO_BILLING_PROVIDER:'asaas',ASAAS_ENV:'production',ASAAS_API_KEY:'$aact_prod_synthetic_only',ASAAS_WEBHOOK_TOKEN:'w'.repeat(48)});
  const requests=[];const fetcher=async(url,options)=>{assert.equal(options.method,'GET');requests.push(url);return Response.json(url.includes('/webhooks')?{data:[{url:'https://pizzaria-on.netlify.app/api/billing/asaas/webhook',enabled:true,interrupted:false}]}:{data:[]});};
  f.db.exec("CREATE TRIGGER refuse_reset BEFORE DELETE ON restaurants BEGIN SELECT RAISE(ABORT,'Synthetic transaction failure'); END");
  await assert.rejects(f.run(f.env,fetcher),/Synthetic transaction failure/);assert.equal(f.db.prepare('SELECT count(*) AS n FROM restaurants').get().n,2);assert.equal(f.db.prepare('SELECT status FROM platform_maintenance_runs').get().status,'retry');
  f.db.exec('DROP TRIGGER refuse_reset');await f.run(f.env,fetcher);
  const report=f.db.prepare('SELECT report_json FROM platform_maintenance_runs').get().report_json,parsed=JSON.parse(report);assert.equal(parsed.billing.apiStatus,200);assert.equal(parsed.billing.webhookEnabled,true);assert.equal(requests.length,4);assert.ok(!report.includes(f.env.ASAAS_API_KEY));assert.ok(!report.includes(f.env.ASAAS_WEBHOOK_TOKEN));
 }finally{f.close();}
});
