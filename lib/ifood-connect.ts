import {env} from "cloudflare:workers";
import {openTokens,sealTokens,sha256} from "./auth-policy";
import {csrfValue} from "./csrf";
import {parseIfoodStoreLink} from "./menu-source-links";
import type {IfoodCode} from "./ifood-api";
export type PendingIfood={url:string;userCode:string;verificationUrl:string;verifier:string;createdAt:number;expiresAt:number};
export type PublicIfoodConnection={url:string;userCode:string;verificationUrl:string;expiresAt:number};
export function ifoodConfig(){
 const e=env as typeof env&{PEDIDO_IFOOD_ENABLED?:string;IFOOD_CLIENT_ID?:string;IFOOD_CLIENT_SECRET?:string;AUTH_SESSION_KEY?:string};
 const clientId=e.IFOOD_CLIENT_ID||"",clientSecret=e.IFOOD_CLIENT_SECRET||"",seal=e.AUTH_SESSION_KEY||"";
 return {enabled:e.PEDIDO_IFOOD_ENABLED==="true"&&/^[a-zA-Z\d_-]{1,128}$/.test(clientId)&&clientSecret.length>0&&clientSecret.length<=512&&!/[\r\n]/.test(clientSecret)&&/^[a-f0-9]{64}$/.test(seal),clientId,clientSecret,seal};
}
const cookieName=(request:Request)=>new URL(request.url).protocol==="https:"?"__Host-pedido-ifood":"pedido-ifood";
export function ifoodCookie(request:Request,value:string,seconds=0){return cookieName(request)+"="+value+"; Path=/; HttpOnly; SameSite=Lax; Max-Age="+Math.max(0,seconds)+(new URL(request.url).protocol==="https:"?"; Secure":"");}
async function context(request:Request){return "ifood-import:v1:"+await sha256(ifoodConfig().clientId+":"+csrfValue(request));}
export function publicIfoodPending(p:PendingIfood):PublicIfoodConnection{return {url:p.url,userCode:p.userCode,verificationUrl:p.verificationUrl,expiresAt:p.expiresAt};}
export async function createIfoodPending(request:Request,url:string,code:IfoodCode){
 const now=Math.floor(Date.now()/1000),payload:PendingIfood={url,userCode:code.userCode,verifier:code.verifier,verificationUrl:code.verificationUrl,createdAt:now,expiresAt:now+code.expiresIn};
 // Store only the verifier for this short authorization; provider tokens never persist.
 const sealed=await sealTokens(payload,ifoodConfig().seal,await context(request));if(sealed.length>3600)throw Error("Authorization state too large");
 return {pending:payload,cookie:ifoodCookie(request,sealed,code.expiresIn)};
}
export async function readIfoodPending(request:Request):Promise<PendingIfood|null>{
 const prefix=cookieName(request)+"=",value=request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(prefix))?.slice(prefix.length)||"";
 if(!csrfValue(request)||!/^[a-f0-9]{56,3600}$/.test(value)||value.length%2)return null;
 try{const p=await openTokens<PendingIfood>(value,ifoodConfig().seal,await context(request)),now=Math.floor(Date.now()/1000);
  if(!p||typeof p.url!=="string"||parseIfoodStoreLink(p.url)?.url!==p.url||typeof p.verifier!=="string"||!p.verifier||p.verifier.length>512||typeof p.userCode!=="string"||!/^[A-Z\d-]{4,32}$/i.test(p.userCode)||!Number.isInteger(p.createdAt)||p.createdAt>now||!Number.isInteger(p.expiresAt)||p.expiresAt<=now||p.expiresAt>p.createdAt+600)return null;
  const url=new URL(p.verificationUrl);if(url.origin!=="https://portal.ifood.com.br"||url.pathname!=="/apps/code"||url.searchParams.get("c")!==p.userCode||url.username||url.password||url.hash)return null;return p;
 }catch{return null;}
}
