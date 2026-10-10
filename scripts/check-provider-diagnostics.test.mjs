import test from 'node:test';
import assert from 'node:assert/strict';
import {providerFailure} from '../lib/provider-diagnostics.ts';

test('provider diagnostics retain network evidence while removing credentials, body values and URL queries',()=>{
 const key='sb_publishable_do-not-log',password='example-private-password',access='private-access-value',code='private-oauth-code';
 const result=providerFailure(new TypeError(`Network connection lost: ${key} ${password} ${access} https://provider.example/auth/v1/token?code=${code}`),[key,access,{password}]);
 assert.equal(result.name,'TypeError');assert.match(result.message,/Network connection lost/);
 for(const value of [key,password,access,code])assert.ok(!result.message.includes(value));
 assert.equal(providerFailure(new Error('Request contains Authorization: Bearer another-value'),[]).message,'Sensitive error details omitted');
 assert.equal(providerFailure(new Error('Cookie: private-value'),[]).message,'Sensitive error details omitted');
 assert.equal(providerFailure(new Error('failed for nested-field'),[{data:{secret:'nested-field'}}]).message,'failed for [redacted]');
});
