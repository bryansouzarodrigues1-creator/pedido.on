import {ArrowLeft,ArrowRight} from "lucide-react";
import {Brand} from "@/components/ui";
import {BillingControls} from "@/components/billing-controls";
import {requireAccountUser} from "@/lib/auth";
import "./assinatura.css";

export const metadata={title:"Assinatura · pizzaria.on",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";

export default async function Subscription({searchParams}:{searchParams:Promise<{plan?:string|string[]}>}){
 await searchParams;
 const plan="essencial"; // URLs referencing retired tiers never offer a new purchase.
 await requireAccountUser("/assinatura?plan="+plan);
 return <div className="subscription-page">
  <header className="subscription-nav"><Brand/><a className="btn outline small" href="/app"><ArrowLeft size={16}/>Meu painel</a></header>
  <main className="subscription-wrap">
   <div className="subscription-heading"><span className="eyebrow">PIZZARIA.ON</span><h1>Sua assinatura.</h1><p>Um plano de R$ 49 por mês. Acompanhe suas faturas aqui.</p></div>
   <section className="subscription-card" aria-label="Plano e pagamento"><BillingControls initialPlan={plan}/></section>
   <a href="/conta" className="text-button subscription-account">Dados da conta <ArrowRight size={16}/></a>
  </main>
 </div>;
}
