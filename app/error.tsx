"use client";
import PageRecovery from "@/components/page-recovery";
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){return <PageRecovery error={error} reset={reset}/>;}
