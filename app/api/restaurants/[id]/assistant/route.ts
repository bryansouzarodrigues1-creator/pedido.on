import {env} from "cloudflare:workers";
import {ownedRestaurant} from "@/lib/server";
import {ownerAssistantOverview} from "@/lib/customer-assistant";
import {errorResponse,privateHeaders,HttpError} from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const row=await ownedRestaurant((await params).id),conversation=new URL(request.url).searchParams.get("conversation");
 if(conversation){if(!/^[a-f0-9-]{36}$/.test(conversation))throw new HttpError(400,"Conversa inválida.");const found=await env.DB!.prepare("SELECT id FROM assistant_conversations WHERE id=? AND restaurant_id=? AND expires_at>?").bind(conversation,row.id,Math.floor(Date.now()/1000)).first();if(!found)throw new HttpError(404,"Conversa não encontrada.");const turns=(await env.DB!.prepare("SELECT id,question,answer,state,created_at AS createdAt FROM assistant_turns WHERE conversation_id=? ORDER BY created_at,id LIMIT 30").bind(conversation).all()).results.map(t=>({...t,answer:t.answer?JSON.parse(t.answer as string):null}));return Response.json({turns},{headers:privateHeaders});}
 return Response.json(await ownerAssistantOverview(row.id,row.ownerId),{headers:privateHeaders});
 }catch(e){return errorResponse(e);}}
