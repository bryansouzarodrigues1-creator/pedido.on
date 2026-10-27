import {notFound} from "next/navigation";
import {requireAccountUser} from "@/lib/auth";
import {platformAdmin} from "@/lib/platform";
import {Brand} from "@/components/ui";
import AdminNav from "@/components/admin-nav";
import AdminSharedMenus from "@/components/admin-shared-menus";
export const dynamic="force-dynamic";
export const metadata={title:"Cardápios compartilhados · Pizzaria.on",robots:{index:false,follow:false}};
export default async function SharedMenusPage(){const user=await requireAccountUser('/admin/cardapios');if(!platformAdmin(user))notFound();return <div className="account-page"><header className="account-nav container"><Brand href="/app"/><a className="btn outline small" href="/app">Meu painel</a></header><main className="admin-workspace"><AdminNav active="/admin/cardapios"/><h1>Cardápios para enviar ao cliente</h1><p>Prepare uma apresentação com os produtos, fotos e preços que você conferiu. A pessoa abre o link e pode criar o próprio cardápio.</p><AdminSharedMenus/></main></div>;}
