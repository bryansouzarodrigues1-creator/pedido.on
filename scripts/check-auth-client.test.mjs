import test from 'node:test';
import assert from 'node:assert/strict';
import {sendAuthCommand} from '../lib/auth-client.ts';
test('authentication commands have a deadline and preserve the CSRF contract',async()=>{
 let calls=0;const response=await sendAuthCommand('login',{email:'qa@example.test',password:'fictitious'},'csrf-qa',async(url,request)=>{calls++;assert.equal(url,'/api/auth/login');assert.equal(request.method,'POST');assert.equal(request.headers['x-pedido-csrf'],'csrf-qa');assert.ok(request.signal instanceof AbortSignal);assert.equal(JSON.parse(request.body).email,'qa@example.test');return Response.json({ok:true,next:'/app'});});assert.deepEqual(response,{ok:true,next:'/app'});assert.equal(calls,1);
});
test('network errors and timeouts never automatically repeat a recovery or password command',async()=>{
 for(const error of [new TypeError('Failed to fetch'),new DOMException('timeout','TimeoutError')]){let calls=0;await assert.rejects(sendAuthCommand('password',{password:'fictitious'},'qa',async()=>{calls++;throw error;}),/Confira se a ação foi concluída/);assert.equal(calls,1);}
});
test('provider failures and malformed gateway replies produce actionable messages',async()=>{
 await assert.rejects(sendAuthCommand('login',{},'qa',async()=>Response.json({error:'E-mail ou senha incorretos.'},{status:401})),/E-mail ou senha incorretos/);
 await assert.rejects(sendAuthCommand('recover',{},'qa',async()=>new Response('<html>temporary gateway</html>',{status:502})),/serviço não respondeu/);
 await assert.rejects(sendAuthCommand('recover',{},'qa',async()=>Response.json(null)),/serviço não respondeu/);
});
