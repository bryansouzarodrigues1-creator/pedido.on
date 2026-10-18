import {Check,ArrowRight} from "lucide-react";
import {publicPlanCatalog,publicPlanName} from "@/lib/plan-catalog";
export default function PlanCards(){
 const plan=publicPlanCatalog.essencial;
 return <section className="saas-container pizza-plans" id="planos">
  <div className="pizza-section-heading">
   <span className="pizza-eyebrow">PREÇO SIMPLES</span>
   <h2>Um plano. Sua pizzaria pronta.</h2>
   <p>Uma assinatura mensal para criar seu cardápio e receber pedidos. Teste por 7 dias sem cobrança enquanto essa modalidade estiver disponível.</p>
  </div>
  <div className="plans-grid plans-grid-single">
   <article className="plan-card popular">
    <h3>{publicPlanName}</h3><p>{plan.description}</p>
    <div className="plan-price"><span>R$</span><b>{plan.amount/100}</b><span>/mês</span></div>
    <ul>{plan.features.map(feature=><li key={feature}><Check size={15}/>{feature}</li>)}</ul>
    <a className="btn primary" href="/assinatura?plan=essencial">Assinar por R$ 49/mês <ArrowRight size={16}/></a>
    <a className="plan-trial-link" href={`/cadastro?next=${encodeURIComponent("/app?new=1&plan=essencial")}`}>Testar por 7 dias sem cobrança</a>
   </article>
  </div>
  <p className="plans-fine-print">No teste: 7 imagens e 100 textos no total, sujeitos à disponibilidade. No plano mensal: 4 imagens e 80 textos com IA, conforme franquia técnica. A IA paga ainda está indisponível no beta Cloudflare. A cobrança via Asaas permanece desativada até a homologação. O Pix das pizzas é recebido diretamente pela pizzaria.</p>
 </section>;
}
