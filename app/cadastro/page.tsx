import AuthForm from "@/components/auth-form";
import {safeReturnPath} from "@/lib/auth-policy";
export const dynamic="force-dynamic";
export const metadata={title:"Criar conta · pizzaria.on"};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const q=await searchParams;return <AuthForm mode="register" next={safeReturnPath(q.next,"/app?new=1")}/>;}

