import AuthForm from "@/components/auth-form";
export const dynamic="force-dynamic";
export const metadata={title:"Confirmar e-mail · pedido.on",referrer:"no-referrer" as const};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const q=await searchParams;return <AuthForm mode="confirm-email" tokenHash={typeof q.token_hash==="string"?q.token_hash.slice(0,200):""}/>;}

