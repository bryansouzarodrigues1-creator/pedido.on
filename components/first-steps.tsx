"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChefHat, Eye, ImageIcon, Pizza, Store, Calculator, Share2 } from "lucide-react";
import { type RestaurantData, type RestaurantRecord, money, asCents } from "@/lib/domain";
import { galleryDesign, galleryStyles } from "@/lib/gallery-styles";
import { availableProduct } from "@/lib/menu-sales";
import { emptyFirstSteps, readFirstSteps, writeFirstSteps, firstStepsProgress, firstSale, studySignature, deliverySignature, starterStoreReady, type FirstStepsStudy } from "@/lib/first-steps";
import { MiniMenu, Spinner } from "./ui";
import PriceExplanation from "./price-explanation";

const steps = [
  { title: "Cadastre suas primeiras pizzas", description: "Nomes, tamanhos e preços", Icon: Pizza },
  { title: "Descubra quanto sobra", description: "Custo e preço explicados", Icon: Calculator },
  { title: "Configure seu delivery", description: "Contato, entrega e horários", Icon: Store },
  { title: "Publique seu cardápio", description: "Escolha o visual e compartilhe", Icon: ChefHat },
];
const startingStyles = galleryStyles.filter(s => ["forno-classico", "noite-premium", "familia", "urbano"].includes(s.id));
type Props = {
  restaurant: RestaurantRecord; data: RestaurantData; busy: boolean; dirty: boolean;
  onChange: (patch: Partial<RestaurantData>) => void;
  onSave: () => Promise<RestaurantRecord | null>;
  onAdd: () => void; onImport: () => void; onTools: () => void; onAppearance: () => void;
  onPreview: () => void; onPublish: () => void; onShare: () => void;
};
export default function FirstSteps({ restaurant, data, busy, dirty, onChange, onSave, onAdd, onImport, onTools, onAppearance, onPreview, onPublish, onShare }: Props) {
  const [study, setStudy] = useState<FirstStepsStudy>(emptyFirstSteps), [ready, setReady] = useState(false), [storageError, setStorageError] = useState(false), [message, setMessage] = useState("");
  const liveStudy = useRef(study); liveStudy.current = study;
  useEffect(() => {
    try { setStudy(readFirstSteps(localStorage, restaurant.id)); } catch { setStorageError(true); }
    setReady(true);
  }, [restaurant.id]);
  useEffect(() => {
    if (!ready) return;
    try { writeFirstSteps(localStorage, restaurant.id, study); setStorageError(false); } catch { setStorageError(true); }
  }, [study, ready, restaurant.id]);
  useEffect(() => {
    const save = () => { try { writeFirstSteps(localStorage, restaurant.id, liveStudy.current); } catch {} };
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [restaurant.id]);
  const saved = JSON.parse(restaurant.data) as RestaurantData;
  const progress = firstStepsProgress(saved, restaurant.published, study), complete = progress.filter(Boolean).length;
  const sale = firstSale(study), products = data.products.filter(availableProduct);
  function patch(value: Partial<FirstStepsStudy>) { setStudy(old => ({ ...old, ...value })); setMessage(""); }
  function next() { patch({ step: Math.min(3, study.step + 1) }); }
  function confirmCosts() { if (!firstSale(study)) return; window.dispatchEvent(new Event("pizzaria:calculator-used")); patch({ costReview: studySignature(study), step: 2 }); }
  async function saveStep(delivery = false) {
    const row = await onSave();
    if (!row) { setMessage("Não foi possível confirmar o salvamento. Confira sua conexão e tente novamente."); return; }
    const confirmed = JSON.parse(row.data) as RestaurantData;
    if (delivery) patch({ deliveryReview: deliverySignature(confirmed), step: 3 });
    else patch({ step: 1 });
  }
  function selectStyle(id: string) {
    const visual = galleryDesign(data, id, "");
    onChange({ theme: visual.theme, accent: visual.accent, presentation: visual.presentation });
  }
  return <section className="first-steps" aria-label="Comece sua pizzaria">
    <header className="first-steps-heading"><div><span className="eyebrow">UM PASSO DE CADA VEZ</span><h2>Comece sua pizzaria</h2><p>Você pode fazer no seu ritmo e pular uma etapa.</p></div><button type="button" className="text-button" disabled={busy} onClick={onTools}>Usar ferramentas completas <ArrowRight size={16}/></button></header>
    <div className="first-steps-progress"><span>Seu progresso</span><strong>{complete} de 4</strong><progress aria-label="Etapas concluídas" value={complete} max={4}/></div>
    <nav className="first-steps-list" aria-label="Etapas para começar">{steps.map(({ title, description, Icon }, i) => <button type="button" key={title} disabled={busy} aria-current={study.step === i ? "step" : undefined} onClick={() => patch({ step: i })}><span className={progress[i] ? "done" : ""}>{progress[i] ? <Check size={19}/> : <Icon size={20}/>}</span><span><b>{title}</b><small>{description}</small></span><span className="first-step-state">{progress[i] ? "Concluído" : i + 1}</span></button>)}</nav>
    <fieldset disabled={busy} className="first-steps-workspace">
      <legend>{study.step + 1}. {steps[study.step].title}</legend>
      {study.step === 0 && <div className="first-step-body">
        <p>Comece com os sabores que você já sabe fazer. Informe um nome e o preço dos tamanhos que vai vender.</p>
        {products.length > 0 && <ul className="first-step-products">{products.slice(0,5).map(p => <li key={p.id}><span>{p.name}</span><b>{money(p.kind === "pizza" ? Math.min(...Object.values(p.sizes).filter(n => n > 0)) : p.price)}</b></li>)}</ul>}
        {products.length > 5 && <p>Mais {products.length - 5} produtos no seu cardápio.</p>}
        <div className="first-step-actions"><button type="button" className={products.length ? "btn outline" : "btn primary"} onClick={onAdd}><Pizza size={18}/>{products.length ? "Adicionar outra pizza" : "Adicionar minha primeira pizza"}</button>{products.length > 0 && <button type="button" className="btn primary" onClick={() => void saveStep()}>{busy ? <Spinner/> : <Check size={18}/>}Guardar e continuar</button>}</div>
        <button type="button" className="text-button" onClick={onImport}>Já tenho cardápio em foto, arquivo ou link</button>
        {dirty && <small>Os produtos estão no rascunho. Guarde para continuar depois.</small>}
      </div>}
      {study.step === 1 && <div className="first-step-body">
        <p>Faça uma conta de uma pizza. Ela ajuda a entender o preço antes de vender.</p>
        <div className="first-step-fields"><label>Quanto custa fazer uma pizza? · R$<input aria-label="Quanto custa fazer uma pizza? · R$" inputMode="decimal" maxLength={24} placeholder="Ex.: 20,00" value={study.cost} onChange={e => patch({ cost: e.target.value })}/><small>Some ingredientes e embalagem. Inclua cada gasto uma vez.</small></label><label>Por quanto pretende vender? · R$<input inputMode="decimal" maxLength={24} placeholder="Ex.: 40,00" value={study.price} onChange={e => patch({ price: e.target.value })}/></label></div>
        <details className="first-step-extra"><summary>Incluir outros gastos nesta conta</summary><div className="first-step-fields"><label>Outros gastos por pizza · R$<input aria-label="Outros gastos por pizza · R$" inputMode="decimal" maxLength={24} value={study.extras} onChange={e => patch({ extras: e.target.value })}/><small>Ex.: parte da entrega que sai do seu bolso.</small></label><label>Taxas e impostos da venda · %<input inputMode="decimal" maxLength={24} value={study.fees} onChange={e => patch({ fees: e.target.value })}/></label><label>Parcela das contas fixas por pizza · R$<input aria-label="Parcela das contas fixas por pizza · R$" inputMode="decimal" maxLength={24} value={study.fixed} onChange={e => patch({ fixed: e.target.value })}/><small>Uma estimativa de aluguel, energia e outras contas.</small></label></div></details>
        {sale ? <><div className={"first-sale-result" + (sale.remaining < 0 ? " negative" : "")} role="status"><span>{sale.remaining < 0 ? "Falta para cobrir os gastos" : "Sobra com os gastos informados"}</span><strong>{money(Math.abs(sale.remaining))}</strong><small>por pizza · confira os gastos ainda não incluídos</small></div><PriceExplanation cost={sale.cost} price={sale.price} extras={sale.extras} fees={sale.fees} fixed={sale.fixed}/><button type="button" className="btn primary" onClick={confirmCosts}><Check size={18}/>Conferi essa estimativa</button></> : <p className="field-hint">Preencha custo e preço maiores que zero. Os outros gastos devem ser positivos ou zero, e as taxas vão de 0 a 90%.</p>}
        <a className="text-button" href="/calculadora" target="_blank" rel="noopener noreferrer">Abrir a calculadora Fácil ou Profissional <ArrowRight size={16}/></a>
      </div>}
      {study.step === 2 && <div className="first-step-body">
        <p>Defina como vai receber os pedidos. Você pode ajustar bairros e outras opções nas ferramentas completas.</p>
        <div className="first-step-fields"><label>WhatsApp de pedidos<input type="tel" maxLength={25} value={data.whatsapp} placeholder="DDD + número" onChange={e => onChange({ whatsapp: e.target.value })}/></label><label>Horário de funcionamento<input aria-label="Horário de funcionamento" maxLength={300} value={data.hours} placeholder="Ex.: terça a domingo, das 18h às 23h" onChange={e => onChange({ hours: e.target.value })}/><small>Este texto informa seus clientes. Abrir ou fechar pedidos continua na sua mão.</small></label></div>
        <div className="first-step-delivery"><label><input type="checkbox" checked={data.deliveryEnabled} onChange={e => onChange({ deliveryEnabled: e.target.checked })}/>Fazer entregas</label><label><input type="checkbox" checked={data.pickupEnabled} onChange={e => onChange({ pickupEnabled: e.target.checked })}/>Oferecer retirada</label></div>
        {data.deliveryEnabled && <div className="first-step-fields"><label>Taxa de entrega para o cliente · R$<input aria-label="Taxa de entrega para o cliente · R$" type="number" min="0" max="10000" step="0.01" value={data.deliveryFee / 100} onChange={e => onChange({ deliveryFee: asCents(e.target.value) })}/><small>Confira se esse valor cobre o custo do entregador.</small></label><label>Tempo estimado<input maxLength={60} value={data.eta} onChange={e => onChange({ eta: e.target.value })}/></label></div>}
        {data.pickupEnabled && <label>Endereço para retirada<input maxLength={200} value={data.address} onChange={e => onChange({ address: e.target.value })}/></label>}
        <p className="field-hint">Pagamentos aceitos: {data.payments.join(", ")}. Até a verificação da loja, os pedidos seguem pelo WhatsApp.</p>
        <button type="button" className="btn primary" disabled={!starterStoreReady(data) || !data.hours.trim()} onClick={() => void saveStep(true)}><Check size={18}/>Guardar entrega e horários</button>
        {!starterStoreReady(data) && <p className="field-hint">Informe um WhatsApp válido e escolha entrega ou retirada. Para retirada, informe também o endereço.</p>}
      </div>}
      {study.step === 3 && <div className="first-step-body">
        <p>Seu modelo já está pronto. Escolha uma base se quiser mudar o visual.</p>
        <div className="first-step-styles" role="group" aria-label="Modelos para começar">{startingStyles.map(s => <button type="button" key={s.id} aria-pressed={data.presentation?.identity === s.id} onClick={() => selectStyle(s.id)}><span style={{ background: s.accent }}/><b>{s.title}</b><small>{s.summary}</small></button>)}</div>
        {(!data.cover || data.cover === "/assets/pizza.webp") ? <label className="first-step-photo"><input type="checkbox" checked={data.cover === "/assets/pizza.webp"} onChange={e => onChange({ cover: e.target.checked ? "/assets/pizza.webp" : "" })}/><ImageIcon size={19}/>Usar foto ilustrativa na capa</label> : <p>Sua capa já está aplicada. Você pode trocá-la em Aparência.</p>}
        <small>As fotos são opcionais. Tirar a foto mantém o modelo escolhido.</small>
        <div className="first-step-menu-preview"><MiniMenu data={data} large/>{data.cover === "/assets/pizza.webp" && <span>Foto ilustrativa de referência</span>}</div>
        <div className="first-step-actions"><button type="button" className="btn outline" onClick={onPreview}><Eye size={18}/>Conferir prévia completa</button><button type="button" className="text-button" onClick={onAppearance}>Ajustar em Aparência</button></div>
        {!starterStoreReady(data) || !products.length ? <p className="field-hint">Para publicar, confira seu contato, entrega ou retirada e ao menos um produto com preço. As outras etapas podem ficar para depois.</p> : null}
        <button type="button" className="btn primary" onClick={onPublish}>{busy ? <Spinner/> : <Check size={18}/>} {restaurant.published ? "Salvar e atualizar cardápio" : "Publicar meu cardápio"}</button>
        {restaurant.published && <button type="button" className="btn outline" onClick={onShare}><Share2 size={18}/>Compartilhar meu cardápio</button>}
      </div>}
    </fieldset>
    {message && <p role="alert" className="field-error">{message}</p>}
    <footer className="first-steps-footer"><span>{storageError ? "Este navegador não permitiu guardar seu estudo de custos. Mantenha uma cópia dos valores antes de sair." : "Seu estudo de custos e suas conferências ficam neste aparelho. O cardápio é salvo na sua conta."}</span>{study.step < 3 && <button type="button" className="text-button" disabled={busy} onClick={next}>Fazer essa etapa depois <ArrowRight size={16}/></button>}</footer>
  </section>;
}
