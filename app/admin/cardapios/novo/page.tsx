import {notFound} from "next/navigation";
import {requireAccountUser} from "@/lib/auth";
import {platformAdmin} from "@/lib/platform";
import {Brand} from "@/components/ui";
import AdminNav from "@/components/admin-nav";
import IdeaStart from "@/components/idea-start";
export const dynamic="force-dynamic";
export const metadata={title:"Criar cardápio compartilhado · Pizzaria.on",robots:{index:false,follow:false}};
export default async function NewSharedMenu(){const user=await requireAccountUser('/admin/cardapios/novo');if(!platformAdmin(user))notFound();return <div className="pizza-home admin-creator"><header className="pizza-home-header saas-container"><Brand href="/app"/><a href="/admin/cardapios">Voltar aos links</a></header><div className="admin-creator-intro saas-container"><AdminNav active="/admin/cardapios/novo"/><h1>Crie o cardápio e envie a apresentação.</h1><p>Informe os dados da pizzaria, importe os produtos e escolha o modelo. Confira tudo antes de criar o link. Seu rascunho pessoal permanece guardado.</p></div><IdeaStart adminMode/></div>;}
