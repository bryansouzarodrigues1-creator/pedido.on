"use client";
import {useEffect,useState} from "react";
import {Brand} from "./ui";
import {accountNavigation,readAccountNavigation,type AccountNavigationState} from "@/lib/account-navigation";
import {startForegroundPoll} from "@/lib/foreground-poll";

/** Public pages reuse the current server session and recheck after returning to the tab. */
export default function AccountNavigation({guestLabel="Entrar",guestHref="/entrar",linkClassName}:{guestLabel?:string;guestHref?:string;linkClassName?:string}){
 const [state,setState]=useState<AccountNavigationState>("checking");
 useEffect(()=>startForegroundPoll(async signal=>{const next=await readAccountNavigation(signal);if(!signal.aborted)setState(old=>next==="unavailable"&&old==="account"?old:next);},300000),[]);
 const navigation=accountNavigation(state,guestLabel,guestHref);
 return <><Brand href={navigation.brandHref}/><nav aria-label="Acesso" aria-busy={state==="checking"} data-account-state={state}><a className={linkClassName} href={navigation.href}>{navigation.label}</a></nav></>;
}
