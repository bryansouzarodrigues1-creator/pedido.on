import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSupabase,checkOpenAi} from '../lib/integration-checks.ts';
import {authEmails} from '../lib/auth-emails.ts';

const base={origin:'https://pedido.supabase.co',key:'sb_publishable_private-test-value',sessionKey:'ab'.repeat(32),emailReady:false};
const validSettings={external:{email:true},disable_signup:false,mailer_autoconfirm:true};
const json=value=>Response.json(value);

test('unconfigured providers and invalid origins never make an external request',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('must not call');};
 for(const origin of ['', 'http://pedido.supabase.co','https://user:password@pedido.supabase.co','https://pedido.supabase.co/auth/v1','https://pedido.supabase.co/?key=secret']){
  const report=await checkSupabase({...base,origin},fetcher);assert.equal(report.find(x=>x.id==='supabase').state,'pending');
 }
 const ai=await checkOpenAi({key:'',model:'gpt-6-luna',enabled:true},fetcher);assert.equal(ai[0].state,'pending');assert.equal(calls,0);
});

test('connection tests use read-only requests, protected headers and reject redirects',async()=>{
 const requests=[];const fetcher=async(url,options)=>{requests.push({url,options});return url.includes('supabase')?json(validSettings):json({id:'gpt-6-luna',object:'model'});};
 const supabase=await checkSupabase(base,fetcher),ai=await checkOpenAi({key:'sk-private-test-value',model:'gpt-6-luna',enabled:false},fetcher);
 assert.equal(requests.length,2);assert.equal(requests[0].url,base.origin+'/auth/v1/settings');assert.equal(requests[1].url,'https://api.openai.com/v1/models/gpt-6-luna');
 for(const {url,options} of requests){assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');assert.ok(options.signal);assert.equal(options.body,undefined);assert.ok(!url.includes('private-test-value'));}
 assert.equal(requests[0].options.headers.apikey,base.key);assert.equal(requests[1].options.headers.Authorization,'Bearer sk-private-test-value');
 assert.equal(supabase.find(x=>x.id==='supabase').state,'ok');assert.equal(ai.find(x=>x.id==='ai-activation').state,'pending');
 assert.ok(!JSON.stringify({supabase,ai}).includes('private-test-value'));
});

test('a reachable auth server does not hide disabled signup, email login or a confirmation requirement',async()=>{
 const report=await checkSupabase(base,async()=>json({external:{email:false},disable_signup:true,mailer_autoconfirm:false}));
 assert.equal(report.find(x=>x.id==='supabase').state,'ok');
 for(const id of ['email-login','signup','confirmation'])assert.equal(report.find(x=>x.id===id).state,'error',id);
 const unknown=await checkSupabase(base,async()=>json({external:{email:true}}));assert.equal(unknown.find(x=>x.id==='supabase').state,'error');assert.ok(!unknown.some(x=>x.id==='confirmation'&&x.state==='ok'));
});

test('SMTP activation remains a declared delivery test, never an inferred connection success',async()=>{
 const pending=await checkSupabase(base,async()=>json(validSettings));assert.equal(pending.find(x=>x.id==='smtp').state,'pending');
 const declared=await checkSupabase({...base,emailReady:true},async()=>json(validSettings));assert.equal(declared.find(x=>x.id==='smtp').state,'review');assert.match(declared.find(x=>x.id==='smtp').message,/não envia mensagens/);
 const prototype=await checkSupabase({...base,prototype:true},async()=>json(validSettings));assert.equal(prototype.find(x=>x.id==='smtp').state,'review');assert.match(prototype.find(x=>x.id==='smtp').message,/sem domínio próprio/);assert.match(prototype.find(x=>x.id==='smtp').message,/não comprova recebimento/);
 const invalidSession=await checkSupabase({...base,sessionKey:'bad'},async()=>json(validSettings));assert.equal(invalidSession.find(x=>x.id==='sessions').state,'pending');
});

test('Google activation is independent of SMTP and the probe does not pretend to execute OAuth',async()=>{
 const settings={...validSettings,external:{email:true,google:true}};
 const pending=await checkSupabase({...base,googleEnabled:false},async()=>json(settings));assert.equal(pending.find(x=>x.id==='google-login').state,'pending');
 const active=await checkSupabase({...base,googleEnabled:true},async()=>json(settings));
 assert.equal(active.find(x=>x.id==='google-login').state,'review');assert.match(active.find(x=>x.id==='google-login').message,/não executa o login/);
 assert.equal(active.find(x=>x.id==='smtp').state,'pending');
 const disabled=await checkSupabase({...base,googleEnabled:true},async()=>json({...settings,external:{email:true,google:false}}));assert.equal(disabled.find(x=>x.id==='google-login').state,'error');
 const unknown=await checkSupabase({...base,googleEnabled:true},async()=>json(validSettings));assert.equal(unknown.find(x=>x.id==='google-login').state,'pending');
});

test('provider failures are sanitized; secret-bearing error bodies and network exceptions never reach the client',async()=>{
 const secret='sk-upstream-secret-leak';
 for(const status of [401,403,404,429,500]){
  const fetcher=async()=>new Response(JSON.stringify({error:{message:secret},key:base.key}),{status});
  for(const report of [await checkSupabase(base,fetcher),await checkOpenAi({key:secret,model:'gpt-6-luna',enabled:true},fetcher)]){
   assert.ok(report.some(x=>x.state==='error'));assert.ok(!JSON.stringify(report).includes(secret));assert.ok(!JSON.stringify(report).includes(base.key));
  }
 }
 const throwing=async()=>{throw Error(secret);};
 assert.ok(!JSON.stringify(await checkSupabase(base,throwing)).includes(secret));assert.ok(!JSON.stringify(await checkOpenAi({key:secret,model:'gpt-6-luna',enabled:true},throwing)).includes(secret));
});

test('the model probe validates its identity and does not pretend to verify generation or account balance',async()=>{
 const config={key:'sk-private-test-value',model:'gpt-6-luna',enabled:true};
 for(const value of [{id:'other',object:'model'},{id:config.model,object:'response'},null])assert.equal((await checkOpenAi(config,async()=>json(value)))[0].state,'error');
 const valid=await checkOpenAi(config,async()=>json({id:config.model,object:'model'}));assert.equal(valid[0].state,'ok');assert.match(valid[0].message,/não confirma saldo nem permissão/);
});

test('recovery email always opens the app password route, including manual provider recovery',()=>{
 assert.match(authEmails.recovery.html,/\{\{ \.SiteURL \}\}\/redefinir-senha\?token_hash=\{\{ \.TokenHash \}\}/);
 assert.doesNotMatch(authEmails.recovery.html,/confirmar-email|ConfirmationURL/);
 assert.match(authEmails.confirmation.html,/\{\{ \.SiteURL \}\}\/confirmar-email\?token_hash=\{\{ \.TokenHash \}\}/);
 for(const template of Object.values(authEmails)){
  assert.doesNotMatch(template.html,/\.Data|<script|<iframe|onload=/);assert.match(template.html,/role="presentation"/);assert.match(template.html,/lang="pt-BR"/);
 }
});
