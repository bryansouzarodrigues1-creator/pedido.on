import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,csrf,png} from './test-backend-fixture.mjs';
import {sha256,pkceChallenge,sealTokens} from '../lib/auth-policy.ts';

const firstId='11111111-1111-4111-8111-111111111111';
const secondId='22222222-2222-4222-8222-222222222222';
const initialPassword='senha longa para testar';
const signupHash='ab'.repeat(32),recoveryHash='cd'.repeat(32),recoveryCode='fixture-recovery-code-123456';
const cookieHeader=cookie=>({Cookie:cookie+'; __Host-pedido-csrf='+csrf});
const sessionCookie=response=>response.headers.get('Set-Cookie').split(';')[0];

// These tests use the application routes and actual SQLite migrations. Only the
// external identity provider and D1/R2 bindings are adapted; no mail is sent.
function identities(f){
  f.env.SUPABASE_URL='https://test.supabase.co';
  f.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test-fixture';
  f.env.PEDIDO_EMAIL_DELIVERY_READY='true';
  f.state.user=null;
  const users=new Map(),access=new Map(),refresh=new Map(),calls=[];
  const hashes=new Map(),codes=new Map(),settings={external:{email:true},disable_signup:false,mailer_autoconfirm:true};let sequence=0;
  function add(email,id=firstId,confirmed=true){
    const user={id,email,password:initialPassword,email_confirmed_at:confirmed?new Date().toISOString():null,user_metadata:{name:'Dono de teste'}};
    users.set(email,user);return user;
  }
  function publicUser(user){const {password,...data}=user;return data;}
  function tokens(user){
    const n=++sequence,a='fixture-access-'+n,r='fixture-refresh-'+n;
    access.set(a,user);refresh.set(r,user);
    return {access_token:a,refresh_token:r,expires_in:3600,user:publicUser(user)};
  }
  async function fetcher(input,options={}){
    const url=new URL(input),path=url.pathname.replace('/auth/v1/','');
    assert.equal(url.origin,'https://test.supabase.co');assert.equal(options.redirect,'manual');
    const body=options.body?JSON.parse(options.body):{};
    calls.push({path,grant:url.searchParams.get('grant_type'),method:options.method,body});
    const authorized=access.get(options.headers?.Authorization?.replace('Bearer ',''));
    if(path==='settings')return Response.json(settings);
    if(path==='signup'){
      if(users.get(body.email)?.email_confirmed_at)return Response.json({error_code:'user_already_exists'},{status:422});
      if(!users.has(body.email)){const user=add(body.email,firstId,false);user.password=body.password;user.user_metadata={name:body.data.name};}
      const user=users.get(body.email);
      if(settings.mailer_autoconfirm){user.email_confirmed_at=new Date().toISOString();return Response.json(tokens(user));}
      hashes.set(signupHash,{email:body.email,type:'email'});
      return Response.json({user:publicUser(user)});
    }
    if(path==='token'&&url.searchParams.get('grant_type')==='pkce'){
      const pending=codes.get(body.auth_code);
      if(!pending||await pkceChallenge(body.code_verifier)!==pending.challenge)return Response.json({error_code:'bad_code_verifier'},{status:400});
      codes.delete(body.auth_code);return Response.json(tokens(users.get(pending.email)));
    }
    if(path==='token'&&url.searchParams.get('grant_type')==='password'){
      const user=users.get(body.email);
      if(!user||user.password!==body.password||!user.email_confirmed_at)return Response.json({error_code:'invalid_credentials'},{status:400});
      return Response.json(tokens(user));
    }
    if(path==='token'&&url.searchParams.get('grant_type')==='refresh_token'){
      const user=refresh.get(body.refresh_token);
      if(!user)return Response.json({error:'invalid_refresh_token'},{status:401});
      refresh.delete(body.refresh_token);await new Promise(resolve=>setTimeout(resolve,20));
      return Response.json(tokens(user));
    }
    if(path==='verify'){
      const pending=hashes.get(body.token_hash);
      if(!pending||pending.type!==body.type)return Response.json({error:'expired_or_invalid_link'},{status:403});
      hashes.delete(body.token_hash);const user=users.get(pending.email);
      user.email_confirmed_at=new Date().toISOString();
      return Response.json(tokens(user));
    }
    if(path==='recover'){
      if(users.has(body.email)){hashes.set(recoveryHash,{email:body.email,type:'recovery'});codes.set(recoveryCode,{email:body.email,challenge:body.code_challenge});}
      return Response.json({});
    }
    if(path==='resend')return Response.json({});
    if(path==='user'){
      if(!authorized)return Response.json({error:'invalid_session'},{status:401});
      if(options.method==='PUT')authorized.password=body.password;
      return Response.json(publicUser(authorized));
    }
    if(path==='logout'){
      if(authorized&&url.searchParams.get('scope')==='global'){
        for(const [key,user] of access)if(user.id===authorized.id)access.delete(key);
        for(const [key,user] of refresh)if(user.id===authorized.id)refresh.delete(key);
      }else if(authorized)access.delete(options.headers.Authorization.replace('Bearer ',''));
      return new Response(null,{status:204});
    }
    throw Error('Unexpected identity operation: '+path);
  }
  return {add,tokens,users,access,hashes,codes,settings,calls,fetcher};
}

async function login(f,email='owner@example.test',password=initialPassword,next='/app'){
  const response=await f.call('auth','POST',{action:'login'},{email,password,next});
  assert.equal(response.status,200,await response.clone().text());
  return {response,cookie:sessionCookie(response)};
}

test('prototype registration enters the panel directly and only recovery sends mail for approved accounts',async()=>{
  const f=fixture(),originalFetch=globalThis.fetch,p=identities(f);globalThis.fetch=p.fetcher;
  f.env.PEDIDO_EMAIL_DELIVERY_READY='false';f.env.PEDIDO_AUTH_MODE='prototype';f.env.PEDIDO_AUTH_TEST_EMAILS='  OWNER@example.test  ';
  try{
    const config=await (await f.call('auth','GET',{action:'config'})).json();
    assert.equal(config.prototype,true);assert.equal(config.registrationEnabled,true);assert.equal(config.recoveryEnabled,true);
    assert.ok(!JSON.stringify(config).includes('owner@example.test'));
    const created=await f.call('auth','POST',{action:'register'},{name:'Dono de teste',email:' OWNER@example.test ',password:initialPassword});
    assert.equal(created.status,200);assert.equal((await created.json()).next,'/app');assert.equal(p.hashes.size,0);
    const cookie=sessionCookie(created);assert.equal((await f.call('account','GET',{},undefined,cookieHeader(cookie))).status,200);
    assert.equal((await f.call('auth','POST',{action:'logout'},{},cookieHeader(cookie))).status,200);
    assert.equal((await f.call('account','GET',{},undefined,cookieHeader(cookie))).status,401);
    const current=await login(f);assert.equal((await f.call('account','GET',{},undefined,cookieHeader(current.cookie))).status,200);
    assert.equal((await f.call('auth','POST',{action:'recover'},{email:'owner@example.test'})).status,200);
    const recovery=await f.call('auth','POST',{action:'confirm-recovery'},{tokenHash:recoveryHash});assert.equal(recovery.status,200);
    const updated=await f.call('auth','POST',{action:'password'},{password:'uma nova senha de prototipo'},cookieHeader(sessionCookie(recovery)));assert.equal(updated.status,200);
    assert.equal((await f.call('account','GET',{},undefined,cookieHeader(current.cookie))).status,401);
    assert.equal((await login(f,'owner@example.test','uma nova senha de prototipo')).response.status,200);
  }finally{globalThis.fetch=originalFetch;f.close();}
});

test('prototype rejects other accounts before sending mail and rejects their tokens and existing sessions',async()=>{
  const f=fixture(),originalFetch=globalThis.fetch,p=identities(f);globalThis.fetch=p.fetcher;
  try{
    p.add('other@example.test',secondId);const existing=await login(f,'other@example.test');
    f.env.PEDIDO_AUTH_MODE='prototype';f.env.PEDIDO_AUTH_TEST_EMAILS='owner@example.test';
    const before=p.calls.length;
    for(const action of ['register','recover','login']){
      const result=await f.call('auth','POST',{action},{name:'Outra conta',email:'other@example.test',password:initialPassword});
      assert.equal(result.status,403);assert.ok(!(await result.text()).includes('owner@example.test'));
    }
    assert.equal(p.calls.length,before);
    assert.equal((await f.call('account','GET',{},undefined,cookieHeader(existing.cookie))).status,401);
    assert.equal(f.db.prepare('select count(*) as n from auth_sessions').get().n,0);
    // A token obtained directly from the identity provider cannot bypass the allowlist.
    for(const [action,hash,type] of [['confirm-email',signupHash,'email'],['confirm-recovery',recoveryHash,'recovery']]){
      p.hashes.set(hash,{email:'other@example.test',type});
      const result=await f.call('auth','POST',{action},{tokenHash:hash});assert.equal(result.status,401);assert.equal(result.headers.get('Set-Cookie'),null);
    }
    assert.equal(f.db.prepare('select count(*) as n from auth_sessions').get().n,0);
  }finally{globalThis.fetch=originalFetch;f.close();}
});

test('prototype fails closed with an absent or malformed allowlist even if public email delivery is marked ready',async()=>{
  const f=fixture(),originalFetch=globalThis.fetch,p=identities(f);globalThis.fetch=p.fetcher;
  f.env.PEDIDO_AUTH_MODE='prototype';
  try{
    for(const allowlist of ['', '*', 'owner@example.test,invalid']){
      f.env.PEDIDO_AUTH_TEST_EMAILS=allowlist;
      const config=await (await f.call('auth','GET',{action:'config'})).json();assert.equal(config.prototype,true);assert.equal(config.registrationEnabled,false);assert.equal(config.recoveryEnabled,false);
      for(const action of ['register','recover'])assert.equal((await f.call('auth','POST',{action},{email:'owner@example.test',name:'Dono de teste',password:initialPassword})).status,503);
      assert.equal((await f.call('auth','POST',{action:'login'},{email:'owner@example.test',password:initialPassword})).status,403);
    }
    assert.equal(p.calls.length,0);
  }finally{globalThis.fetch=originalFetch;f.close();}
});

test('registration signs in immediately without mail and stores only a protected verified-provider session',async()=>{
  const f=fixture(),originalFetch=globalThis.fetch,p=identities(f);globalThis.fetch=p.fetcher;
  f.env.PEDIDO_EMAIL_DELIVERY_READY='false';
  try{
    const config=await (await f.call('auth','GET',{action:'config'})).json();
    assert.equal(config.enabled,true);assert.equal(config.registrationEnabled,true);assert.equal(config.recoveryEnabled,false);
    const registered=await f.call('auth','POST',{action:'register'},{name:'Dono A',email:'  OWNER@example.test  ',password:initialPassword,next:'https://foreign.example'});
    assert.equal(registered.status,200,await registered.clone().text());
    assert.deepEqual(p.calls.map(c=>c.path),['settings','signup','user']);assert.equal(p.hashes.size,0);
    assert.equal(p.calls.find(c=>c.path==='signup').body.email,'owner@example.test');
    assert.match(registered.headers.get('Set-Cookie'),/HttpOnly; SameSite=Lax/);
    assert.match(registered.headers.get('Set-Cookie'),/Secure/);assert.match(registered.headers.get('Set-Cookie'),/Max-Age=604800/);
    const payload=await registered.json();assert.equal(payload.next,'/app');assert.ok(!JSON.stringify(payload).includes('fixture-access'));
    const cookie=sessionCookie(registered),raw=cookie.split('=')[1];
    const row=f.db.prepare('select * from auth_sessions').get();assert.equal(row.id,await sha256(raw));assert.equal(row.owner_id,'supabase:'+firstId);assert.ok(!row.sealed_tokens.includes('fixture-access'));
    assert.equal(f.db.prepare('select count(*) as n from account_profiles').get().n,1);
    assert.equal((await f.call('account','GET',{},undefined,cookieHeader(cookie))).status,200);
    assert.equal((await f.call('auth','POST',{action:'recover'},{email:'owner@example.test'})).status,503);
    const before=p.calls.length;
    assert.equal((await f.call('auth','POST',{action:'resend'},{email:'owner@example.test'})).status,410);assert.equal(p.calls.length,before);
    const duplicate=await f.call('auth','POST',{action:'register'},{name:'Dono A',email:'owner@example.test',password:initialPassword});assert.equal(duplicate.status,400);
    assert.equal(f.db.prepare('select count(*) as n from auth_sessions').get().n,1);
  }finally{globalThis.fetch=originalFetch;f.close();}
});

test('signup cannot send a confirmation while provider settings are stale and cannot trust unverified signup tokens',async()=>{
  const f=fixture(),originalFetch=globalThis.fetch,p=identities(f);globalThis.fetch=p.fetcher;
  try{
    p.settings.mailer_autoconfirm=false;
    const blocked=await f.call('auth','POST',{action:'register'},{name:'Dono de teste',email:'owner@example.test',password:initialPassword});
    assert.equal(blocked.status,503);assert.deepEqual(p.calls.map(c=>c.path),['settings']);assert.equal(p.users.size,0);assert.equal(p.hashes.size,0);
    p.settings.mailer_autoconfirm=true;
    globalThis.fetch=async(input,options)=>new URL(input).pathname.endsWith('/signup')?Response.json({access_token:'forged-access',refresh_token:'forged-refresh',expires_in:3600,user:{id:firstId,email:'owner@example.test',email_confirmed_at:'now'}}):p.fetcher(input,options);
    assert.equal((await f.call('auth','POST',{action:'register'},{name:'Dono de teste',email:'owner@example.test',password:initialPassword})).status,401);
    assert.equal(f.db.prepare('select count(*) as n from auth_sessions').get().n,0);
  }finally{globalThis.fetch=originalFetch;f.close();}
});

test('repeating signup after auto-confirm is enabled preserves a previously pending identity and its shops',async()=>{
  const f=fixture(),originalFetch=globalThis.fetch,p=identities(f);globalThis.fetch=p.fetcher;
  try{
    p.add('owner@example.test',firstId,false);
    f.db.prepare('update restaurants set owner_id=? where id=?').run('supabase:'+firstId,'shop-a');
    assert.equal((await f.call('auth','POST',{action:'login'},{email:'owner@example.test',password:initialPassword})).status,401);
    const registered=await f.call('auth','POST',{action:'register'},{name:'Dono de teste',email:'owner@example.test',password:initialPassword});assert.equal(registered.status,200);
    assert.equal(p.users.get('owner@example.test').id,firstId);assert.equal(p.hashes.size,0);
    const list=await f.call('restaurants','GET',{},undefined,cookieHeader(sessionCookie(registered)));assert.deepEqual((await list.json()).restaurants.map(r=>r.id),['shop-a']);
  }finally{globalThis.fetch=originalFetch;f.close();}
});

test('the standard recovery email exchanges a single-use PKCE code only in the initiating browser',async()=>{
  const f=fixture(),originalFetch=globalThis.fetch,p=identities(f);globalThis.fetch=p.fetcher;
  try{
    p.add('owner@example.test');const account=await login(f);
    const email=await f.call('auth','POST',{action:'recover'},{email:'owner@example.test'});assert.equal(email.status,200);
    const flow=sessionCookie(email);assert.match(email.headers.get('Set-Cookie'),/HttpOnly; SameSite=Lax; Max-Age=900; Secure/);
    const request=p.calls.find(c=>c.path==='recover');assert.equal(request.body.code_challenge_method,'s256');assert.match(request.body.code_challenge,/^[a-zA-Z0-9_-]{43}$/);assert.ok(!JSON.stringify(await email.json()).includes(request.body.code_challenge));
    assert.equal((await f.call('auth','GET',{action:'confirm-recovery-code'})).status,404);assert.equal(p.codes.size,1);
    const before=p.calls.length;
    assert.equal((await f.call('auth','POST',{action:'confirm-recovery-code'},{code:recoveryCode},cookieHeader(account.cookie))).status,401);assert.equal(p.calls.length,before);
    assert.equal((await f.call('auth','POST',{action:'confirm-recovery-code'},{code:recoveryCode},{...cookieHeader(flow),'x-pedido-csrf':'wrong'})).status,403);
    const wrong=await sealTokens({purpose:'password-recovery',verifier:'ef'.repeat(32),createdAt:Math.floor(Date.now()/1000)},f.env.AUTH_SESSION_KEY,'pedido-recovery:https://pedido.example');
    assert.equal((await f.call('auth','POST',{action:'confirm-recovery-code'},{code:recoveryCode},cookieHeader('__Host-pedido-recovery='+wrong))).status,401);assert.equal(p.codes.size,1);
    const expired=await sealTokens({purpose:'password-recovery',verifier:'ef'.repeat(32),createdAt:Math.floor(Date.now()/1000)-901},f.env.AUTH_SESSION_KEY,'pedido-recovery:https://pedido.example');
    const beforeExpired=p.calls.length;assert.equal((await f.call('auth','POST',{action:'confirm-recovery-code'},{code:recoveryCode},cookieHeader('__Host-pedido-recovery='+expired))).status,401);assert.equal(p.calls.length,beforeExpired);
    const recovered=await f.call('auth','POST',{action:'confirm-recovery-code'},{code:recoveryCode},cookieHeader(flow));assert.equal(recovered.status,200,await recovered.clone().text());assert.match(recovered.headers.get('Set-Cookie'),/__Host-pedido-recovery=;.*Max-Age=0/);
    const cookie=sessionCookie(recovered);assert.equal((await f.call('account','GET',{},undefined,cookieHeader(cookie))).status,401);
    assert.equal((await f.call('auth','POST',{action:'confirm-recovery-code'},{code:recoveryCode},cookieHeader(flow))).status,401);
    assert.equal((await f.call('auth','POST',{action:'password'},{password:'nova senha pelo email padrao'},cookieHeader(cookie))).status,200);
    assert.equal((await f.call('account','GET',{},undefined,cookieHeader(account.cookie))).status,401);
    assert.equal((await login(f,'owner@example.test','nova senha pelo email padrao')).response.status,200);
  }finally{globalThis.fetch=originalFetch;f.close();}
});

test('email login normalizes input, rejects unsafe redirects, persists across requests and logout removes the session',async()=>{
  const f=fixture(),originalFetch=globalThis.fetch,p=identities(f);globalThis.fetch=p.fetcher;
  try{
    p.add('owner@example.test');
    const bad=await f.call('auth','POST',{action:'login'},{email:'owner@example.test',password:'senha errada para testar'});assert.equal(bad.status,401);
    assert.equal(f.db.prepare('select count(*) as n from auth_sessions').get().n,0);
    const {response,cookie}=await login(f,'  OWNER@example.test  ',initialPassword,'https://foreign.example/collect');
    assert.equal((await response.json()).next,'/app');
    for(let i=0;i<3;i++){
      const current=await f.call('auth','GET',{action:'session'},undefined,cookieHeader(cookie));
      assert.equal(current.status,200);assert.equal((await current.json()).user.email,'owner@example.test');
    }
    const denied=await f.call('auth','POST',{action:'logout'},{},{...cookieHeader(cookie),'x-pedido-csrf':'wrong'});assert.equal(denied.status,403);
    assert.equal((await f.call('account','GET',{},undefined,cookieHeader(cookie))).status,200);
    const loggedOut=await f.call('auth','POST',{action:'logout'},{},cookieHeader(cookie));
    assert.equal(loggedOut.status,200);assert.match(loggedOut.headers.get('Set-Cookie'),/Max-Age=0/);
    assert.equal(f.db.prepare('select count(*) as n from auth_sessions').get().n,0);
    assert.equal((await f.call('account','GET',{},undefined,cookieHeader(cookie))).status,401);
    const session=await (await f.call('auth','GET',{action:'session'},undefined,cookieHeader(cookie))).json();assert.equal(session.user,null);
    assert.ok(p.calls.some(c=>c.path==='logout'));
  }finally{globalThis.fetch=originalFetch;f.close();}
});

test('concurrent requests renew a persisted session once; revoked and expired sessions cannot enter the panel',async()=>{
  const f=fixture(),originalFetch=globalThis.fetch,p=identities(f);globalThis.fetch=p.fetcher;
  try{
    p.add('owner@example.test');const {cookie}=await login(f);
    f.db.prepare('update auth_sessions set token_expires_at=?').run(Math.floor(Date.now()/1000)-1);
    const current=await Promise.all([f.call('account','GET',{},undefined,cookieHeader(cookie)),f.call('account','GET',{},undefined,cookieHeader(cookie))]);
    assert.deepEqual(current.map(r=>r.status),[200,200]);assert.equal(p.calls.filter(c=>c.grant==='refresh_token').length,1);
    const persisted=f.db.prepare('select * from auth_sessions').get();assert.equal(persisted.refresh_lock,0);assert.ok(persisted.token_expires_at>Math.floor(Date.now()/1000));
    p.access.clear();assert.equal((await f.call('account','GET',{},undefined,cookieHeader(cookie))).status,401);
    assert.equal(f.db.prepare('select count(*) as n from auth_sessions').get().n,0);
    const second=await login(f);f.db.prepare('update auth_sessions set expires_at=?').run(Math.floor(Date.now()/1000)-1);
    assert.equal((await f.call('restaurants','GET',{},undefined,cookieHeader(second.cookie))).status,401);
    assert.equal(f.db.prepare('select count(*) as n from auth_sessions').get().n,0);
  }finally{globalThis.fetch=originalFetch;f.close();}
});

test('recovery remains private, rejects reused links and changing the password revokes all application sessions',async()=>{
  const f=fixture(),originalFetch=globalThis.fetch,p=identities(f);globalThis.fetch=p.fetcher;
  try{
    p.add('owner@example.test');const first=await login(f),second=await login(f);
    const existing=await f.call('auth','POST',{action:'recover'},{email:'owner@example.test'});
    const unknown=await f.call('auth','POST',{action:'recover'},{email:'missing@example.test'});
    assert.equal(existing.status,200);assert.deepEqual(await existing.json(),await unknown.json());
    const missing=await f.call('auth','POST',{action:'confirm-recovery'},{tokenHash:'ee'.repeat(32)});assert.equal(missing.status,401);
    const accepted=await f.call('auth','POST',{action:'confirm-recovery'},{tokenHash:recoveryHash});
    assert.equal(accepted.status,200);assert.match(accepted.headers.get('Set-Cookie'),/Max-Age=900/);const cookie=sessionCookie(accepted);
    for(const [route,method,params,body] of [
      ['account','GET',{},undefined],['restaurants','GET',{},undefined],
      ['restaurants','POST',{},{}],['restaurant','PUT',{id:'shop-a'},{}],
      ['publish','POST',{id:'shop-a'},{}],['media','POST',{id:'shop-a'},{}],
      ['admin','GET',{id:'shop-a'},undefined],['admin','PATCH',{id:'shop-a'},{}],
      ['platform','POST',{},undefined],['auth','POST',{action:'profile'},{name:'Tentativa'}],
    ])assert.equal((await f.call(route,method,params,body,cookieHeader(cookie))).status,401,route+' '+method);
    const replay=await f.call('auth','POST',{action:'confirm-recovery'},{tokenHash:recoveryHash});assert.equal(replay.status,401);
    const updated=await f.call('auth','POST',{action:'password'},{password:'uma nova senha para testar'},cookieHeader(cookie));
    assert.equal(updated.status,200,await updated.clone().text());assert.match(updated.headers.get('Set-Cookie'),/Max-Age=0/);
    assert.equal(f.db.prepare('select count(*) as n from auth_sessions').get().n,0);
    for(const old of [first.cookie,second.cookie,cookie])assert.equal((await f.call('account','GET',{},undefined,cookieHeader(old))).status,401);
    assert.equal((await f.call('auth','POST',{action:'login'},{email:'owner@example.test',password:initialPassword})).status,401);
    assert.equal((await login(f,'owner@example.test','uma nova senha para testar')).response.status,200);
    assert.ok(p.calls.some(c=>c.path==='logout'&&c.method==='POST'));
  }finally{globalThis.fetch=originalFetch;f.close();}
});

test('two Supabase identities cannot read customer data, update menus, publish, upload or approve the other shop orders',async()=>{
  const f=fixture(),originalFetch=globalThis.fetch,p=identities(f);globalThis.fetch=p.fetcher;
  try{
    p.add('owner@example.test',firstId);p.add('other@example.test',secondId);
    f.db.prepare('update restaurants set owner_id=? where id=?').run('supabase:'+firstId,'shop-a');
    f.db.prepare('update restaurants set owner_id=? where id=?').run('supabase:'+secondId,'shop-b');
    const a=await login(f),b=await login(f,'other@example.test');
    const {order,input}=await f.create();
    const uploaded=await f.call('upload','POST',{id:order.id},png,{'x-pedido-order-token':input.trackingToken,'Content-Type':'image/png'});
    assert.equal(uploaded.status,201);assert.equal((await uploaded.json()).order.receiptId,undefined);
    const receipt=f.db.prepare('select receipt_id as receiptId from orders where id=?').get(order.id);
    for(const [cookie,own,foreign] of [[a.cookie,'shop-a','shop-b'],[b.cookie,'shop-b','shop-a']]){
      const list=await f.call('restaurants','GET',{},undefined,cookieHeader(cookie));assert.equal(list.status,200);
      const rows=(await list.json()).restaurants;assert.deepEqual(rows.map(r=>r.id),[own]);assert.ok(!JSON.stringify(rows).includes('ownerId'));
      const orders=await f.call('admin','GET',{id:own},undefined,cookieHeader(cookie));assert.equal(orders.status,200);
      if(own==='shop-b')assert.ok(!JSON.stringify(await orders.json()).includes(input.customer));
      for(const [route,method,body] of [
        ['admin','GET',undefined],['admin','PATCH',{orderId:order.id,version:2,action:'confirm',receivedPix:true,etaMinutes:40}],
        ['restaurant','PUT',{revision:1,data:{...f.data,name:'Loja invadida'}}],
        ['publish','POST',{revision:1,published:false}],['media','POST',{}],
      ])assert.equal((await f.call(route,method,{id:foreign},body,cookieHeader(cookie))).status,404,route+' '+method);
    }
    const foreignProof=await f.call('proof','GET',{id:'shop-a',orderId:order.id,receiptId:receipt.receiptId},undefined,cookieHeader(b.cookie));assert.equal(foreignProof.status,404);
    const mixedProof=await f.call('proof','GET',{id:'shop-b',orderId:order.id,receiptId:receipt.receiptId},undefined,cookieHeader(b.cookie));assert.equal(mixedProof.status,404);
    assert.equal((await f.call('proof','GET',{id:'shop-a',orderId:order.id,receiptId:receipt.receiptId},undefined,cookieHeader(a.cookie))).status,200);
    const ownMenu=await f.call('restaurant','PUT',{id:'shop-a'},{revision:1,data:{...f.data,name:'Nome autorizado'}},cookieHeader(a.cookie));assert.equal(ownMenu.status,200,await ownMenu.clone().text());
    const accept=await f.call('admin','PATCH',{id:'shop-a'},{orderId:order.id,version:2,action:'confirm',receivedPix:true,etaMinutes:40},cookieHeader(a.cookie));assert.equal(accept.status,200,await accept.clone().text());
    assert.equal(f.db.prepare('select name from restaurants where id=?').get('shop-b').name,'Pizzaria de teste');
    assert.equal((await f.call('platform','POST',{},undefined,cookieHeader(a.cookie))).status,403);
    assert.equal((await f.call('platform','POST',{},undefined,cookieHeader(b.cookie))).status,403);
  }finally{globalThis.fetch=originalFetch;f.close();}
});

test('password changes in an ordinary session require the current password and cannot be forged cross origin',async()=>{
  const f=fixture(),originalFetch=globalThis.fetch,p=identities(f);globalThis.fetch=p.fetcher;
  try{
    p.add('owner@example.test');const {cookie}=await login(f);
    for(const body of [{password:'nova senha para testar'},{password:'nova senha para testar',currentPassword:'senha incorreta para testar'}]){
      const denied=await f.call('auth','POST',{action:'password'},body,cookieHeader(cookie));assert.ok([400,401].includes(denied.status));
      assert.equal((await f.call('account','GET',{},undefined,cookieHeader(cookie))).status,200);
    }
    const before=p.calls.length;
    const forged=await f.call('auth','POST',{action:'password'},{password:'nova senha para testar',currentPassword:initialPassword},{...cookieHeader(cookie),Origin:'https://foreign.example'});
    assert.equal(forged.status,403);assert.equal(p.calls.length,before);
    const updated=await f.call('auth','POST',{action:'password'},{password:'nova senha para testar',currentPassword:initialPassword},cookieHeader(cookie));
    assert.equal(updated.status,200);assert.equal(f.db.prepare('select count(*) as n from auth_sessions').get().n,0);
    assert.equal((await login(f,'owner@example.test','nova senha para testar')).response.status,200);
  }finally{globalThis.fetch=originalFetch;f.close();}
});
