import {normalizeEmail} from "./auth-policy.ts";
export type AdminEnrollmentEnv={PLATFORM_ADMIN_EMAIL?:string;PLATFORM_ADMIN_AUTHORITY?:string;PLATFORM_ADMIN_INVITE_HASH?:string;PLATFORM_ADMIN_INVITE_EXPIRES?:string};
export function providerAdminAuthority(metadata:unknown):string|undefined{
 if(!metadata||typeof metadata!=="object")return;
 const value=(metadata as Record<string,unknown>).pizzaria_admin_authority;
 return typeof value==="string"&&/^[a-f0-9]{64}$/.test(value)?value:undefined;
}
export async function validAdminEnrollment(email:string,invite:string,e:AdminEnrollmentEnv,now=Math.floor(Date.now()/1000)){
 const expected=e.PLATFORM_ADMIN_INVITE_HASH||"";
 if(!/^[a-f0-9]{64}$/.test(invite)||!/^[a-f0-9]{64}$/.test(expected)||!/^[a-f0-9]{64}$/.test(e.PLATFORM_ADMIN_AUTHORITY||""))return false;
 const expires=Number(e.PLATFORM_ADMIN_INVITE_EXPIRES);
 if(!Number.isSafeInteger(expires)||expires<=now||expires>now+7*86400||!e.PLATFORM_ADMIN_EMAIL||normalizeEmail(email)!==normalizeEmail(e.PLATFORM_ADMIN_EMAIL))return false;
 const digest=[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(invite)))].map(x=>x.toString(16).padStart(2,"0")).join("");
 let different=0;for(let i=0;i<64;i++)different|=digest.charCodeAt(i)^expected.charCodeAt(i);
 return different===0;
}
