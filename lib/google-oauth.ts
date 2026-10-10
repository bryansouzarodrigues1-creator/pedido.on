import {authConfig,createSession,providerRequest,limitAuth,type ProviderSession} from "./auth";
import {HttpError,privateHeaders} from "./http";
import {randomToken,sealTokens,openTokens,pkceChallenge,googleAuthorizationUrl,oauthCookie,readOauthCookie,validGoogleFlow,safeReturnPath,type GoogleFlow} from "./auth-policy";

export async function startGoogleLogin(request:Request,next:unknown){
  const config=authConfig();
  if(!config.googleEnabled)throw new HttpError(503,"O acesso com Google está sendo configurado. Tente novamente mais tarde.");
  await limitAuth(request,"google");
  const origin=new URL(request.url).origin,secure=new URL(request.url).protocol==="https:";
  if(!secure)throw new HttpError(503,"O acesso com Google exige uma conexão segura.");
  const returnTo=safeReturnPath(next),flow:GoogleFlow={provider:"google",nonce:randomToken(),verifier:randomToken(),next:returnTo.length<=300?returnTo:"/app",createdAt:Math.floor(Date.now()/1000)};
  const sealed=await sealTokens(flow,config.seal,"pedido-oauth:google:"+origin);
  return {url:googleAuthorizationUrl(config.origin,origin,flow.nonce,await pkceChallenge(flow.verifier)),cookie:oauthCookie(sealed,secure)};
}

export async function finishGoogleLogin(request:Request,nonce:string){
  const config=authConfig(),url=new URL(request.url),secure=url.protocol==="https:";
  let ownedFlow=false;
  function failure(reason:"cancelled"|"expired"|"unavailable"|"failed"){
    const headers=new Headers(privateHeaders);headers.set("Location",url.origin+"/entrar?oauth="+reason);
    if(ownedFlow)headers.append("Set-Cookie",oauthCookie("",secure,0));
    return new Response(null,{status:303,headers});
  }
  if(!config.googleEnabled||!secure)return failure("unavailable");
  const sealed=readOauthCookie(request.headers.get("cookie")||"",secure);if(!sealed)return failure("expired");
  let value:unknown;
  try{value=await openTokens<unknown>(sealed,config.seal,"pedido-oauth:google:"+url.origin);}catch{return failure("expired");}
  if(!validGoogleFlow(value,nonce))return failure("expired");
  ownedFlow=true;
  if(url.searchParams.has("error"))return failure("cancelled");
  const codes=url.searchParams.getAll("code"),code=codes[0];
  if(codes.length!==1||!code||!/^[a-zA-Z0-9._~-]{8,2048}$/.test(code))return failure("failed");
  try{
    await limitAuth(request,"google-callback");
    const tokens=await providerRequest<ProviderSession>("token?grant_type=pkce","POST",{auth_code:code,code_verifier:value.verifier});
    const session=await createSession(tokens,"account",request,"google");
    const headers=new Headers(privateHeaders);headers.set("Location",url.origin+safeReturnPath(value.next));
    headers.append("Set-Cookie",session.cookie);headers.append("Set-Cookie",oauthCookie("",secure,0));
    return new Response(null,{status:303,headers});
  }catch{return failure("failed");}
}
