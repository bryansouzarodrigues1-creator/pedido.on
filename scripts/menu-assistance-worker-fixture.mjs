// Isolated workerd/D1/R2. Only authentication and external push transport are simulated.
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {demoRestaurant} from '../lib/domain.ts';
const require=createRequire(import.meta.url),{Miniflare}=require(require.resolve('miniflare',{paths:[require.resolve('wrangler')]})),esbuild=require(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
export const origin='https://local.test',csrf='ac'.repeat(32),shopA='11111111-1111-4111-8111-111111111111',shopB='22222222-2222-4222-8222-222222222222';
export const store='https://www.ifood.com.br/delivery/teste-rj/loja/123e4567-e89b-42d3-a456-426614174000';
export const requestBody=()=>({storeUrl:store,authorized:true,contactWhatsApp:'(22) 99999-8888',contactPermission:true,notifyWhenReady:false});
export const capture=()=>({sourceUrl:store,storeName:'Loja sintética de teste',capturedAt:'2026-10-21T15:00:00Z',truncated:false,items:[
 {id:'pizza',category:'Pizzas',name:'Margherita',description:'Muçarela e manjericão',priceCents:5590,rawPrice:'R$ 55,90',imageUrl:'https://static-images.ifood.com.br/synthetic.jpg',needsReview:false,available:true,selected:true,sizeChoice:'g'},
 {id:'water',category:'Bebidas',name:'Água mineral',description:'500 ml',priceCents:550,rawPrice:'R$ 5,50',imageUrl:null,needsReview:false,available:true,selected:true,sizeChoice:null}
]});
const bundles=new Map();
export async function assistanceRuntime({support='',push={},outbound=()=>{throw Error('External request forbidden');},migrate=true,pauseUploads=false,legacyPhone=''}={}){
 const key=pauseUploads?'paused-upload':'normal';
 if(!bundles.has(key))bundles.set(key,esbuild.build({stdin:{contents:`
 import {requestContext} from 'test-request-context';
 import * as owner from './app/api/restaurants/[id]/import-assistance/route.ts';
 import * as admin from './app/api/admin/menu-import-assistance/route.ts';
 import * as runner from './app/api/admin/menu-import-results/route.ts';
 import * as failures from './app/api/admin/menu-import-failures/route.ts';
 import * as deliveries from './app/api/menu-import-deliveries/route.ts';
 import * as images from './app/api/menu-import-images/route.ts';
 import * as guests from './app/api/guest-previews/route.ts';
 import * as guest from './app/api/guest-previews/[id]/route.ts';
 import * as availability from './app/api/creator/availability/route.ts';
 import * as restaurants from './app/api/restaurants/route.ts';
 import * as restaurant from './app/api/restaurants/[id]/route.ts';
 export default {fetch(request){return requestContext.run(request,async()=>{
  const u=new URL(request.url),match=/^\\/api\\/restaurants\\/([^/]+)(\\/import-assistance)?$/.exec(u.pathname);
  if(u.pathname==='/api/restaurants')return restaurants[request.method](request);
  if(u.pathname==='/api/creator/availability')return availability[request.method](request);
  if(u.pathname==='/api/guest-previews')return guests[request.method](request);
  if(u.pathname.startsWith('/api/guest-previews/'))return guest.GET(request,{params:Promise.resolve({id:u.pathname.split('/').at(-1)})});
  if(match)return (match[2]?owner:restaurant)[request.method](request,{params:Promise.resolve({id:match[1]})});
  const routes={'/api/admin/menu-import-assistance':admin,'/api/admin/menu-import-results':runner,'/api/admin/menu-import-failures':failures,'/api/menu-import-deliveries':deliveries,'/api/menu-import-images':images};
  return routes[u.pathname]?.[request.method]?.(request)||new Response(null,{status:404});
 });}};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'neutral',format:'esm',external:['cloudflare:workers','node:async_hooks'],plugins:[{
  name:'local-identity',setup(build){
   if(pauseUploads){build.onResolve({filter:/^@\/lib\/http$/},args=>args.importer.split(path.sep).join('/').endsWith('/menu-import-images/route.ts')?{path:'upload-barrier',namespace:'test-upload'}:undefined);
    build.onLoad({filter:/.*/,namespace:'test-upload'},()=>({loader:'js',resolveDir:process.cwd(),contents:`export * from './lib/http.ts';import {readBytes as realRead} from './lib/http.ts';export async function readBytes(request,max){const bytes=await realRead(request,max);await fetch('https://upload-barrier.example.test/');return bytes;}`}));}
   build.onResolve({filter:/^(test-request-context|next\/headers|next\/navigation|@\/app\/chatgpt-auth)$/},args=>({path:args.path,namespace:'test-auth'}));
   build.onLoad({filter:/.*/,namespace:'test-auth'},args=>({loader:'js',contents:args.path==='test-request-context'?`import {AsyncLocalStorage} from 'node:async_hooks';export const requestContext=new AsyncLocalStorage();`:args.path==='next/headers'?`import {requestContext} from 'test-request-context';export async function headers(){return requestContext.getStore().headers;}`:args.path==='next/navigation'?`export function redirect(){throw Error('Unexpected navigation');}`:`import {headers} from 'next/headers';export async function getChatGPTUser(){const id=(await headers()).get('x-local-owner');return id?{userId:id,displayName:'Local QA',email:id+'@example.test',fullName:null}:null;}`}));
  }
 }]}));
 const mf=new Miniflare({modules:true,script:(await bundles.get(key)).outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'assistance-local'},d1Persist:false,r2Buckets:['BUCKET'],r2Persist:false,bindings:{PLATFORM_ADMIN_ACCOUNT_ID:'owner-admin',AUTH_SESSION_KEY:'ab'.repeat(32),PEDIDO_SUPPORT_WHATSAPP:support,...push},outboundService:outbound});
 const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('BUCKET');
 const migration=async file=>{for(const sql of readFileSync(path.join('drizzle',file),'utf8').split(file.startsWith('0017_')?'--> statement-breakpoint':';').map(v=>v.trim()).filter(Boolean))await db.prepare(sql).run();};
 try{
  const files=readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort();
  for(const file of files.filter(f=>Number(f.slice(0,4))<16))await migration(file);
  const stamp='2026-10-20T12:00:00.000Z',menu=JSON.stringify({...demoRestaurant(),whatsapp:legacyPhone});
  for(const [id,actor] of [[shopA,'owner-a'],[shopB,'owner-b']])await db.prepare('INSERT INTO restaurants(id,owner_id,slug,name,data,published_data,published,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?)').bind(id,actor,id,'Local QA',menu,menu,stamp,stamp).run();
  if(migrate)for(const file of files.filter(f=>Number(f.slice(0,4))>=16))await migration(file);
  const call=(pathname,{method='GET',body,actor='owner-a',headers={}}={})=>mf.dispatchFetch(origin+pathname,{method,headers:{origin,'x-local-owner':actor,cookie:'__Host-pedido-csrf='+csrf,'x-pedido-csrf':csrf,...(body!==undefined?{'content-type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const owner=(method='GET',body,extra={})=>call('/api/restaurants/'+shopA+'/import-assistance',{method,body,...extra});
  const pair=async id=>{const response=await call('/api/admin/menu-import-assistance',{method:'POST',body:{requestId:id},actor:'owner-admin'});if(response.status!==200)throw Error(await response.text());return (await response.json()).pairingCode;};
  const extension=(pathname,code,body,headers={})=>call(pathname,{method:'POST',body,actor:'',headers:{origin:'chrome-extension://'+'a'.repeat(32),authorization:'Bearer '+code,...headers}});
  const photo=(code,{itemId='pizza',source='https://static-images.ifood.com.br/synthetic.jpg',bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfS8AAAAASUVORK5CYII=','base64')}={})=>mf.dispatchFetch(origin+'/api/menu-import-images',{method:'POST',headers:{origin:'chrome-extension://'+'a'.repeat(32),authorization:'Bearer '+code,'x-menu-item-id':itemId,'x-source-image-url':source,'content-type':'image/png'},body:bytes});
  return {mf,db,bucket,call,owner,pair,extension,photo,migration,close:()=>mf.dispose()};
 }catch(e){await mf.dispose();throw e;}
}
