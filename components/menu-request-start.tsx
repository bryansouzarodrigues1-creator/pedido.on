"use client";
import {useState} from "react";
import {Link2,ArrowRight} from "lucide-react";
import {Modal} from "./ui";
import {assistanceSource,rememberAssistanceLink} from "@/lib/menu-assistance-client";
export default function MenuRequestStart({initialUrl=""}:{initialUrl?:string}){
 const [open,setOpen]=useState(false),[url,setUrl]=useState(initialUrl),[error,setError]=useState("");
 const link=assistanceSource(url);
 return <><button type="button" className="idea-source-toggle" onClick={()=>{setUrl(initialUrl||url);setError("");setOpen(true);}}><Link2 size={17}/>Solicitar trazer meu cardápio via link</button>
 <Modal open={open} onClose={()=>setOpen(false)} title="Trazer meu cardápio via link"><form className="menu-assistance-form" onSubmit={event=>{event.preventDefault();try{rememberAssistanceLink(url);location.assign("/app?cardapio=solicitar");}catch(e){setError(e instanceof Error?e.message:"Não foi possível guardar o link. Entre no painel para solicitar.");}}}>
 <p>Nossa equipe usa a extensão para trazer os produtos, descrições, preços e fotos disponíveis. Você confere tudo antes de publicar.</p>
 <label htmlFor="guest-assistance-link">Link da loja ou mensagem de compartilhamento do iFood</label><textarea id="guest-assistance-link" rows={3} maxLength={6000} value={url} onChange={event=>{setUrl(event.target.value);setError("");}} required placeholder="Cole o link ou a mensagem completa do iFood"/>
 {link&&<small>Loja sugerida pelo endereço: {link.storeLabel}. Confirme o nome no seu cadastro.</small>}
 <p>Entre ou crie sua conta para enviar a solicitação e acompanhar a entrega. O link fica guardado neste navegador. Esta etapa ainda não envia o pedido à equipe.</p>
 {error&&<p role="alert" className="field-error">{error}</p>}<button type="submit" className="btn primary" disabled={!link}>Continuar no meu painel<ArrowRight size={17}/></button>
 </form></Modal></>;
}
