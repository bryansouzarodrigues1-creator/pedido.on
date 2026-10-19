import type {IfoodAuthorizedImport} from "./ifood-api";
import type {PublicIfoodConnection} from "./ifood-connect";
export type IfoodConnectionStatus={enabled:boolean;pending?:PublicIfoodConnection};
export async function ifoodConnectionRequest<T>(body?:{action:"start";url:string}|{action:"complete";url:string;authorizationCode:string}|{action:"cancel"}):Promise<T>{
 const config=await fetch("/api/auth/config",{cache:"no-store",signal:AbortSignal.timeout(12000)}),value=await config.json() as {csrf?:string};
 if(!config.ok||!value.csrf)throw Error("Atualize a página para conectar sua loja.");
 const response=await fetch("/api/ifood/import",{method:body?"POST":"GET",cache:"no-store",headers:{"x-pedido-csrf":value.csrf,...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(body?.action==="complete"?55000:16000)});
 const result=await response.json() as T&{error?:string;reconnect?:boolean};if(!response.ok)throw Object.assign(Error(result.error||"Não foi possível concluir a conexão com o iFood."),{reconnect:result.reconnect===true});return result;
}
export type {IfoodAuthorizedImport,PublicIfoodConnection};
