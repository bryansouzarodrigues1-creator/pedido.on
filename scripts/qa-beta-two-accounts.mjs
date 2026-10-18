// One explicitly authorized run against the isolated Cloudflare beta. Never production.
// Credentials and tracking tokens live only in process memory and are never artifacts.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {defaultRestaurant,restaurantSchema} from '../lib/domain.ts';
const origin='https://pizzaria-on-backend-staging-20261017.bryansouzarodrigues06.workers.dev';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.CI!=='true'||process.env.QA_BETA_WRITE_ACK!=='two-test-accounts-20261018')throw Error('This one-time QA requires the authorized GitHub runner.');
const run=process.env.GITHUB_RUN_ID;if(!/^\d+$/.test(run||''))throw Error('Missing run identity.');
const expectedRelease=process.env.QA_EXPECTED_RELEASE;if(!/^[a-f0-9]{40}$/.test(expectedRelease||''))throw Error('Expected reviewed source SHA is required.');
const report={origin,expectedRelease,mode:'real Supabase Auth + beta D1; no Asaas/AI calls',accountsCreated:0,checks:[],cleanup:[],passed:false};
const accounts=[];
function client(){return {cookies:new Map(),csrf:''};}
const guest=client();
async function request(c,path,method='GET',body,extra={}){
 if(!/^\/(?:healthz|api\/(?:auth\/(?:config|register|session|login|logout)|restaurants(?:\/[a-zA-Z0-9_-]+(?:\/(?:publish|orders))?)?|menu\/qa-[a-zA-Z0-9_-]+\/order|orders\/[a-f0-9-]{36}))$/.test(path))throw Error('QA endpoint outside the fixed allowlist.');
 const headers={accept:'application/json',origin,...extra};
 if(c.cookies.size)headers.cookie=[...c.cookies].map(([k,v])=>k+'='+v).join('; ');
 if(c.csrf)headers['x-pedido-csrf']=c.csrf;
 if(body!==undefined)headers['content-type']='application/json';
 const response=await fetch(origin+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(25000)});
 for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],at=pair.indexOf('=');c.cookies.set(pair.slice(0,at),pair.slice(at+1));}
 let data;try{data=await response.json();}catch{if(path==='/healthz')data={};else throw Error('Non-JSON response on '+path.split('/').slice(0,3).join('/'));}
 return {status:response.status,data,headers:response.headers};
}
function check(name,condition){assert.ok(condition,name);report.checks.push({name,ok:true});}
async function config(c){const r=await request(c,'/api/auth/config');assert.equal(r.status,200);assert.equal(r.data.enabled,true);assert.equal(r.data.registrationEnabled,true);assert.equal(r.data.inviteRequired,false);c.csrf=r.data.csrf;}
async function publish(a,value){const r=await request(a.client,'/api/restaurants/'+a.shop.id+'/publish','POST',{revision:a.shop.revision,published:value});assert.equal(r.status,200,'QA publication update');a.shop=r.data.restaurant;}
try{
 // A PR may run before its reviewed release finishes deployment. No signup until it matches.
 const deadline=Date.now()+15*60000;
 while(true){const health=await request(guest,'/healthz');if(health.status===200&&health.data.release===expectedRelease)break;if(Date.now()>deadline)throw Error('Reviewed release was not deployed before the QA deadline.');await new Promise(r=>setTimeout(r,10000));}
 check('deployed source matches the reviewed PR',true);
 for(const label of ['a','b']){
  const a={label,email:`qa-pizzaria-${run}-${label}@example.test`,password:'QA-'+randomBytes(24).toString('hex'),client:client(),shop:null};accounts.push(a);
  await config(a.client);
  const signed=await request(a.client,'/api/auth/register','POST',{email:a.email,password:a.password,name:'Homologação '+label.toUpperCase()});
  assert.equal(signed.status,200,'Direct test registration must succeed once; never create replacement accounts on retry.');report.accountsCreated++;
  const session=await request(a.client,'/api/auth/session');check('direct signup and authenticated session '+label,session.status===200&&session.data.user?.email===a.email);
  const slug=`qa-${run}-${label}`;
  const created=await request(a.client,'/api/restaurants','POST',{name:'HOMOLOGAÇÃO '+label.toUpperCase()+' — loja fictícia',slug,theme:'classic',plan:'essencial'});assert.equal(created.status,201,'Create private QA store');a.shop=created.data.restaurant;
  const data=restaurantSchema.parse({...defaultRestaurant(a.shop.name,'classic'),description:'Loja fictícia usada somente para homologação. Não atende clientes.',whatsapp:'(11) 90000-0000',address:'Rua de Testes, 100 — endereço fictício',deliveryEnabled:false,pickupEnabled:true,payments:['Dinheiro'],products:[{id:'qa-pizza',categoryId:'pizzas',name:'Pizza de homologação',description:'Produto fictício',kind:'pizza',image:'',price:0,sizes:{p:0,m:0,g:3900},enabled:true,featured:true}]});
  const saved=await request(a.client,'/api/restaurants/'+a.shop.id,'PUT',{revision:a.shop.revision,data});assert.equal(saved.status,200);a.shop=saved.data.restaurant;
  check('stale editor revision is rejected '+label,(await request(a.client,'/api/restaurants/'+a.shop.id,'PUT',{revision:1,data})).status===409);
  await publish(a,true);
 }
 const [a,b]=accounts;
 for(const own of accounts){const other=own===a?b:a;const listed=await request(own.client,'/api/restaurants');check('private store list is owner-bound '+own.label,listed.status===200&&listed.data.restaurants.length===1&&listed.data.restaurants[0].id===own.shop.id);check('other owner cannot read orders '+own.label,(await request(other.client,'/api/restaurants/'+own.shop.id+'/orders')).status===404);check('other owner cannot publish '+own.label,(await request(other.client,'/api/restaurants/'+own.shop.id+'/publish','POST',{revision:own.shop.revision,published:false})).status===404);}
 check('anonymous private API is denied',(await request(guest,'/api/restaurants')).status===401);
 for(const own of accounts){
  const other=own===a?b:a,trackingToken=randomBytes(32).toString('hex');
  const input={requestId:crypto.randomUUID(),trackingToken,customer:'Cliente fictício QA',phone:'(11) 90000-0000',method:'pickup',address:'',payment:'Dinheiro',note:'Homologação autorizada. Não preparar nem cobrar.',coupon:'',expectedTotal:1,items:[{productIds:['qa-pizza'],size:'g',quantity:1,note:''}]};
  const quote=await request(guest,'/api/menu/'+own.shop.slug+'/order','POST',input);check('server rejects manipulated total '+own.label,quote.status===409&&quote.data.quote?.total===3900);
  input.expectedTotal=3900;const placed=await request(guest,'/api/menu/'+own.shop.slug+'/order','POST',input);assert.equal(placed.status,201,'Fictitious cash order');own.order=placed.data;
  const repeated=await request(guest,'/api/menu/'+own.shop.slug+'/order','POST',input);check('order retry is idempotent '+own.label,repeated.status===200&&repeated.data.id===own.order.id);
  check('tracking without token is denied '+own.label,(await request(guest,'/api/orders/'+own.order.id)).status===404);
  check('wrong tracking token is denied '+own.label,(await request(guest,'/api/orders/'+own.order.id,'GET',undefined,{'x-pedido-order-token':randomBytes(32).toString('hex')})).status===404);
  const listed=await request(own.client,'/api/restaurants/'+own.shop.id+'/orders');check('owner receives exactly its own order '+own.label,listed.status===200&&listed.data.orders.length===1&&listed.data.orders[0].id===own.order.id);
  const order=listed.data.orders[0],action={orderId:order.id,version:order.version,action:'confirm',etaMinutes:30};
  check('other owner cannot approve order '+own.label,(await request(other.client,'/api/restaurants/'+own.shop.id+'/orders','PATCH',action)).status===404);
  const approved=await request(own.client,'/api/restaurants/'+own.shop.id+'/orders','PATCH',action);assert.equal(approved.status,200);
  check('stale order decision is rejected '+own.label,(await request(own.client,'/api/restaurants/'+own.shop.id+'/orders','PATCH',action)).status===409);
  const tracking=await request(guest,'/api/orders/'+order.id,'GET',undefined,{'x-pedido-order-token':trackingToken});check('customer sees owner confirmation '+own.label,tracking.status===200&&tracking.data.order.status==='confirmed'&&tracking.data.order.summary.total===3900);
  const canceled=await request(own.client,'/api/restaurants/'+own.shop.id+'/orders','PATCH',{orderId:order.id,version:approved.data.order.version,action:'cancel',reason:'Homologação concluída — pedido fictício'});assert.equal(canceled.status,200);
 }
 const logout=await request(a.client,'/api/auth/logout','POST',{});check('logout revokes application session',logout.status===200&&(await request(a.client,'/api/restaurants')).status===401);
 await config(a.client);check('wrong password is rejected',(await request(a.client,'/api/auth/login','POST',{email:a.email,password:'Wrong-'+randomBytes(20).toString('hex')})).status===401);
 const login=await request(a.client,'/api/auth/login','POST',{email:a.email,password:a.password});check('password login restores the same isolated account',login.status===200&&(await request(a.client,'/api/restaurants')).data.restaurants[0].id===a.shop.id);
 report.passed=true;
}finally{
 for(const a of accounts){
  if(a.shop?.published){try{await publish(a,false);report.cleanup.push({account:a.label,menuUnpublished:true});}catch{report.cleanup.push({account:a.label,menuUnpublished:false});report.passed=false;}}
  try{await request(a.client,'/api/auth/logout','POST',{});}catch{}
  a.password='';a.client.cookies.clear();
 }
 await mkdir('.sites-runtime/qa-beta-two-accounts',{recursive:true});
 await writeFile('.sites-runtime/qa-beta-two-accounts/report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 if(!report.passed)process.exitCode=1;
}
