import AuthForm from "@/components/auth-form";
import {recoverySession} from "@/lib/auth";
export const dynamic="force-dynamic";
export const metadata={title:"Nova senha · pedido.on",referrer:"no-referrer" as const};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const q=await searchParams;const session=await recoverySession();return <AuthForm mode="reset" tokenHash={typeof q.token_hash==="string"?q.token_hash.slice(0,200):""} recoveryCode={typeof q.code==="string"&&/^[a-zA-Z0-9._~-]{8,2048}$/.test(q.code)?q.code:""} recoveryReady={!!session} oauthError={q.error?"Este link de recuperação expirou. Solicite um novo.":""}/>;}

