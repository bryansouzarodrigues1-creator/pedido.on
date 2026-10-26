/** Return only local recovery routes. Never accept bearer tokens as recovery proof. */
export function recoveryLinkTarget(search:string,fragment=""){
 const query=new URLSearchParams(search),hash=new URLSearchParams(fragment.replace(/^#/,""));
 for(const params of [query,hash]){
  if(params.get("error_code")==="otp_expired")return "/redefinir-senha?error=expired";
  const token=params.get("token_hash");if(params.get("type")==="recovery"&&token&&/^[a-zA-Z0-9_-]{20,200}$/.test(token))return "/redefinir-senha?token_hash="+encodeURIComponent(token);
  if(params.get("type")==="recovery"&&(params.has("access_token")||params.has("refresh_token")))return "/redefinir-senha?error=legacy";
 }
 const code=query.get("code");return code&&/^[a-zA-Z0-9._~-]{8,2048}$/.test(code)?"/redefinir-senha?code="+encodeURIComponent(code):null;
}
