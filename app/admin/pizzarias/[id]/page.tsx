import {requireAccountUser} from "@/lib/auth";
import {platformAdmin} from "@/lib/platform";
import {notFound} from "next/navigation";
import {adminRestaurantWorkspace} from "@/lib/restaurant-support";
import AdminRestaurantClient from "@/components/admin-restaurant-workspace";
import AdminNav from "@/components/admin-nav";
import {Brand} from "@/components/ui";
export const dynamic="force-dynamic";
export const metadata={title:"Atendimento da pizzaria · pizzaria.on",robots:{index:false,follow:false}};
export default async function AdminRestaurantPage({params}:{params:Promise<{id:string}>}){const {id}=await params,user=await requireAccountUser("/admin/pizzarias/"+encodeURIComponent(id));if(!platformAdmin(user))notFound();const data=await adminRestaurantWorkspace(id);return <div className="account-page"><header className="account-nav container"><Brand href="/app"/><a href="/admin" className="btn outline small">Administração</a></header><div className="admin-workspace"><AdminNav active="/admin/clientes"/></div><AdminRestaurantClient initial={data}/></div>;}
