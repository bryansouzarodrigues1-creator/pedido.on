import {env} from "cloudflare:workers";
import {queueOwnerNotice} from "./push";
type Notice={event:string;title:string;body:string;path:string};
export async function recordNotice(ownerId:string,notice:Notice){
 if(!env.DB)return;
 try{await env.DB.prepare("INSERT INTO account_notices(id,owner_id,event_key,title,body,path,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(owner_id,event_key) DO NOTHING").bind(crypto.randomUUID(),ownerId,notice.event,notice.title,notice.body,notice.path,new Date().toISOString()).run();}catch{console.error("[pizzaria.on] notice persistence failed");}
}
export async function notifyAdministrator(notice:Notice){
 try{const e=env as typeof env&{PLATFORM_ADMIN_ACCOUNT_ID?:string;PLATFORM_ADMIN_EMAIL?:string};
 const ownerId=e.PLATFORM_ADMIN_ACCOUNT_ID||(e.PLATFORM_ADMIN_EMAIL?await env.DB!.prepare("SELECT owner_id FROM account_profiles WHERE lower(email)=lower(?) LIMIT 1").bind(e.PLATFORM_ADMIN_EMAIL).first<string>("owner_id"):null);
 if(!ownerId)return;
 await recordNotice(ownerId,notice);queueOwnerNotice(ownerId,notice.event,"admin","");}catch{console.error("[pizzaria.on] admin notice failed");}
}
export async function menuProgressNotice(ownerId:string,requestId:string,restaurantId:string,status:"paired"|"received"|"blocked"){
 const content=status==="received"?{title:"Seu cardápio está pronto",body:"Confira os produtos, preços e fotos recebidos antes de usar no rascunho."}:status==="paired"?{title:"Estamos preparando seu cardápio",body:"A equipe começou a atender sua solicitação. Acompanhe o andamento no painel."}:{title:"Sua solicitação precisa de atenção",body:"A leitura não foi concluída. Veja a orientação da equipe ou envie PDF e fotos."};
 await recordNotice(ownerId,{event:"menu-"+status+":"+requestId,...content,path:"/app?loja="+encodeURIComponent(restaurantId)+"&cardapio=revisar"});
}
