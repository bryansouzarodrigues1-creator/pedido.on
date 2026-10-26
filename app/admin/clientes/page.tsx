import {requireAccountUser} from "@/lib/auth";
import {platformAdmin} from "@/lib/platform";
import {notFound} from "next/navigation";
import {adminAccounts} from "@/lib/admin-accounts";
import AdminNav from "@/components/admin-nav";
import AdminAccountsPanel from "@/components/admin-accounts";
import {Brand} from "@/components/ui";
export const dynamic="force-dynamic";
export const metadata={title:"Clientes e pizzarias · pizzaria.on",robots:{index:false,follow:false}};
export default async function AccountsPage(){const user=await requireAccountUser("/admin/clientes");if(!platformAdmin(user))notFound();return <div className="account-page"><header className="account-nav container"><Brand/><a href="/admin" className="btn outline small">Administração</a></header><main className="admin-workspace"><AdminNav active="/admin/clientes"/><div className="admin-heading"><div><span className="eyebrow">CADASTROS E CONTATOS</span><h1>Clientes e pizzarias.</h1><p>Encontre contas, confira o contato cadastrado e gerencie o acesso.</p></div></div><AdminAccountsPanel initial={await adminAccounts()}/></main></div>;}
