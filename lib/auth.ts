import {env} from "cloudflare:workers";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {accountProfiles,authSessions} from "@/db/schema";
import {getChatGPTUser} from "@/app/chatgpt-auth";
import {revokeSessionPush} from "./push";
import {enrollTrial} from "./trial";
import {HttpError,throttle} from "./http";
import {providerFailure} from "./provider-diagnostics";
import {prototypeEmailAllowed,inviteOnlyRegistration,registrationAvailable} from "./platform";
import {providerOrigin,readSessionCookie,sessionCookie,randomToken,sha256,sealTokens,openTokens,SESSION_SECONDS,RECOVERY_SECONDS,safeReturnPath,allowsAccountAccess} from "./auth-policy";
export type AccountUser={userId:string;displayName:string;email:string;fullName:string|null;provider:"supabase"|"chatgpt";loginMethod:"email"|"google"|"internal"};
type AuthEnv={SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string;AUTH_SESSION_KEY?:string;TURNSTILE_SITE_KEY?:string;PEDIDO_GOOGLE_ENABLED?:string};
type ProviderUser={id:string;email?:string;email_confirmed_at?:string;user_metadata?:{name?:unknown;full_name?:unknown}};
export type ProviderSession={access_token:string;refresh_token:string;expires_in:number;user:ProviderUser};
type TokenVault={access:string;refresh:string;method?:"email"|"google"};
export function authConfig(){const e=env as typeof env&AuthEnv;const origin=providerOrigin(e.SUPABASE_URL||""),enabled=!!origin&&!!e.SUPABASE_PUBLISHABLE_KEY&&/^[a-f0-9]{64}$/.test(e.AUTH_SESSION_KEY||"");return {enabled,googleEnabled:enabled&&e.PEDIDO_GOOGLE_ENABLED==="true"&&!inviteOnlyRegistration(),origin,key:e.SUPABASE_PUBLISHABLE_KEY||"",seal:e.AUTH_SESSION_KEY||"",captchaSiteKey:inviteOnlyRegistration()?"":e.TURNSTILE_SITE_KEY||""};}
export async function directRegistrationReady(){
 if(!authConfig().enabled||!registrationAvailable())return false;
 try{const settings=await providerRequest<{external?:{email?:boolean};mailer_autoconfirm?:boolean;disable_signup?:boolean}>("settings","GET");return settings.external?.email===true&&settings.mailer_autoconfirm===true&&settings.disable_signup===false;}
 catch{return false;}
}
export async function providerRequest<T>(path:string,method="POST",body?:unknown,access?:string):Promise<T>{
  const config=authConfig();if(!config.enabled)throw new HttpError(503,"O acesso à plataforma está sendo configurado. Tente novamente mais tarde.");
  let response:Response;try{response=await fetch(config.origin+"/auth/v1/"+path,{method,headers:{apikey:config.key,...(body?{"Content-Type":"application/json"}:{}),...(access?{Authorization:"Bearer "+access}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000),redirect:"manual"});}catch(error){console.error("[pedido.on] auth provider connection",{origin:config.origin,operation:path.split("?")[0],...providerFailure(error,[config.key,access,body])});throw new HttpError(503,"O serviço de acesso está temporariamente indisponível.");}
  if(response.status>=500)console.error("[pedido.on] auth provider response",{origin:config.origin,operation:path.split("?")[0],status:response.status,requestId:response.headers.get("sb-request-id")});
  if(response.status>=300&&response.status<400){await response.body?.cancel().catch(()=>{});throw new HttpError(503,"O serviço de acesso está temporariamente indisponível.");}
  if(!response.ok){if(response.status===429)throw new HttpError(429,"Muitas tentativas. Aguarde alguns minutos.");if(response.status>=500)throw new HttpError(503,"O serviço de acesso está temporariamente indisponível.");throw new HttpError(401,"Não foi possível validar o acesso. Confira os dados ou solicite um novo link.");}
  if(response.status===204)return {} as T;return await response.json() as T;
}
export async function limitAuth(request:Request,action:string,email=""){
  const config=authConfig(),ip=request.headers.get("cf-connecting-ip")||"anonymous";
  await throttle("auth-ip:"+await sha256(config.seal+":"+ip),35,900);
  if(email)await throttle("auth-email:"+await sha256(config.seal+":"+action+":"+email),action==="login"?12:5,900);
}
function mapUser(user:ProviderUser):AccountUser{
  if(!user.id||!user.email||!user.email_confirmed_at)throw new HttpError(401,"Não foi possível validar sua conta. Entre novamente.");
  if(!prototypeEmailAllowed(user.email))throw new HttpError(401,"Esta conta não tem acesso à plataforma.");
  const name=([user.user_metadata?.name,user.user_metadata?.full_name,user.email].find(v=>typeof v==="string"&&v.trim()) as string).slice(0,100);
  return {userId:"supabase:"+user.id,email:user.email,displayName:name,fullName:name,provider:"supabase",loginMethod:"email"};
}
export async function createSession(tokens:ProviderSession,scope:"account"|"recovery",request:Request,method:"email"|"google"="email",options:{enroll?:boolean}={}){
  if(!tokens.access_token||!tokens.refresh_token)throw new HttpError(401,"Solicite um novo link para continuar.");
  const verified=await providerRequest<ProviderUser>("user","GET",undefined,tokens.access_token),user={...mapUser(verified),loginMethod:method};
  // Enrollment is granted only by the registration route after checking its invite.
  // A provider account created directly outside this app cannot bypass that check.
  if(inviteOnlyRegistration()&&!options.enroll){
    const profile=await getDb().select().from(accountProfiles).where(eq(accountProfiles.ownerId,user.userId)).get();
    const legacyOwner=profile?null:await env.DB!.prepare("SELECT id FROM restaurants WHERE owner_id=? LIMIT 1").bind(user.userId).first();
    if(!profile&&!legacyOwner)throw new HttpError(403,"Seu acesso ainda não está liberado. Crie sua conta com o convite do grupo.");
  }
  const token=randomToken(),id=await sha256(token),now=Math.floor(Date.now()/1000),seconds=scope==="recovery"?RECOVERY_SECONDS:SESSION_SECONDS;
  await env.DB!.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").bind(now).run();
  await getDb().insert(authSessions).values({id,ownerId:user.userId,email:user.email,displayName:user.displayName,scope,sealedTokens:await sealTokens({access:tokens.access_token,refresh:tokens.refresh_token,method},authConfig().seal,id+":"+user.userId),tokenExpiresAt:now+Math.min(tokens.expires_in||3600,86400),expiresAt:now+seconds,createdAt:new Date().toISOString()});
  if(scope==="account"){const stamp=new Date().toISOString();await getDb().insert(accountProfiles).values({ownerId:user.userId,name:user.displayName,email:user.email,provider:user.provider,createdAt:stamp,updatedAt:stamp}).onConflictDoNothing();}
  if(scope==="account"&&options.enroll)await enrollTrial(user.userId);
  return {user,cookie:sessionCookie(token,new URL(request.url).protocol==="https:",seconds)};
}
async function readLocalSession(){
  const config=authConfig();if(!config.enabled)return null;
  const h=await headers(),secure=(h.get("x-forwarded-proto")||"https")!=="http",cookie=h.get("cookie")||"",token=readSessionCookie(cookie,secure);
  if(!token)return null;const id=await sha256(token),db=getDb(),now=Math.floor(Date.now()/1000);let row=await db.select().from(authSessions).where(eq(authSessions.id,id)).get();
  if(!row)return null;if(row.expiresAt<=now){await db.delete(authSessions).where(eq(authSessions.id,id));return null;}
  let vault:TokenVault;try{vault=await openTokens<TokenVault>(row.sealedTokens,config.seal,id+":"+row.ownerId);}catch{await db.delete(authSessions).where(eq(authSessions.id,id));return null;}
  if(row.tokenExpiresAt<now+45){
    const lock=await env.DB!.prepare("UPDATE auth_sessions SET refresh_lock = ? WHERE id = ? AND refresh_lock < ? AND token_expires_at < ? RETURNING id").bind(now+20,id,now,now+45).first();
    if(lock){
      try{
        const fresh=await providerRequest<ProviderSession>("token?grant_type=refresh_token","POST",{refresh_token:vault.refresh}),u=mapUser(fresh.user);
        if(u.userId!==row.ownerId)throw new HttpError(401,"Sessão inválida.");vault={access:fresh.access_token,refresh:fresh.refresh_token,method:vault.method};
        await db.update(authSessions).set({sealedTokens:await sealTokens(vault,config.seal,id+":"+row.ownerId),tokenExpiresAt:now+(fresh.expires_in||3600),refreshLock:0}).where(eq(authSessions.id,id));
      }catch(e){await db.update(authSessions).set({refreshLock:0}).where(eq(authSessions.id,id));if(e instanceof HttpError&&e.status===401){await db.delete(authSessions).where(eq(authSessions.id,id));return null;}throw e;}
    }else{
      for(let attempt=0;attempt<8;attempt++){await new Promise(resolve=>setTimeout(resolve,100));const updated=await db.select().from(authSessions).where(eq(authSessions.id,id)).get();if(!updated)return null;if(updated.tokenExpiresAt>now+45){row=updated;vault=await openTokens<TokenVault>(row.sealedTokens,config.seal,id+":"+row.ownerId);break;}if(attempt===7)throw new HttpError(503,"Sua sessão está sendo renovada. Tente novamente.");}
    }
  }
  try{const verified=await providerRequest<ProviderUser>("user","GET",undefined,vault.access),user={...mapUser(verified),loginMethod:vault.method==="google"?"google" as const:"email" as const};if(user.userId!==row.ownerId)throw new HttpError(401,"Sessão inválida.");return {row,vault,user};}
  catch(e){if(e instanceof HttpError&&e.status===401){await db.delete(authSessions).where(eq(authSessions.id,id));return null;}throw e;}
}
export async function getAccountUser():Promise<AccountUser|null>{
  const local=await readLocalSession();if(local){if(!allowsAccountAccess(local.row.scope))return null;const profile=await getDb().select().from(accountProfiles).where(eq(accountProfiles.ownerId,local.user.userId)).get();return {...local.user,displayName:profile?.name||local.user.displayName};}
  const user=await getChatGPTUser();if(!user)return null;
  const profile=await getDb().select().from(accountProfiles).where(eq(accountProfiles.ownerId,user.userId)).get();
  return {...user,displayName:profile?.name||user.displayName,provider:"chatgpt",loginMethod:"internal"};
}
export async function requireAccountUser(returnTo="/app"){const user=await getAccountUser();if(user)return user;redirect("/entrar?next="+encodeURIComponent(safeReturnPath(returnTo)));}
export async function recoverySession(){const value=await readLocalSession();return value?.row.scope==="recovery"?value:null;}
export async function changePassword(password:string,currentPassword?:string){
  const session=await readLocalSession();if(!session)throw new HttpError(401,"Solicite um novo link ou entre novamente.");
  if(session.row.scope!=="recovery"){
    if(!currentPassword)throw new HttpError(400,"Informe a senha atual.");
    const reauth=await providerRequest<ProviderSession>("token?grant_type=password","POST",{email:session.user.email,password:currentPassword});
    if(reauth.user.id!==session.user.userId.slice(9))throw new HttpError(401,"Sessão inválida.");
    await providerRequest("user","PUT",{password},reauth.access_token);
  }else await providerRequest("user","PUT",{password},session.vault.access);
  // Password changes revoke every application session, including the recovery session.
  await getDb().delete(authSessions).where(eq(authSessions.ownerId,session.user.userId));
  if((env as typeof env&{PEDIDO_PUSH_ENABLED?:string}).PEDIDO_PUSH_ENABLED==="true")await env.DB!.prepare("DELETE FROM push_subscriptions WHERE owner_id=?").bind(session.user.userId).run();
  try{await providerRequest("logout?scope=global","POST",undefined,session.vault.access);}catch{/* application sessions are already revoked */}
}
export async function logout(request:Request){
  const pushToken=readSessionCookie(request.headers.get("cookie")||"",new URL(request.url).protocol==="https:");if(pushToken)await revokeSessionPush(await sha256(pushToken));
  const secure=new URL(request.url).protocol==="https:",token=readSessionCookie(request.headers.get("cookie")||"",secure);
  if(token&&authConfig().enabled){const id=await sha256(token),db=getDb(),row=await db.select().from(authSessions).where(eq(authSessions.id,id)).get();await db.delete(authSessions).where(eq(authSessions.id,id));if(row)try{const vault=await openTokens<TokenVault>(row.sealedTokens,authConfig().seal,id+":"+row.ownerId);await providerRequest("logout?scope=local","POST",undefined,vault.access);}catch{/* local deletion is authoritative for this application */}}
  return sessionCookie("",secure,0);
}
export {csrfCookieName,issueCsrf,assertCsrf} from "./csrf";
