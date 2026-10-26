"use client";
import PageRecovery from "@/components/page-recovery";
export default function GlobalError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <html lang="pt-BR"><body><PageRecovery reset={reset}/></body></html>;}
