import {TRIAL_DAYS} from "@/lib/trial-policy";
import {Check,ArrowRight} from "lucide-react";
import {publicPlanCatalog,publicPlanName} from "@/lib/plan-catalog";
export default function PlanCards(){
 const plan=publicPlanCatalog.essencial;
 return <section className="saas-container pizza-plans" id="planos">
  <div className="pizza-section-heading">
   <span className="pizza-eyebrow">PREÇO SIMPLES</span>
   <h2>Um plano. Sua pizzaria pronta.</h2>
   <p>Crie seu cardápio e receba pedidos com {TRIAL_DAYS} dias grátis a partir da sua primeira pizzaria, sem cartão de crédito e sem cobrança automática.</p>
  </div>
  <div className="plans-grid plans-grid-single">
   <article className="plan-card popular">
    <h3>{publicPlanName}</h3><p>{plan.description}</p>
    <div className="plan-price"><span>R$</span><b>{plan.amount/100}</b><span>/mês</span></div>
    <ul>{plan.features.map(feature=><li key={feature}><Check size={15}/>{feature}</li>)}</ul>
    <a className="btn primary" href={`/cadastro?next=${encodeURIComponent("/app?new=1&plan=essencial")}`}>Começar meus {TRIAL_DAYS} dias grátis <ArrowRight size={16}/></a>
    <a className="plan-trial-link" href="/assinatura?plan=essencial">Ver assinatura de R$ 49/mês</a>
   </article>
  </div>
  <p className="plans-fine-print">Depois dos {TRIAL_DAYS} dias, você escolhe se quer assinar. A calculadora continua grátis e sem cadastro. O Pix dos pedidos é recebido diretamente pela pizzaria. Os recursos de IA dependem de disponibilidade e da franquia da conta.</p>
 </section>;
}
