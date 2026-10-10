import Landing from "@/components/landing";
import {redirect} from "next/navigation";
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const q=await searchParams;if(typeof q.code==="string"&&/^[a-zA-Z0-9._~-]{8,2048}$/.test(q.code))redirect("/redefinir-senha?code="+encodeURIComponent(q.code));if(q.error_code==="otp_expired")redirect("/redefinir-senha?error=expired");return <Landing/>;}
