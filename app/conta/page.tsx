import AccountSettings from "@/components/account-settings";
import {requireAccountUser} from "@/lib/auth";
import {platformAdmin} from "@/lib/platform";
export const metadata={title:"Minha conta · pedido.on",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function Account(){const user=await requireAccountUser("/conta");return <AccountSettings account={{name:user.displayName,email:user.email,provider:user.provider,loginMethod:user.loginMethod,admin:platformAdmin(user)}}/>;}
