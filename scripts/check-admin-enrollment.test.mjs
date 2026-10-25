import test from 'node:test';
import assert from 'node:assert/strict';
import {validAdminEnrollment,providerAdminAuthority} from '../lib/admin-enrollment-policy.ts';
import {isPlatformAdministrator} from '../lib/admin-policy.ts';
const authority='ab'.repeat(32),token='cd'.repeat(32),email='owner@example.test';
test('a private administrator invitation is bound to the configured email and expiry',async()=>{
 const tokenHash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
 const env={PLATFORM_ADMIN_EMAIL:email,PLATFORM_ADMIN_AUTHORITY:authority,PLATFORM_ADMIN_INVITE_HASH:tokenHash,PLATFORM_ADMIN_INVITE_EXPIRES:'2000'};
 assert.equal(await validAdminEnrollment(' OWNER@example.test ',token,env,1000),true);
 for(const [address,key,settings,now] of [['other@example.test',token,env,1000],[email,'ef'.repeat(32),env,1000],[email,token,env,2000],[email,token,{...env,PLATFORM_ADMIN_AUTHORITY:''},1000],[email,token,{...env,PLATFORM_ADMIN_INVITE_EXPIRES:'9999999999'},1000]])assert.equal(await validAdminEnrollment(address,key,settings,now),false);
});
test('matching an email alone or supplying editable user metadata never grants administrator access',()=>{
 const config={email,authority},user={userId:'supabase:new-owner',email,provider:'supabase'};
 assert.equal(isPlatformAdministrator(user,config),false);
 assert.equal(providerAdminAuthority({user_metadata:{pizzaria_admin_authority:authority}}),undefined);
 assert.equal(isPlatformAdministrator({...user,adminAuthority:providerAdminAuthority({pizzaria_admin_authority:authority})},config),true);
 assert.equal(isPlatformAdministrator({...user,email:'other@example.test',adminAuthority:authority},config),false);
 assert.equal(isPlatformAdministrator({...user,provider:'chatgpt',adminAuthority:authority},config),false);
 assert.equal(isPlatformAdministrator({...user,adminAuthority:'ef'.repeat(32)},config),false);
 assert.equal(isPlatformAdministrator({...user,adminAuthority:authority},{...config,accountId:'supabase:other'}),false);
});
