export const SESSION_COOKIE = "__Host-pedido-session";
export const LOCAL_SESSION_COOKIE = "pedido-session";
export const RECOVERY_SECONDS = 15 * 60;
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const OAUTH_SECONDS = 10 * 60;
export type GoogleFlow = {provider:"google";nonce:string;verifier:string;next:string;createdAt:number};
export function safeReturnPath(value: unknown, fallback = "/app") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n\x00]/.test(value)) return fallback;
  try { const url = new URL(value,"https://local.invalid"),path=decodeURIComponent(url.pathname); if(url.origin!=="https://local.invalid"||path.startsWith("//")||/[\\\r\n\x00]/.test(path)||/^\/(?:auth|api|signin-with-chatgpt|signout-with-chatgpt|callback)(?:\/|$)/.test(path))return fallback; return url.pathname+url.search; } catch { return fallback; }
}
export function providerOrigin(value:string) { try {const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&u.pathname==="/"&&!u.search&&!u.hash?u.origin:"";}catch{return "";}}
export function normalizeEmail(value:string){return value.trim().toLowerCase();}
export function validPassword(value:string){return value.length>=12&&value.length<=128&&!/\x00/.test(value);}
export function sessionCookieName(secure:boolean){return secure?SESSION_COOKIE:LOCAL_SESSION_COOKIE;}
export function sessionCookie(value:string,secure:boolean,maxAge:number){return sessionCookieName(secure)+"="+value+"; Path=/; HttpOnly; SameSite=Lax; Max-Age="+Math.max(0,maxAge)+(secure?"; Secure":"");}
export function readSessionCookie(value:string,secure:boolean){const key=sessionCookieName(secure)+"=";const token=value.split(";").map(s=>s.trim()).find(s=>s.startsWith(key))?.slice(key.length)||"";return /^[a-f0-9]{64}$/.test(token)?token:"";}
export function authScope(type:string){return type==="recovery"?"recovery":type==="email"||type==="signup"?"account":null;}
export function allowsAccountAccess(scope:string){return scope==="account";}
export function verificationPurpose(action:string){return action==="confirm-recovery"?"recovery":action==="confirm-email"?"email":null;}
export async function sha256(value:string){const b=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));return [...b].map(v=>v.toString(16).padStart(2,"0")).join("");}
export function randomToken(){return [...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,"0")).join("");}
export async function sealTokens(value:unknown,secret:string,context:string){
  if(!/^[a-f0-9]{64}$/.test(secret))throw new Error("Session encryption is not configured");
  const key=await crypto.subtle.importKey("raw",Uint8Array.from(secret.match(/../g)!,v=>parseInt(v,16)),"AES-GCM",false,["encrypt"]);
  const iv=crypto.getRandomValues(new Uint8Array(12)),encrypted=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:new TextEncoder().encode(context)},key,new TextEncoder().encode(JSON.stringify(value))));
  return [...iv,...encrypted].map(v=>v.toString(16).padStart(2,"0")).join("");
}
export async function openTokens<T>(sealed:string,secret:string,context:string):Promise<T>{
  if(!/^[a-f0-9]{64}$/.test(secret)||!/^[a-f0-9]{56,20000}$/.test(sealed)||sealed.length%2)throw new Error("Invalid encrypted session");
  const bytes=Uint8Array.from(sealed.match(/../g)!,v=>parseInt(v,16)),key=await crypto.subtle.importKey("raw",Uint8Array.from(secret.match(/../g)!,v=>parseInt(v,16)),"AES-GCM",false,["decrypt"]);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:bytes.slice(0,12),additionalData:new TextEncoder().encode(context)},key,bytes.slice(12)))) as T;
}

export async function pkceChallenge(verifier:string){
  if(!/^[a-zA-Z0-9._~-]{43,128}$/.test(verifier))throw new Error("Invalid PKCE verifier");
  const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
export function googleAuthorizationUrl(provider:string,site:string,nonce:string,challenge:string){
  const origin=providerOrigin(provider),siteOrigin=providerOrigin(site);
  if(!origin||!siteOrigin||!/^[a-f0-9]{64}$/.test(nonce)||!/^[a-zA-Z0-9_-]{43}$/.test(challenge))throw new Error("Invalid OAuth configuration");
  const url=new URL(origin+"/auth/v1/authorize");
  url.searchParams.set("provider","google");
  url.searchParams.set("redirect_to",siteOrigin+"/api/auth/google/callback/"+nonce);
  url.searchParams.set("code_challenge",challenge);
  url.searchParams.set("code_challenge_method","s256");
  url.searchParams.set("prompt","select_account");
  return url.toString();
}
export function oauthCookieName(secure:boolean){return secure?"__Host-pedido-oauth":"pedido-oauth";}
export function oauthCookie(value:string,secure:boolean,seconds=OAUTH_SECONDS){return oauthCookieName(secure)+"="+value+"; Path=/; HttpOnly; SameSite=Lax; Max-Age="+Math.max(0,seconds)+(secure?"; Secure":"");}
export function readOauthCookie(header:string,secure:boolean){
  const name=oauthCookieName(secure)+"=",value=header.split(";").map(v=>v.trim()).find(v=>v.startsWith(name))?.slice(name.length)||"";
  return /^[a-f0-9]{56,4096}$/.test(value)&&value.length%2===0?value:"";
}
export function validGoogleFlow(value:unknown,nonce:string,now=Math.floor(Date.now()/1000)):value is GoogleFlow{
  if(!value||typeof value!=="object")return false;const v=value as Partial<GoogleFlow>;
  return v.provider==="google"&&/^[a-f0-9]{64}$/.test(nonce)&&v.nonce===nonce&&typeof v.verifier==="string"&&/^[a-zA-Z0-9._~-]{43,128}$/.test(v.verifier)&&typeof v.next==="string"&&v.next.length<=300&&safeReturnPath(v.next)===v.next&&typeof v.createdAt==="number"&&Number.isInteger(v.createdAt)&&v.createdAt<=now&&v.createdAt>now-OAUTH_SECONDS;
}
export function oauthErrorMessage(value:unknown){return value==="cancelled"?"O acesso com Google foi cancelado. Você pode tentar novamente ou entrar por e-mail.":value==="expired"?"Essa tentativa de acesso expirou ou começou em outra aba. Entre com Google novamente.":value==="unavailable"?"O acesso com Google está sendo configurado. Tente novamente mais tarde.":value==="failed"?"Não conseguimos concluir o acesso com Google. Tente novamente.":"";}

