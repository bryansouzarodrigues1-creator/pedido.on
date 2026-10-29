// A failed lazy-loaded file after a release needs a fresh document, not a retry
// of an order, payment or model request. The guard is tab-local and fails closed.
export const chunkRecoveryKey="pedido:chunk-recovery-v1";
export const chunkRecoveryCooldown=120000;
type RecoveryLocation={pathname:string;search:string;hash:string};
type RecoveryStorage=Pick<Storage,"getItem"|"setItem">;
export function isChunkLoadError(error:unknown){
 if(!error||typeof error!=="object")return false;
 const e=error as {name?:unknown;message?:unknown};
 return e.name==="ChunkLoadError"||typeof e.message==="string"&&/(?:failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading (?:css )?chunk [\w-]+ failed|unable to preload css for)/i.test(e.message);
}
export function safeChunkRecoveryLocation(location:RecoveryLocation){
 if(!location.pathname.startsWith("/")||location.pathname.startsWith("//")||/^\/(?:api|auth|signin-with-chatgpt|redefinir-senha|confirmar-email|sair)(?:\/|$)/i.test(location.pathname))return false;
 const sensitive=/^(?:code|token|token_hash|access_token|refresh_token|id_token|session|session_id|state)$/i;
 for(const raw of [location.search,location.hash])for(const key of new URLSearchParams(raw.replace(/^[?#]/,"")).keys())if(sensitive.test(key))return false;
 return true;
}
export function takeChunkRecovery(error:unknown,location:RecoveryLocation,online:boolean,storage:RecoveryStorage,now=Date.now()){
 if(!online||!isChunkLoadError(error)||!safeChunkRecoveryLocation(location)||!Number.isFinite(now)||now<=0)return false;
 try{
  const previous=storage.getItem(chunkRecoveryKey);
  if(previous!==null){const stamp=Number(previous);if(!Number.isFinite(stamp)||stamp<=0||now-stamp<chunkRecoveryCooldown)return false;}
  storage.setItem(chunkRecoveryKey,String(now));
  return true;
 }catch{return false;}
}
