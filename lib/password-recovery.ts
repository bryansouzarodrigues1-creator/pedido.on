import {authConfig,createSession,providerRequest,type ProviderSession} from "./auth";
import {HttpError} from "./http";
import {randomToken,sealTokens,openTokens,pkceChallenge,RECOVERY_SECONDS} from "./auth-policy";

type RecoveryFlow={purpose:"password-recovery";verifier:string;createdAt:number};
function cookieName(secure:boolean){return secure?"__Host-pedido-recovery":"pedido-recovery";}
function flowCookie(value:string,secure:boolean,seconds=RECOVERY_SECONDS){return cookieName(secure)+"="+value+"; Path=/; HttpOnly; SameSite=Lax; Max-Age="+seconds+(secure?"; Secure":"");}

export async function startPasswordRecovery(request:Request,email:string,security:Record<string,unknown>){
  const url=new URL(request.url),secure=url.protocol==="https:",config=authConfig();
  const flow:RecoveryFlow={purpose:"password-recovery",verifier:randomToken(),createdAt:Math.floor(Date.now()/1000)};
  const sealed=await sealTokens(flow,config.seal,"pedido-recovery:"+url.origin);
  // The standard Supabase email redirects with a single-use code. Only the
  // browser that requested recovery holds its encrypted PKCE verifier.
  try{await providerRequest("recover?redirect_to="+encodeURIComponent(url.origin+"/redefinir-senha"),"POST",{email,code_challenge:await pkceChallenge(flow.verifier),code_challenge_method:"s256",...security});}
  catch(error){if(!(error instanceof HttpError)||error.status!==401)throw error;}
  return flowCookie(sealed,secure);
}

export async function finishPasswordRecovery(request:Request,code:string){
  const url=new URL(request.url),secure=url.protocol==="https:",now=Math.floor(Date.now()/1000);
  const name=cookieName(secure)+"=",sealed=request.headers.get("cookie")?.split(";").map(value=>value.trim()).find(value=>value.startsWith(name))?.slice(name.length)||"";
  const invalid=()=>new HttpError(401,"Solicite um novo link e abra o e-mail neste mesmo navegador.");
  if(!/^[a-f0-9]{56,4096}$/.test(sealed)||sealed.length%2)throw invalid();
  let flow:RecoveryFlow;
  try{flow=await openTokens<RecoveryFlow>(sealed,authConfig().seal,"pedido-recovery:"+url.origin);}catch{throw invalid();}
  if(flow?.purpose!=="password-recovery"||typeof flow.verifier!=="string"||!/^[a-f0-9]{64}$/.test(flow.verifier)||!Number.isInteger(flow.createdAt)||flow.createdAt>now||flow.createdAt<=now-RECOVERY_SECONDS)throw invalid();
  const tokens=await providerRequest<ProviderSession>("token?grant_type=pkce","POST",{auth_code:code,code_verifier:flow.verifier});
  const session=await createSession(tokens,"recovery",request);
  return {sessionCookie:session.cookie,flowCookie:flowCookie("",secure,0)};
}
