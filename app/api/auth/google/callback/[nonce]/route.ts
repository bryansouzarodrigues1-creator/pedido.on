import {finishGoogleLogin} from "@/lib/google-oauth";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{nonce:string}>}){const {nonce}=await params;return finishGoogleLogin(request,nonce);}
