"use client";
import PageRecovery from "@/components/page-recovery";
export default function GlobalError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){return <html lang="pt-BR"><body><PageRecovery error={error} reset={reset}/></body></html>;}
