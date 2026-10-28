import {ArrowLeft,ArrowRight} from "lucide-react";
import {Brand} from "@/components/ui";
import {BillingControls} from "@/components/billing-controls";
import {requireAccountUser} from "@/lib/auth";
import {isPublicPlan} from "@/lib/plan-catalog";
import "./assinatura.css";

export const metadata={title:"Assinatura · pizzaria.on",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";

export default async function Subscription({searchParams}:{searchParams:Promise<{plan?:string|string[]}>}){
 const query=await searchParams;
 const plan=isPublicPlan(query.plan)?query.plan:"essencial";
 await requireAccountUser("/assinatura?plan="+plan);
 return <div className="subscription-page">
  <header className="subscription-nav"><Brand href="/app"/><a className="btn outline small" href="/app"><ArrowLeft size={16}/>Meu painel</a></header>
  <main className="subscription-wrap">
   <div className="subscription-heading"><span className="eyebrow">PIZZARIA.ON</span><h1>Sua assinatura.</h1><p>Essencial por R$ 49 ou Pro por R$ 89 ao mês. Escolha e acompanhe suas faturas aqui.</p></div>
   <section className="subscription-card" aria-label="Plano e pagamento"><BillingControls initialPlan={plan}/></section>
   <a href="/conta" className="text-button subscription-account">Dados da conta <ArrowRight size={16}/></a>
  </main>
 </div>;
}
