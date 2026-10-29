import test from 'node:test';
import assert from 'node:assert/strict';
import {chunkRecoveryKey,chunkRecoveryCooldown,isChunkLoadError,safeChunkRecoveryLocation,takeChunkRecovery} from '../lib/chunk-recovery.ts';
const location={pathname:'/app',search:'?loja=local-fixture',hash:''},error=new TypeError('Failed to fetch dynamically imported module: https://site.invalid/_next/static/chunks/idea-start-old.js'),now=1800000000000;
function store(){const values=new Map([['auth','keep-session'],['draft','keep-draft']]);return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};}
test('recognizes actual release-file errors while ordinary network, API and server failures stay manual',()=>{
 for(const e of [error,{name:'ChunkLoadError',message:'Loading chunk 12 failed.'},new Error('error loading dynamically imported module'),new Error('Importing a module script failed.'),new Error('Unable to preload CSS for /assets/old.css')])assert.equal(isChunkLoadError(e),true);
 for(const e of [null,'Failed to fetch dynamically imported module',new TypeError('Failed to fetch'),new Error('Payment request failed'),new Error('Request timed out'),{message:422}])assert.equal(isChunkLoadError(e),false);
});
test('never automatically revisits identity/recovery callbacks or URLs carrying authentication proof',()=>{
 assert.equal(safeChunkRecoveryLocation(location),true);
 for(const pathname of ['/redefinir-senha','/confirmar-email','/signin-with-chatgpt','/auth/callback','/api/auth/config','//another.invalid'])assert.equal(safeChunkRecoveryLocation({...location,pathname}),false,pathname);
 for(const query of ['?code=private','?TOKEN_HASH=private','#access_token=private','?state=private','?session_id=private'])assert.equal(safeChunkRecoveryLocation({...location,search:query.startsWith('?')?query:'',hash:query.startsWith('#')?query:''}),false);
});
test('allows one document recovery per tab cooldown and preserves all session/draft values',()=>{
 const storage=store();assert.equal(takeChunkRecovery(error,location,true,storage,now),true);assert.equal(storage.values.get(chunkRecoveryKey),String(now));assert.equal(takeChunkRecovery(error,location,true,storage,now+1),false);assert.equal(takeChunkRecovery(error,location,true,storage,now+chunkRecoveryCooldown-1),false);assert.equal(takeChunkRecovery(error,location,true,storage,now+chunkRecoveryCooldown),true);assert.equal(storage.values.get('auth'),'keep-session');assert.equal(storage.values.get('draft'),'keep-draft');assert.deepEqual([...storage.values.keys()].sort(),['auth','draft',chunkRecoveryKey].sort());
});
test('offline, blocked storage and malformed/future guards fail closed without a reload loop',()=>{
 const storage=store();assert.equal(takeChunkRecovery(error,location,false,storage,now),false);assert.equal(storage.values.has(chunkRecoveryKey),false);
 for(const previous of ['broken','',String(now+100000)]){storage.values.set(chunkRecoveryKey,previous);assert.equal(takeChunkRecovery(error,location,true,storage,now),false);}
 for(const broken of [{getItem(){throw Error('denied');},setItem(){}},{getItem(){return null;},setItem(){throw Error('full');}}])assert.equal(takeChunkRecovery(error,location,true,broken,now),false);
 assert.equal(takeChunkRecovery(new Error('Failed to fetch'),location,true,store(),now),false);
});
