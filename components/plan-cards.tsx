import {imageFairUse} from "@/lib/ai-offer-policy";
import {TRIAL_DAYS} from "@/lib/trial-policy";
import {Check,ArrowRight} from "lucide-react";
import {publicPlanCatalog,publicPlanIds} from "@/lib/plan-catalog";
export default function PlanCards(){
 return <section className="saas-container pizza-plans" id="planos">
  <div className="pizza-section-heading">
   <span className="pizza-eyebrow">PREÇO SIMPLES</span>
   <h2>Seu cardápio. Seu próximo passo.</h2>
   <p>Crie seu cardápio e receba pedidos com {TRIAL_DAYS} dias grátis a partir da sua primeira pizzaria, sem cartão de crédito e sem cobrança automática.</p>
  </div>
  <div className="plans-grid plans-grid-two">{publicPlanIds.map(id=>{const plan=publicPlanCatalog[id];return <article key={id} className={`plan-card ${id==="profissional"?"popular":""}`}>
    {id==="profissional"&&<span className="plan-badge">COM ATENDENTE DE IA</span>}
    <h3>{plan.name}</h3><p>{plan.description}</p>
    <div className="plan-price"><span>R$</span><b>{plan.amount/100}</b><span>/mês</span></div>
    <ul>{plan.features.map(feature=><li key={feature}><Check size={15}/>{feature}</li>)}</ul>
    <a className="btn primary" href={`/cadastro?next=${encodeURIComponent("/app?new=1&plan="+id)}`}>Começar meus {TRIAL_DAYS} dias grátis <ArrowRight size={16}/></a>
    <a className="plan-trial-link" href={`/assinatura?plan=${id}`}>Ver assinatura {plan.name} · R$ {plan.amount/100}/mês</a>
   </article>;})}</div>
  <p className="plans-fine-print">Depois dos {TRIAL_DAYS} dias, você escolhe se quer assinar. O teste inclui uma imagem de IA com texto e modelos prontos de divulgação; o atendente ao cliente é exclusivo do Pro ativo. A calculadora continua grátis. Pix direto para a pizzaria. Textos e artes locais são ilimitados; o Essencial inclui até 3 novas imagens por dia (Brasília), com legenda. O Pro não tem cota mensal fixa de imagens e segue uso justo. Os limites são compartilhados por conta.</p>
 <details className="plans-fine-print"><summary>Uso justo das imagens no Pro</summary><p>{imageFairUse}</p></details>
 </section>;
}
