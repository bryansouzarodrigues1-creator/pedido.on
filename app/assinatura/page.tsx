import {ArrowLeft,ArrowRight} from "lucide-react";
import {Brand} from "@/components/ui";
import {BillingControls} from "@/components/billing-controls";
import {requireAccountUser} from "@/lib/auth";
import {planIds,type CatalogPlan} from "@/lib/plan-catalog";
import "./assinatura.css";

export const metadata={title:"Assinatura · pizzaria.on",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";

export default async function Subscription({searchParams}:{searchParams:Promise<{plan?:string|string[]}>}){
 const query=await searchParams;
 const plan=typeof query.plan==="string"&&planIds.includes(query.plan as CatalogPlan)?query.plan as CatalogPlan:"essencial";
 await requireAccountUser("/assinatura?plan="+plan);
 return <div className="subscription-page">
  <header className="subscription-nav"><Brand/><a className="btn outline small" href="/app"><ArrowLeft size={16}/>Meu painel</a></header>
  <main className="subscription-wrap">
   <div className="subscription-heading"><span className="eyebrow">PIZZARIA.ON</span><h1>Sua assinatura.</h1><p>Escolha seu plano e acompanhe as faturas em um só lugar.</p></div>
   <section className="subscription-card" aria-label="Plano e pagamento"><BillingControls initialPlan={plan}/></section>
   <a href="/conta" className="text-button subscription-account">Dados da conta <ArrowRight size={16}/></a>
  </main>
 </div>;
}
