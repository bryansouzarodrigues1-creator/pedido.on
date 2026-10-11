import {env} from "cloudflare:workers";
import {z} from "zod";
import {inviteConfigured,matchesInvite} from "./invite-policy";
import type {AccountUser} from "./auth";
type PlatformEnv={PLATFORM_ADMIN_EMAIL?:string;PEDIDO_EMAIL_DELIVERY_READY?:string;PEDIDO_AUTH_MODE?:string;PEDIDO_AUTH_TEST_EMAILS?:string;PEDIDO_AUTH_INVITE_CODE?:string};
export function platformAdmin(user:AccountUser){const key=(env as typeof env&PlatformEnv).PLATFORM_ADMIN_EMAIL;return !!key&&user.provider==="chatgpt"&&user.email.toLowerCase()===key.toLowerCase();}
export function emailDeliveryReady(){return (env as typeof env&PlatformEnv).PEDIDO_EMAIL_DELIVERY_READY==="true";}
export function authTestMode(){return (env as typeof env&PlatformEnv).PEDIDO_AUTH_MODE==="prototype";}
export function inviteOnlyRegistration(){return (env as typeof env&PlatformEnv).PEDIDO_AUTH_MODE==="invite";}
export function registrationInviteConfigured(){return inviteConfigured((env as typeof env&PlatformEnv).PEDIDO_AUTH_INVITE_CODE);}
export async function validRegistrationInvite(code:string|undefined){return !inviteOnlyRegistration()||await matchesInvite(code,(env as typeof env&PlatformEnv).PEDIDO_AUTH_INVITE_CODE);}
function testEmails(){
  const values=((env as typeof env&PlatformEnv).PEDIDO_AUTH_TEST_EMAILS||"").split(/[,\n]/).map(value=>value.trim().toLowerCase()).filter(Boolean);
  // A missing or malformed allowlist must never turn a test into public access.
  if(!values.length||values.length>10||values.some(value=>!z.string().max(254).email().safeParse(value).success))return [];
  return values;
}
export function prototypeEmailAllowed(email:string){return !authTestMode()||testEmails().includes(email.trim().toLowerCase());}
export function registrationAvailable(){return authTestMode()?testEmails().length>0:inviteOnlyRegistration()?registrationInviteConfigured()&&emailDeliveryReady():true;}
export function emailFlowsAvailable(){return authTestMode()?testEmails().length>0:emailDeliveryReady();}
