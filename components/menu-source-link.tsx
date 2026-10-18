import {ExternalLink,Link as LinkIcon} from "lucide-react";
import type {MenuSourceText} from "@/lib/menu-source-links";

export default function MenuSourceLink({source}:{source:MenuSourceText}){
 if(source.status==="none")return null;
 if(source.status==="unsupported")return <aside className="reader-link-reference" role="status"><b>Use o link da loja ou o texto dos produtos</b><p>Esse endereço não é um link completo de loja do iFood. Cole o texto dos produtos ou envie PDF, TXT, CSV ou fotos para continuar.</p></aside>;
 return <aside className="reader-link-reference" aria-label="Referência do cardápio" role="status">
  <b><LinkIcon size={17}/>{source.status==="multiple"?"Links de várias lojas reconhecidos":"Link do iFood reconhecido"}</b>
  {source.links.map(link=><div className="reader-link-store" key={link.storeId}><div><strong>{link.storeLabel}</strong><span>{link.locationLabel} · referência do endereço</span></div><a className="text-button" href={link.url} target="_blank" rel="noopener noreferrer">Abrir no iFood<ExternalLink size={15}/></a></div>)}
  <p>Vamos consultar o catálogo público. Se o iFood não liberar os produtos, abra a loja e envie PDF, TXT, CSV ou fotos.{source.status==="multiple"?" Confira de qual loja vem cada item.":""}</p>
 </aside>;
}
