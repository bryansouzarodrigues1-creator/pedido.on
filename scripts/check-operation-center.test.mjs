import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './test-backend-fixture.mjs';
import {canonicalAccountLocation} from '../lib/account-origin-policy.ts';
import {blankFlavorRow,flavorQuote,flavorTableSchema} from '../lib/flavor-pricing.ts';
import {validPricingTransfer} from '../lib/pricing-transfer.ts';

test('both modes use real margin and legacy markup remains recoverable',()=>{
 const easy={...blankFlavorRow(),name:'Calabresa grande',cost:'23,80',fees:'3,5'};
 const q=flavorQuote(easy);assert.equal(q.suggested,3579);assert.equal(q.fee,125);assert.equal(q.afterReserve,1074);assert.ok(q.netMargin>=30);
 const pro=flavorQuote({...easy,overhead:'15'});assert.equal(pro.suggested,4116);assert.equal(pro.reserve,357);assert.equal(pro.afterReserve,1235);
 const markup=flavorQuote({...easy,cost:'20',method:'markup',markup:'50',overhead:'0',fees:'0'});assert.equal(markup.suggested,3000);assert.ok(Math.abs(markup.netMargin-33.3333)<.001);
 const old={id:crypto.randomUUID(),name:'Legado',cost:'20',overhead:'15',markup:'125'};assert.deepEqual(flavorTableSchema.parse({version:1,rows:[old]}).rows,[old]);assert.equal(flavorQuote(old).suggested,4800);
 assert.throws(()=>flavorQuote({...easy,margin:'70',fees:'30'}));
});
test('pricing transfer validates the amount and expires without guessing a pizza size',()=>{
 const now=Date.now(),value={version:1,name:'Calabresa · 35 cm',price:4116,createdAt:now};assert.deepEqual(validPricingTransfer(value,now),value);assert.equal(validPricingTransfer({...value,price:0},now),null);assert.equal(validPricingTransfer({...value,createdAt:now-86400000},now),null);assert.equal(validPricingTransfer({...value,createdAt:now+1},now),null);assert.equal(validPricingTransfer({...value,size:'g'},now),null);
});
test('account navigation uses one origin before login and never redirects signed gateway calls or APIs',()=>{
 const c={PEDIDO_PUBLIC_ORIGIN:'https://public.example'},request=path=>new Request('https://backend.example'+path);
 for(const path of ['/','/criar','/calculadora','/app','/admin','/admin/clientes','/conta','/entrar?next=%2Fadmin','/cadastro'])assert.equal(canonicalAccountLocation(request(path),c,false),'https://public.example'+path);
 assert.equal(canonicalAccountLocation(request('/admin'),c,true),null);assert.equal(canonicalAccountLocation(request('/api/auth/login'),c,false),null);assert.equal(canonicalAccountLocation(request('/assets/pizza.webp'),c,false),null);assert.equal(canonicalAccountLocation(request('/entrar'),{},false),null);
});
test('administrator can find accounts with no restaurant while guests cannot read names or email',async()=>{
 const f=fixture();try{const stamp=new Date().toISOString();f.db.prepare('INSERT INTO account_profiles(owner_id,name,email,provider,created_at,updated_at) VALUES(?,?,?,?,?,?)').run('standalone','Nova pizzaiola','nova@example.test','supabase',stamp,stamp);const mod=f.load('app/api/admin/accounts/route.ts');f.state.user={userId:'regular',email:'regular@example.test',displayName:'Regular',provider:'supabase'};assert.equal((await mod.GET(new Request('https://pedido.example/api/admin/accounts'))).status,403);f.env.PLATFORM_ADMIN_ACCOUNT_ID='regular';const r=await mod.GET(new Request('https://pedido.example/api/admin/accounts?q=Nova'));assert.equal(r.status,200);const data=await r.json();assert.equal(data.total,1);assert.equal(data.items[0].email,'nova@example.test');assert.deepEqual(data.items[0].shops,[]);assert.equal(JSON.stringify(data).includes('sealed'),false);}finally{f.close();}
});
test('notices are idempotent and remain private when another account tries to mark them read',async()=>{
 const f=fixture();try{const notices=f.load('lib/account-notices.ts');await notices.recordNotice('owner-a',{event:'menu-ready:test',title:'Cardápio pronto',body:'Revisar produtos',path:'/app'});await notices.recordNotice('owner-a',{event:'menu-ready:test',title:'Cardápio pronto',body:'Revisar produtos',path:'/app'});const mod=f.load('app/api/account/notices/route.ts');let r=await mod.GET(),data=await r.json();assert.equal(data.items.length,1);assert.equal(data.unread,1);const id=data.items[0].id;f.state.user={...f.state.user,userId:'owner-b'};data=await (await mod.GET()).json();assert.deepEqual(data.items,[]);const patch=()=>new Request('https://pedido.example/api/account/notices',{method:'PATCH',headers:{origin:'https://pedido.example',cookie:'__Host-pedido-csrf='+('ac'.repeat(32)),'x-pedido-csrf':'ac'.repeat(32),'content-type':'application/json'},body:JSON.stringify({id})});assert.equal((await mod.PATCH(patch())).status,200);assert.equal(f.db.prepare('SELECT read_at FROM account_notices WHERE id=?').get(id).read_at,null);f.state.user={...f.state.user,userId:'owner-a'};assert.equal((await mod.PATCH(patch())).status,200);assert.equal((await (await mod.GET()).json()).unread,0);}finally{f.close();}
});
test('visit counting deduplicates reloads and stores no IP, raw session ID, URL or customer data',async()=>{
 const f=fixture();try{const mod=f.load('app/api/site-events/route.ts'),session=crypto.randomUUID(),request=(origin='https://pedido.example')=>new Request('https://pedido.example/api/site-events',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({session,page:'calculadora',kind:'visit'})});for(let i=0;i<3;i++)assert.equal((await mod.POST(request())).status,204);assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM site_visits').get().n,1);assert.equal((await mod.POST(request('https://evil.example'))).status,403);const stored=JSON.stringify(f.db.prepare('SELECT * FROM site_visits').all());assert.equal(stored.includes(session),false);const overview=await f.load('lib/site-operations.ts').siteOperations();assert.equal(overview.sessions,1);assert.equal(overview.views,1);}finally{f.close();}
});

test('the client-directory page redirects a signed-out visitor to login before reading accounts',async()=>{
 const f=fixture();try{f.state.user=null;const page=f.load('app/admin/clientes/page.tsx').default;await assert.rejects(page(),e=>e.location==='/entrar?next=%2Fadmin%2Fclientes');}finally{f.close();}
});
