import {z} from "zod";
import {owner} from "@/lib/server";
import {sameOrigin,errorResponse,privateHeaders,throttle,readJson} from "@/lib/http";
import {cancelAsaas} from "@/lib/asaas-billing";
const schema=z.object({subscriptionId:z.string().regex(/^[a-zA-Z0-9_-]{3,100}$/),confirm:z.literal(true)}).strict();
export async function POST(request:Request){try{sameOrigin(request);const user=await owner();const input=schema.parse(await readJson(request,2048));await throttle("billing-cancel:"+user.userId,5,300);await cancelAsaas(user.userId,input.subscriptionId);return Response.json({cancelled:true},{headers:privateHeaders});}catch(error){return errorResponse(error);}}
