import AuthForm from "@/components/auth-form";
import {safeReturnPath,oauthErrorMessage} from "@/lib/auth-policy";
export const dynamic="force-dynamic";
export const metadata={title:"Entrar · pizzaria.on"};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const q=await searchParams;return <AuthForm mode="login" next={safeReturnPath(q.next)} oauthError={oauthErrorMessage(q.oauth)}/>;}

