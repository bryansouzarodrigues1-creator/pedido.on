"use client";
import {useState,useEffect,useRef,useCallback} from "react";
import {CreditCard,Settings,RefreshCw} from "lucide-react";
import {planCatalog,publicPlanCatalog,publicPlanName,type CatalogPlan} from "@/lib/plan-catalog";
import AiAllowance from "./ai-allowance";
import {billingPost} from "@/lib/billing-client";
import {Modal,Spinner} from "./ui";
type BillingState={enabled:boolean;provider?:"asaas"|"stripe";mode?:"sandbox"|"production";enforced?:boolean;subscription:{id?:string;plan:string;status:string;periodEnd:number;paidThrough:number;paidPlan:string}|null;intent?:{id:string;plan:string;state:string}|null;invoices?:{id:string;status:string;amount:number;dueDate:string;url:string|null}[]};
const price=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100),paidDate=(value:number)=>new Date(value*1000).toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"});
const statuses:Record<string,string>={PENDING:"A pagar",OVERDUE:"Vencida",CONFIRMED:"Paga",RECEIVED:"Paga",REFUNDED:"Estornada",REFUND_PENDING:"Estorno em análise",CHARGEBACK_REQUESTED:"Pagamento contestado",CHARGEBACK_DISPUTE:"Pagamento contestado",AWAITING_CHARGEBACK_REVERSAL:"Pagamento contestado",DELETED:"Cancelada"};
export function BillingControls({initialPlan: _initialPlan}:{initialPlan:string}){
 const [state,setState]=useState<BillingState|null>(null),[document,setDocument]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[cancelOpen,setCancelOpen]=useState(false);
 const requestId=useRef<string|null>(null),live=useRef(true);
 const load=useCallback(async()=>{const res=await fetch("/api/billing/status",{cache:"no-store"});if(!res.ok)throw new Error("Não foi possível consultar a assinatura.");const data=await res.json() as BillingState;if(live.current){setState(data);if(data.intent){requestId.current=data.intent.id;}}},[]);
 useEffect(()=>{live.current=true;void load().catch(e=>{if(live.current)setError(e.message);});return()=>{live.current=false;};},[load]);
 useEffect(()=>{if(state?.subscription?.status!=="pending"&&!state?.intent)return;const timer=setInterval(()=>{void load().catch(()=>{});},20000);return()=>clearInterval(timer);},[state?.subscription?.status,state?.intent?.id,load]);
 async function send(path:Parameters<typeof billingPost>[0],body:unknown){const res=await billingPost(path,body);let data:{url?:string;pending?:boolean;error?:string};try{data=await res.json();}catch{throw new Error("Não foi possível confirmar a operação. Atualize a assinatura antes de tentar novamente.");}if(!res.ok){if(res.status===400)requestId.current=null;throw new Error(data.error||"Não foi possível concluir a operação.");}return data;}
 async function checkout(portal=false){setBusy(true);setError("");setNotice("");try{requestId.current??=crypto.randomUUID();const data=await send(portal?"/api/billing/portal":"/api/billing/checkout",portal?{}:{plan:"essencial",requestId:requestId.current,...(state?.provider==="asaas"?{document}:{})});if(data.url){setDocument("");location.assign(data.url);return;}setNotice("A assinatura está sendo preparada. Use Atualizar para conferir a fatura.");await load();}catch(e){setError(e instanceof Error?e.message:"Não foi possível abrir a assinatura.");}finally{setBusy(false);}}
 async function sync(){setBusy(true);setError("");try{await send("/api/billing/sync",{});await load();setNotice("Assinatura atualizada.");}catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar.");}finally{setBusy(false);}}
 async function cancel(){setBusy(true);setError("");try{await send("/api/billing/cancel",{subscriptionId:state?.subscription?.id,confirm:true});setCancelOpen(false);requestId.current=null;await load();setNotice("Renovação cancelada. O período pago continua disponível.");}catch(e){setError(e instanceof Error?e.message:"Não foi possível cancelar.");}finally{setBusy(false);}}
 if(!state)return error?<div><p className="field-error" role="alert">{error}</p><button type="button" className="btn outline small" onClick={()=>{setError("");void load().catch(e=>setError(e.message));}}>Tentar novamente</button></div>:<p className="billing-load" role="status"><Spinner/>Consultando assinatura…</p>;
 if(!state.enabled)return <div className="billing-controls">
  <p><strong>{publicPlanName} · {price(publicPlanCatalog.essencial.amount)}/mês</strong></p>
  <div className="billing-plan-benefits" aria-label="Benefícios do plano único"><ul>{publicPlanCatalog.essencial.features.map(feature=><li key={feature}>{feature}</li>)}</ul></div>
  <p role="status">Assinatura em preparação. Nenhuma cobrança será realizada neste ambiente beta.</p>
  <small>As funções de IA paga e o Asaas ainda não estão disponíveis neste beta.</small>
 </div>;
 const current=state.subscription,asaas=state.provider==="asaas",canSubscribe=!current||["canceled","incomplete_expired"].includes(current.status);
 return <div className="billing-controls">
  {asaas&&state.mode==="sandbox"&&<span className="pill">Ambiente de teste · sem pagamento real</span>}
  {current&&<p><strong>{planCatalog[current.plan as CatalogPlan]?.name||current.plan}</strong>{planCatalog[current.plan as CatalogPlan]&&<> · {price(planCatalog[current.plan as CatalogPlan].amount)}/mês</>}</p>}
  {current&&<p><strong>{current.status==="active"?"Assinatura ativa":current.status==="canceled"?"Renovação cancelada":current.status==="trialing"?"Em teste":"Pagamento pendente"}</strong>{current.paidThrough>0&&<> · acesso pago até {paidDate(current.paidThrough)}</>}</p>}
  {canSubscribe&&<>
   <p>Um plano de {price(publicPlanCatalog.essencial.amount)}/mês.{asaas?" O pagamento é concluído na página segura do Asaas.":" Você continua no checkout seguro."}</p>
   <div className="billing-plan-benefits" aria-label="Benefícios do plano único">
    <b>{publicPlanName} · uma pizzaria</b>
    <ul>{publicPlanCatalog.essencial.features.map(feature=><li key={feature}>{feature}</li>)}</ul>
   </div>
   {asaas&&<label>CPF ou CNPJ do pagador<input required value={document} autoComplete="off" maxLength={24} onChange={e=>setDocument(e.target.value)} placeholder="Documento para a assinatura"/></label>}
   {current?.status==="canceled"&&current.paidThrough>Date.now()/1000&&<small>Uma nova assinatura inicia outra mensalidade hoje.</small>}
   {state.intent&&state.intent.plan!=="essencial"?
    <p className="field-error" role="alert">Existe uma solicitação antiga de outro plano. Entre em contato com o suporte antes de contratar o plano único.</p>:
    <button className="btn primary small" disabled={busy||(asaas&&document.replace(/[^0-9A-Za-z]/g,"").length<11)} onClick={()=>void checkout()}>{busy?<Spinner/>:<CreditCard size={15}/>} {state.intent?"Continuar pagamento":`Assinar por ${price(publicPlanCatalog.essencial.amount)}/mês`}</button>}
  </>}
  {asaas?<>
   {(current||state.intent)&&<button type="button" className="btn outline small" disabled={busy} onClick={()=>void sync()}>{busy?<Spinner/>:<RefreshCw size={15}/>}{current?.status==="pending"?"Já paguei · verificar":"Atualizar assinatura"}</button>}
   {!!state.invoices?.length&&<details className="billing-invoices" open={current?.status==="pending"}><summary>Faturas</summary>{state.invoices.map(invoice=><div className="billing-invoice" key={invoice.id}><span><b>{price(invoice.amount)}</b><small>{statuses[invoice.status]||"Em atualização"} · {invoice.dueDate.split("-").reverse().join("/")}</small></span>{invoice.url&&<a href={invoice.url} target="_blank" rel="noopener noreferrer" className="text-button">{["PENDING","OVERDUE"].includes(invoice.status)?"Pagar":"Ver fatura"}</a>}</div>)}</details>}
   {current&&current.status!=="canceled"&&<button type="button" className="text-button" disabled={busy} onClick={()=>setCancelOpen(true)}>Cancelar renovação</button>}
   <small>Mensalidade da pizzaria.on, separada das vendas da sua pizzaria. O plano é confirmado após o pagamento. A fatura mensal não ativa débito automático.</small>
   <Modal open={cancelOpen} onClose={()=>{if(!busy)setCancelOpen(false);}} title="Cancelar renovação?"><p>As próximas cobranças serão interrompidas.{current&&current.paidThrough>Date.now()/1000?" Seu acesso pago continua até "+paidDate(current.paidThrough)+".":""}</p><div className="promotion-form-actions"><button type="button" className="text-button" disabled={busy} onClick={()=>setCancelOpen(false)}>Manter assinatura</button><button type="button" className="btn primary small" disabled={busy} onClick={()=>void cancel()}>{busy?<Spinner/>:null}Sim, cancelar renovação</button></div></Modal>
  </>:<>{current&&<button className="btn outline small" disabled={busy} onClick={()=>void checkout(true)}>{busy?<Spinner/>:<Settings size={15}/>}Gerenciar assinatura</button>}<small>A assinatura depende do pagamento confirmado. Gerencie o plano pelo portal.</small></>}
  <details className="subscription-usage"><summary>Uso da IA</summary><AiAllowance/></details>
  {notice&&<p role="status">{notice}</p>}{error&&<p className="field-error" role="alert">{error}</p>}
 </div>;
}
