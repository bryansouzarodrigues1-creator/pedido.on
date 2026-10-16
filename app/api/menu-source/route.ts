import {z} from "zod";
import {sameOrigin,readJson,throttle,errorResponse} from "@/lib/http";
import {sha256} from "@/lib/auth-policy";
import {parseIfoodStoreLink} from "@/lib/menu-source-links";
import {importIfoodLink} from "@/lib/ifood-import";
export async function POST(request:Request){try{
 sameOrigin(request);const {url}=z.object({url:z.string().max(2048).refine(v=>!!parseIfoodStoreLink(v),"Cole o link completo da loja no iFood.")}).strict().parse(await readJson(request,4096));
 await throttle("menu-source-ip:"+await sha256(request.headers.get("cf-connecting-ip")||"unknown"),6,600);
 await throttle("menu-source-global",120,3600);
 return Response.json(await importIfoodLink(url),{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return errorResponse(error);}}
