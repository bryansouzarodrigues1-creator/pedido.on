import test from 'node:test';
import assert from 'node:assert/strict';
import {pkceChallenge,googleAuthorizationUrl,randomToken,sealTokens,openTokens,oauthCookie,readOauthCookie,validGoogleFlow,oauthErrorMessage,OAUTH_SECONDS} from '../lib/auth-policy.ts';

const origin='https://pedido.example',provider='https://pedido.supabase.co';
const flow={provider:'google',nonce:'ab'.repeat(32),verifier:'cd'.repeat(32),next:'/app?new=1',createdAt:1000};

test('PKCE uses the RFC 7636 SHA-256 vector and never exposes the verifier in the authorization URL',async()=>{
 const verifier='dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
 const challenge=await pkceChallenge(verifier);
 assert.equal(challenge,'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
 const url=new URL(googleAuthorizationUrl(provider,origin,flow.nonce,challenge));
 assert.equal(url.origin,provider);assert.equal(url.pathname,'/auth/v1/authorize');
 assert.equal(url.searchParams.get('provider'),'google');assert.equal(url.searchParams.get('code_challenge_method'),'s256');
 assert.equal(url.searchParams.get('redirect_to'),origin+'/api/auth/google/callback/'+flow.nonce);
 assert.equal(url.searchParams.get('code_challenge'),challenge);assert.ok(!url.toString().includes(verifier));
 for(const invalid of ['short','a'.repeat(129),'a'.repeat(43)+'\n'])await assert.rejects(pkceChallenge(invalid));
});

test('authorization endpoints require exact HTTPS origins and valid callback state',async()=>{
 const challenge=await pkceChallenge(flow.verifier);
 for(const invalid of ['http://pedido.example','https://user:pass@pedido.example','https://pedido.example/path','https://pedido.example/?next=evil','https://pedido.example/#fragment']){
  assert.throws(()=>googleAuthorizationUrl(invalid,origin,flow.nonce,challenge));
  assert.throws(()=>googleAuthorizationUrl(provider,invalid,flow.nonce,challenge));
 }
 for(const nonce of ['', 'forged', flow.nonce+'/../other'])assert.throws(()=>googleAuthorizationUrl(provider,origin,nonce,challenge));
 assert.throws(()=>googleAuthorizationUrl(provider,origin,flow.nonce,'invalid'));
});

test('the encrypted login flow binds the verifier to its purpose and site, and rejects tampering',async()=>{
 const key='ef'.repeat(32),context='pedido-oauth:google:'+origin;
 const sealed=await sealTokens(flow,key,context);
 assert.ok(!sealed.includes(flow.verifier));assert.deepEqual(await openTokens(sealed,key,context),flow);
 await assert.rejects(openTokens(sealed,key,'pedido-oauth:google:https://other.example'));
 await assert.rejects(openTokens(sealed,key,'account-session'));
 await assert.rejects(openTokens(sealed,'ac'.repeat(32),context));
 const changed=sealed.slice(0,-2)+(sealed.endsWith('00')?'01':'00');await assert.rejects(openTokens(changed,key,context));
 assert.notEqual(randomToken(),randomToken());
});

test('the temporary OAuth cookie is HttpOnly, host scoped, time limited and bounded before decryption',async()=>{
 const sealed=await sealTokens(flow,'ef'.repeat(32),'pedido-oauth:google:'+origin);
 const cookie=oauthCookie(sealed,true);
 assert.match(cookie,/^__Host-pedido-oauth=/);assert.match(cookie,/; HttpOnly/);assert.match(cookie,/; Secure$/);
 assert.match(cookie,/; SameSite=Lax/);assert.match(cookie,/; Path=\//);assert.match(cookie,/; Max-Age=600/);assert.doesNotMatch(cookie,/Domain=/);
 assert.equal(readOauthCookie(cookie,true),sealed);
 for(const value of ['forged','ab'.repeat(2049),'a'.repeat(57)])assert.equal(readOauthCookie('__Host-pedido-oauth='+value,true),'');
 assert.equal(readOauthCookie('pedido-oauth='+sealed,true),'');
 assert.match(oauthCookie('',true,0),/Max-Age=0/);
});

test('callback state rejects cross-browser attempts, stale or future flows and unsafe return paths',()=>{
 assert.equal(validGoogleFlow(flow,flow.nonce,1001),true);
 assert.equal(validGoogleFlow(flow,flow.nonce,1000+OAUTH_SECONDS-1),true);
 assert.equal(validGoogleFlow(flow,flow.nonce,1000+OAUTH_SECONDS),false);
 assert.equal(validGoogleFlow(flow,flow.nonce,999),false);
 assert.equal(validGoogleFlow(flow,'cd'.repeat(32),1001),false);
 for(const patch of [{provider:'email'},{verifier:'short'},{createdAt:1000.5},{createdAt:'1000'},{next:'https://evil.example'},{next:'//evil.example'},{next:'/api/auth/logout'},{next:'/%2f%2fevil.example'},{next:'/\\evil.example'},{next:'/'+ 'a'.repeat(300)}])assert.equal(validGoogleFlow({...flow,...patch},flow.nonce,1001),false);
 for(const value of [null,undefined,'flow',{}])assert.equal(validGoogleFlow(value,flow.nonce,1001),false);
});

test('provider errors use fixed customer messages without reflecting arbitrary callback input',()=>{
 for(const reason of ['cancelled','expired','unavailable','failed'])assert.ok(oauthErrorMessage(reason).length>0);
 for(const untrusted of ['<script>alert(1)</script>','access_token=secret','provider stack trace',['failed'],null])assert.equal(oauthErrorMessage(untrusted),'');
});
