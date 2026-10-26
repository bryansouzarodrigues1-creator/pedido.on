import Landing from "@/components/saas-landing";
import {redirect} from "next/navigation";
import {recoveryLinkTarget} from "@/lib/recovery-link";
import RecoveryLanding from "@/components/recovery-landing";
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const q=await searchParams,search=new URLSearchParams(Object.entries(q).filter((entry):entry is [string,string]=>typeof entry[1]==="string")),target=recoveryLinkTarget(search.toString());if(target)redirect(target);return <><RecoveryLanding/><Landing/></>;}
