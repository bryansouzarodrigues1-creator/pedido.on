// Live validation only: no email, password or personal data is sent. The empty
// signup body must stop at schema validation before provider or database writes.
import assert from 'node:assert/strict';
const origin=process.argv[2];
assert.ok(['https://pizzaria-on.netlify.app','https://forno-cardapios.waves4845.chatgpt.site'].includes(origin),'Use an existing production origin.');
const options={redirect:'manual',signal:AbortSignal.timeout(20_000)};
const configResponse=await fetch(origin+'/api/auth/config?registration=1',options);
assert.equal(configResponse.status,200,'Auth configuration HTTP status');
const config=await configResponse.json();
assert.equal(config.enabled,true);assert.equal(config.registrationEnabled,true);assert.equal(config.directSignup,true);assert.equal(config.inviteRequired,false);
assert.ok(typeof config.csrf==='string'&&config.csrf.length>=32);
const cookie=configResponse.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
assert.ok(cookie,'Configuration must issue its CSRF cookie.');
const response=await fetch(origin+'/api/auth/register',{...options,signal:AbortSignal.timeout(20_000),method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-pedido-csrf':config.csrf,Cookie:cookie},body:'{}'});
assert.equal(response.status,400,'Empty registration must reach validation, not maintenance, CSRF or proxy rejection.');
const result=await response.json();assert.equal(typeof result.error,'string');assert.doesNotMatch(result.error,/preparando|manuten|origem|verifica/i);
console.log(JSON.stringify({origin,registrationOpen:true,emptySignupStatus:response.status,scope:'Empty invalid signup only; no credentials, account, restaurant, payment or email.'}));
