import {z} from "zod";
import {asaasRuntime,receiveAsaasEvent} from "@/lib/asaas-billing";
import {validAsaasWebhookToken} from "@/lib/asaas-policy";
import {HttpError,errorResponse,readJson,privateHeaders} from "@/lib/http";
const id=z.string().regex(/^[a-zA-Z0-9_-]{3,120}$/),schema=z.object({id,event:z.string().min(3).max(100),payment:z.object({id}).passthrough().optional(),subscription:z.object({id}).passthrough().optional()}).passthrough();
export async function POST(request:Request){try{const c=asaasRuntime();if(!c.enabled)throw new HttpError(503,"A assinatura Asaas está em configuração.");if(!await validAsaasWebhookToken(request.headers.get("asaas-access-token"),c.webhook))throw new HttpError(401,"Autenticação do webhook inválida.");const event=schema.parse(await readJson(request,65536));await receiveAsaasEvent(event);return Response.json({received:true},{headers:privateHeaders});}catch(error){return errorResponse(error);}}
