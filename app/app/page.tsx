import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {restaurants} from "@/db/schema";
import {requireAccountUser} from "@/lib/auth";
import {platformAdmin} from "@/lib/platform";
import Dashboard from "@/components/dashboard";
import {safeRecord} from "@/lib/server";
import {themes,type ThemeId} from "@/lib/domain";
export const dynamic="force-dynamic";
export default async function AppPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query=await searchParams;
  const theme=typeof query.theme==="string"&&themes.some(t=>t.id===query.theme)?query.theme as ThemeId:"editorial";
  const plan=typeof query.plan==="string"&&["essencial","profissional","rede"].includes(query.plan)?query.plan:"essencial";
  const startNew=query.new==="1",qs=new URLSearchParams({...(startNew?{new:"1"}:{}),theme,plan});
  const user=await requireAccountUser(`/app?${qs}`);
  const rows=await getDb().select().from(restaurants).where(eq(restaurants.ownerId,user.userId));
  return <Dashboard initialRestaurants={rows.map(safeRecord)} user={{name:user.displayName,email:user.email,admin:platformAdmin(user)}} signOutUrl="/sair" initialTheme={theme} initialPlan={plan} startNew={startNew} initialRestaurantId={typeof query.loja==="string"?query.loja:undefined} initialOrderId={typeof query.pedido==="string"?query.pedido:undefined}/>;
}
