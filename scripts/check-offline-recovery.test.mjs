import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/offline.html',import.meta.url),'utf8'),source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function page({path='/pedido/qa',ok=true}={}){
 const hooks={},buttons={},requests=[],navigations=[],stored=new Map();const document={visibilityState:'visible',getElementById:id=>buttons[id]??=( {textContent:'',addEventListener:(event,handler)=>hooks[id+':'+event]=handler}),addEventListener:(event,handler)=>hooks['document:'+event]=handler};const location={pathname:path,href:'https://pedido.example'+path+'?view=details#private-token',replace:url=>navigations.push(url)};
 vm.runInNewContext(source,{document,location,navigator:{onLine:true},sessionStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)},fetch:async(url,options)=>{requests.push({url,options});return {ok,json:async()=>({ok})};},AbortSignal,Date,setTimeout,clearTimeout,addEventListener:(event,handler)=>hooks[event]=handler});return {hooks,requests,navigations,document,location};
}
test('reconnect preserves the exact page, query and private fragment, without sending a mutation',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1800000000000});const p=page();await p.hooks.online();await settle();assert.deepEqual(p.navigations,[p.location.href]);assert.deepEqual(p.requests.map(r=>r.url),['/api/connection']);assert.equal(p.requests[0].options.cache,'no-store');assert.equal(p.requests[0].options.method,undefined);
 await p.hooks.online();await settle();assert.equal(p.navigations.length,1);p.hooks['retry:click']();assert.equal(p.navigations.length,2);
});
test('unavailable backend remains on the reconnect page and a direct offline URL returns to the panel',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1800000000000});const unavailable=page({ok:false});await unavailable.hooks.online();await settle();assert.equal(unavailable.navigations.length,0);unavailable.document.visibilityState='hidden';await unavailable.hooks['document:visibilitychange']();t.mock.timers.tick(30000);await settle();assert.equal(unavailable.requests.length,1);
 const direct=page({path:'/offline.html'});direct.hooks['retry:click']();assert.deepEqual(direct.navigations,['/app']);
});
