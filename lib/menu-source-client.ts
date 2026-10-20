import type {IfoodImportResult} from "./ifood-import.ts";
export async function fetchMenuSource(url:string):Promise<IfoodImportResult>{
 const config=await fetch("/api/auth/config",{cache:"no-store",signal:AbortSignal.timeout(12000)}),session=await config.json() as {csrf?:string};
 if(!config.ok||!session.csrf)throw Error("Atualize a página para consultar o link.");
 const response=await fetch("/api/menu-source",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json","x-pedido-csrf":session.csrf},body:JSON.stringify({url}),signal:AbortSignal.timeout(85000)});
 const value=await response.json() as IfoodImportResult&{error?:string};if(!response.ok)throw Error(value.error||"Não foi possível consultar esse link.");return value;
}
