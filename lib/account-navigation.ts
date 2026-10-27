export type AccountNavigationState="checking"|"account"|"guest"|"unavailable";
/** A private read, never an instruction to log out or clear an existing cookie. */
export async function readAccountNavigation(signal?:AbortSignal,fetcher:typeof fetch=fetch):Promise<AccountNavigationState>{
 if(signal?.aborted)return "unavailable";
 try{
  const response=await fetcher("/api/auth/session",{cache:"no-store",credentials:"same-origin",signal:signal||AbortSignal.timeout(15000)});
  if(!response.ok)return "unavailable";
  const value:unknown=await response.json();if(!value||typeof value!=="object"||Array.isArray(value))return "unavailable";
  const user=(value as Record<string,unknown>).user;
  if(user===null)return "guest";
  if(user&&typeof user==="object"&&!Array.isArray(user)){const account=user as Record<string,unknown>;if(typeof account.name==="string"&&["supabase","chatgpt"].includes(String(account.provider)))return "account";}
 }catch{/* Uncertain connectivity must not look like a successful sign-out. */}
 return "unavailable";
}
export function accountNavigation(state:AccountNavigationState,guestLabel="Entrar",guestHref="/entrar"):{href:string;label:string;brandHref:"/"|"/app"}{
 if(state==="account")return {href:"/app",label:"Meu painel",brandHref:"/app"};
 if(state==="guest")return {href:guestHref,label:guestLabel,brandHref:"/"};
 return {href:"/app",label:"Acessar meu painel",brandHref:"/"};
}
