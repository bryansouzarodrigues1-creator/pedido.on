import {z} from "zod";
import {getChatGPTUser} from "@/app/chatgpt-auth";
import {authTestMode,emailFlowsAvailable,prototypeEmailAllowed,registrationAvailable,inviteOnlyRegistration,validRegistrationInvite,supportContactWhatsApp} from "@/lib/platform";
import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {accountProfiles} from "@/db/schema";
import {getAccountUser,authConfig,directRegistrationReady,providerRequest,createSession,limitAuth,changePassword,logout,issueCsrf,assertCsrf,type ProviderSession} from "@/lib/auth";
import {normalizeEmail,validPassword,sessionCookie,safeReturnPath,verificationPurpose} from "@/lib/auth-policy";
import {sameOrigin,readJson,errorResponse,HttpError,privateHeaders} from "@/lib/http";
import {startGoogleLogin} from "@/lib/google-oauth";
import {startPasswordRecovery,finishPasswordRecovery} from "@/lib/password-recovery";
import {env} from "cloudflare:workers";
import {maintenanceBlocksAuthentication,runPlatformMaintenance,type MaintenanceEnv} from "@/lib/platform-maintenance";
import {validAdminEnrollment,type AdminEnrollmentEnv} from "@/lib/admin-enrollment-policy";
import {MIN_PASSWORD_LENGTH,ADMIN_PASSWORD_MIN_LENGTH} from "@/lib/password-policy";
import {notifyAdministrator} from "@/lib/account-notices";
export const dynamic="force-dynamic";
const email=z.string().trim().max(254).email("Confira seu e-mail.").transform(normalizeEmail);
const password=z.string().refine(validPassword,`Use uma senha com ${MIN_PASSWORD_LENGTH} a 128 caracteres.`);
const captcha=z.string().max(4000).optional();
type Context={params:Promise<{action:string}>};
export async function GET(request:Request,{params}:Context){try{
  const {action}=await params;
  if(action==="config")await runPlatformMaintenance(env as typeof env&MaintenanceEnv);
  if(action==="config"){const csrf=issueCsrf(request),config=authConfig(),checkRegistration=new URL(request.url).searchParams.get("registration")==="1",registrationEnabled=config.enabled&&registrationAvailable()&&(!checkRegistration||await directRegistrationReady());return Response.json({enabled:config.enabled,registrationEnabled,...(checkRegistration?{directSignup:registrationEnabled}:{}),recoveryEnabled:config.enabled&&emailFlowsAvailable(),prototype:authTestMode(),inviteRequired:inviteOnlyRegistration(),googleEnabled:config.googleEnabled,supportWhatsApp:supportContactWhatsApp()?.number||null,csrf:csrf.token,captchaSiteKey:config.captchaSiteKey},{headers:{...privateHeaders,"Set-Cookie":csrf.cookie}});}
  if(action!=="session")throw new HttpError(404,"Página não encontrada.");
  const user=await getAccountUser();return Response.json({user:user?{name:user.displayName,email:user.email,provider:user.provider,loginMethod:user.loginMethod}:null},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:Context){try{
  sameOrigin(request);assertCsrf(request);const {action}=await params;
  if(action!=="logout"&&await maintenanceBlocksAuthentication(env as typeof env&MaintenanceEnv))throw new HttpError(503,"Estamos preparando a plataforma. Tente novamente em instantes.");
  if(action==="logout"){const user=await getChatGPTUser(),cookie=await logout(request);return Response.json({ok:true,chatgpt:!!user},{headers:{...privateHeaders,"Set-Cookie":cookie}});}
  const input=await readJson(request);
  if(action==="google"){const data=z.object({next:z.string().max(300).optional()}).parse(input),flow=await startGoogleLogin(request,data.next);return Response.json({url:flow.url},{headers:{...privateHeaders,"Set-Cookie":flow.cookie}});}
  if(action==="profile"){const user=await getAccountUser();if(!user)throw new HttpError(401,"Entre para continuar.");const data=z.object({name:z.string().trim().min(2).max(100)}).parse(input),stamp=new Date().toISOString();await getDb().insert(accountProfiles).values({ownerId:user.userId,name:data.name,email:user.email,provider:user.provider,createdAt:stamp,updatedAt:stamp}).onConflictDoUpdate({target:accountProfiles.ownerId,set:{name:data.name,updatedAt:stamp}});return Response.json({ok:true},{headers:privateHeaders});}
  if(action==="password"){const data=z.object({password,currentPassword:z.string().max(128).optional()}).parse(input);await limitAuth(request,action);await changePassword(data.password,data.currentPassword);return Response.json({ok:true},{headers:{...privateHeaders,"Set-Cookie":sessionCookie("",new URL(request.url).protocol==="https:",0)}});}
  if(action==="confirm-recovery-code"){
    const data=z.object({code:z.string().min(8).max(2048).regex(/^[a-zA-Z0-9._~-]+$/)}).parse(input);await limitAuth(request,action);
    const result=await finishPasswordRecovery(request,data.code),headers=new Headers(privateHeaders);
    headers.append("Set-Cookie",result.sessionCookie);headers.append("Set-Cookie",result.flowCookie);
    return Response.json({ok:true,next:"/redefinir-senha"},{headers});
  }
  if(action==="confirm-email"||action==="confirm-recovery"){
    const data=z.object({tokenHash:z.string().min(32).max(200).regex(/^[a-zA-Z0-9_-]+$/)}).parse(input);await limitAuth(request,action);
    const purpose=verificationPurpose(action)!,tokens=await providerRequest<ProviderSession>("verify","POST",{token_hash:data.tokenHash,type:purpose});
    const session=await createSession(tokens,purpose==="recovery"?"recovery":"account",request);
    return Response.json({ok:true,next:purpose==="recovery"?"/redefinir-senha":"/app"},{headers:{...privateHeaders,"Set-Cookie":session.cookie}});
  }
  if(action==="resend")throw new HttpError(410,"O cadastro dá acesso direto. Entre com seu e-mail e senha.");
  if(!["login","register","recover"].includes(action))throw new HttpError(404,"Ação não encontrada.");
  if(!authConfig().enabled)throw new HttpError(503,"O acesso à plataforma está sendo configurado. Tente novamente mais tarde.");
  if(action==="register"&&!registrationAvailable())throw new HttpError(503,"O cadastro está sendo configurado. Tente novamente mais tarde.");
  if(action==="recover"&&!emailFlowsAvailable())throw new HttpError(503,"O envio de e-mails está sendo configurado. Tente novamente mais tarde.");
  const data=z.object({email,password:z.string().max(128).optional(),name:z.string().trim().min(2).max(100).optional(),captchaToken:captcha,inviteCode:z.string().max(128).optional(),adminInvite:z.string().max(128).optional(),next:z.string().max(300).optional()}).parse(input);await limitAuth(request,action,data.email);
  if(!prototypeEmailAllowed(data.email))throw new HttpError(403,"Esta conta não tem acesso à plataforma.");
  if(authConfig().captchaSiteKey&&!data.captchaToken)throw new HttpError(400,"Confirme a verificação de segurança.");
  const security=data.captchaToken?{gotrue_meta_security:{captcha_token:data.captchaToken}}:{};
  if(action==="login"){
    if(!data.password)throw new HttpError(400,"Informe sua senha.");
    let tokens:ProviderSession;try{tokens=await providerRequest<ProviderSession>("token?grant_type=password","POST",{email:data.email,password:data.password,...security});}catch(e){if(e instanceof HttpError&&e.status===401)throw new HttpError(401,"E-mail ou senha incorretos.");throw e;}
    const session=await createSession(tokens,"account",request);return Response.json({ok:true,next:safeReturnPath(data.next)},{headers:{...privateHeaders,"Set-Cookie":session.cookie}});
  }
  if(action==="register"){
    if(data.adminInvite&&!await validAdminEnrollment(data.email,data.adminInvite,env as typeof env&AdminEnrollmentEnv))throw new HttpError(403,"O convite de administrador é inválido ou expirou. Use o e-mail autorizado.");
    if(!await validRegistrationInvite(data.inviteCode))throw new HttpError(403,"Código de convite inválido. Confira o código enviado ao grupo.");
    const minimum=data.adminInvite?ADMIN_PASSWORD_MIN_LENGTH:MIN_PASSWORD_LENGTH;
    if(!data.password||!validPassword(data.password,minimum)||!data.name)throw new HttpError(400,`Informe seu nome e uma senha com pelo menos ${minimum} caracteres.`);
    // Invited owners enter directly; registration must never send confirmation mail.
    const settings=await providerRequest<{external?:{email?:boolean};mailer_autoconfirm?:boolean;disable_signup?:boolean}>("settings","GET");
    if(settings.external?.email!==true||settings.disable_signup!==false||typeof settings.mailer_autoconfirm!=="boolean"
      ||inviteOnlyRegistration()&&settings.mailer_autoconfirm!==true)
      throw new HttpError(503,"O cadastro direto está temporariamente indisponível. Tente novamente em instantes.");
    if(settings.mailer_autoconfirm===false)throw new HttpError(503,"O cadastro direto ainda está sendo configurado.");
    let tokens:Partial<ProviderSession>;
    try{tokens=await providerRequest<Partial<ProviderSession>>("signup","POST",{email:data.email,password:data.password,data:{name:data.name,...(data.adminInvite?{pizzaria_admin_invite:data.adminInvite}:{})},...security});}
    catch(error){if(error instanceof HttpError&&error.status===401)throw new HttpError(400,"Não foi possível criar a conta. Se já tem cadastro, entre ou use Esqueci minha senha.");throw error;}

    if(!tokens.access_token||!tokens.refresh_token||!tokens.user)
      throw new HttpError(503,"Não foi possível concluir seu cadastro. Tente entrar ou recuperar a senha.");
    const session=await createSession(tokens as ProviderSession,"account",request,"email",{enroll:true});
    await notifyAdministrator({event:"account:"+session.user.userId,title:"Nova conta cadastrada",body:"Um novo cadastro está disponível para atendimento.",path:"/admin/clientes"});
    return Response.json({ok:true,next:safeReturnPath(data.next)},{headers:{...privateHeaders,"Set-Cookie":session.cookie}});
  }
  const cookie=await startPasswordRecovery(request,data.email,security);
  return Response.json({ok:true,message:"Se houver uma conta com esse e-mail, você receberá um link para redefinir sua senha. Abra o e-mail neste mesmo navegador."},{headers:{...privateHeaders,"Set-Cookie":cookie}});
}catch(e){return errorResponse(e);}}

