import {notFound} from "next/navigation";
import {requireAccountUser} from "@/lib/auth";
import {platformAdmin} from "@/lib/platform";
import MenuImportAdmin from "@/components/menu-import-admin";
export const dynamic="force-dynamic";
export const metadata={title:"Importações assistidas · Pizzaria.on",robots:{index:false,follow:false}};
export default async function AssistancePage(){
 const user=await requireAccountUser("/admin/importacoes");
 if(!platformAdmin(user))notFound();
 return <main className="container" style={{paddingTop:30,paddingBottom:70}}>
  <p><a href="/admin">← Voltar à administração</a></p><h1>Importações assistidas</h1>
  <MenuImportAdmin/>
 </main>;
}
