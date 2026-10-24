"use client";
import {useId} from "react";
import {googleReviewLink} from "@/lib/google-reviews";
import GoogleReviewLink from "./google-review-link";

export default function GoogleReviewSettings({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const id=useId(),invalid=!!value.trim()&&!googleReviewLink(value);
 return <div className="google-review-settings"><label className="field" htmlFor={id}><span>Link para avaliar no Google</span><input id={id} type="url" inputMode="url" autoComplete="off" value={value} maxLength={500} placeholder="https://g.page/r/sua-pizzaria/review" aria-invalid={invalid||undefined} aria-describedby={`${id}-hint${invalid?` ${id}-error`:""}`} onChange={event=>onChange(event.target.value)}/></label><p id={`${id}-hint`} className="field-hint">No Perfil da Empresa no Google: Ler avaliações → Receba mais avaliações → Copiar link.</p>{invalid&&<p id={`${id}-error`} className="field-error" role="alert">Cole o link de avaliação do Google ou o link curto do Google Maps.</p>}<GoogleReviewLink url={value} className="btn outline small" label="Testar link no Google"/><p className="field-hint">O convite aparece no rodapé do cardápio e depois do pedido concluído. Salve e publique para mostrar aos clientes. Deixe vazio para remover.</p></div>;
}
