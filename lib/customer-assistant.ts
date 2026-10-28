import {env} from "cloudflare:workers";
import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {restaurants} from "@/db/schema";
import {restaurantSchema,slugSchema,type RestaurantData} from "./domain";
import {canServeMenu} from "./billing";
import {storeVerification} from "./store-verification";
import {accountAccess} from "./account-access";
import {aiEntitlement,planQuotasEnabled,reserveBudgetedJob,settleAiBudget} from "./ai-budget";
import {studioConfig} from "./studio";
import {requestAiProvider} from "./ai-provider";
import {authConfig} from "./auth";
import {randomToken,sha256} from "./auth-policy";
import {HttpError,throttle,readBytes} from "./http";
import {answerFromSelection,customerAssistantPrompt,localCustomerAnswer,redactCustomerMessage,relevantProducts,type CustomerAnswer} from "./customer-assistant-policy";

const retention=30*86400;
type Conversation={id:string;token_hash:string;restaurant_id:string;expires_at:number};
type Turn={id:string;request_id:string;input_hash:string;question:string;answer:string|null;state:string;source:string;created_at:string};
export async function hasCustomerAssistant(ownerId:string){
 const access=await accountAccess(ownerId);if(access.mode==="suspended")return false;
 // Preserve earlier administrator Pro grants, stored with the former R$49 ID.
 if(access.mode==="grant"&&(access.tier==="pro"||access.tier!=="free"&&["profissional","rede"].includes(access.plan)))return true;
 return ["profissional","rede"].includes((await aiEntitlement(ownerId)).plan);
}
export async function publicAssistant(slug:string){
 slugSchema.parse(slug);const row=await getDb().select().from(restaurants).where(and(eq(restaurants.slug,slug),eq(restaurants.published,true))).get();
 if(!row?.publishedData||!await canServeMenu(row.ownerId,row.id))throw new HttpError(404,"Cardápio não encontrado.");
 if(!await hasCustomerAssistant(row.ownerId))throw new HttpError(403,"O atendimento de IA não está disponível nesta loja.");
 const data=restaurantSchema.parse(JSON.parse(row.publishedData));if(!data.assistant.enabled)throw new HttpError(404,"O assistente está desativado.");
 return {row,data,siteOrderingAllowed:(await storeVerification(row)).siteOrderingAllowed};
}
async function visitorHash(id:string,token:string){return sha256(authConfig().seal+":assistant:"+id+":"+token);}
export async function visitorHistory(restaurantId:string,id:string,token:string){
 if(!/^[a-f0-9-]{36}$/.test(id)||!/^[a-f0-9]{64}$/.test(token))throw new HttpError(401,"Conversa não encontrada.");
 const found=await env.DB!.prepare("SELECT id FROM assistant_conversations WHERE id=? AND restaurant_id=? AND token_hash=? AND expires_at>?").bind(id,restaurantId,await visitorHash(id,token),Math.floor(Date.now()/1000)).first();
 if(!found)return [];
 const turns=(await env.DB!.prepare("SELECT id,question,answer,state,created_at FROM assistant_turns WHERE conversation_id=? ORDER BY created_at DESC,id DESC LIMIT 30").bind(id).all<Turn>()).results;
 return turns.reverse().filter(t=>t.state==="completed"&&t.answer).map(t=>({id:t.id,question:t.question,answer:JSON.parse(t.answer!) as CustomerAnswer,createdAt:t.created_at}));
}
async function modelAnswer(ownerId:string,restaurantId:string,requestId:string,data:RestaurantData,message:string,history:{question:string;answer:string}[],siteOrderingAllowed:boolean){
 const config=studioConfig();if(!config.enabled||!planQuotasEnabled())throw new HttpError(503,"O atendimento está temporariamente sem conexão com a IA.");
 await throttle("customer-ai-owner:"+await sha256(ownerId),60,86400);
 const context=customerAssistantPrompt(data,message,history,siteOrderingAllowed),prompt=JSON.stringify(context);if(prompt.length>24000)throw new HttpError(413,"Esta pergunta precisa de uma resposta da loja.");
 const stamp=new Date().toISOString(),id=crypto.randomUUID(),token=randomToken(),insert="INSERT INTO studio_jobs(id,owner_id,restaurant_id,request_id,input_hash,token_hash,prompt,state,period_key,created_at,expires_at,updated_at) SELECT ?,?,?,?,?,?,?,'queued',?,?,?,?";
 const reserved=await reserveBudgetedJob(ownerId,"text",id,insert,[id,ownerId,restaurantId,"customer:"+requestId,await sha256(prompt),await sha256(token),prompt,stamp.slice(0,7),stamp,new Date(Date.now()+120000).toISOString(),stamp]);
 if(!reserved)throw new HttpError(429,"O atendimento atingiu a disponibilidade de IA deste período.");
 try{
  const response=await requestAiProvider(config.endpoint,{jobId:id,token},60000);
  if(response.status===402){await env.DB!.prepare("UPDATE studio_jobs SET state='cancelled',updated_at=? WHERE id=? AND state IN ('queued','claimed')").bind(new Date().toISOString(),id).run();throw new HttpError(503,"A IA está sem disponibilidade.");}
  if(!response.ok||!(response.headers.get("content-type")||"").startsWith("application/json")){await response.body?.cancel().catch(()=>{});throw new HttpError(503,"O atendimento de IA não respondeu.");}
  const bytes=await readBytes(new Request("https://assistant.invalid",{method:"POST",body:response.body,duplex:"half"} as RequestInit),12000),raw=JSON.parse(new TextDecoder().decode(bytes));
  const answer=answerFromSelection(data,raw,siteOrderingAllowed,relevantProducts(data,message+" "+history.slice(-1).map(t=>t.question).join(" ")));
  const finished=await env.DB!.prepare("UPDATE studio_jobs SET state='completed',result=?,updated_at=? WHERE id=? AND state='claimed'").bind(JSON.stringify({reply:answer.text,productDescriptions:[]}),new Date().toISOString(),id).run();
  if(!finished.meta.changes)throw new HttpError(502,"A resposta não foi autorizada.");return answer;
 }catch(error){
  await env.DB!.prepare("UPDATE studio_jobs SET state=CASE WHEN state='queued' THEN 'cancelled' ELSE 'failed' END,updated_at=? WHERE id=? AND state IN ('queued','claimed')").bind(new Date().toISOString(),id).run();throw error;
 }finally{await settleAiBudget(id,"text");}
}
export async function answerCustomer(request:Request,shop:Awaited<ReturnType<typeof publicAssistant>>,input:{conversationId:string;token:string;requestId:string;message:string}){
 const db=env.DB!,now=Math.floor(Date.now()/1000),stamp=new Date().toISOString(),message=redactCustomerMessage(input.message),hash=await visitorHash(input.conversationId,input.token),inputHash=await sha256(message);
 const ip=await sha256(authConfig().seal+":customer-ip:"+(request.headers.get("cf-connecting-ip")||"unknown"));
 await throttle("customer-requests:"+ip,100,3600);
 let conversation=await db.prepare("SELECT id,token_hash,restaurant_id,expires_at FROM assistant_conversations WHERE id=?").bind(input.conversationId).first<Conversation>();
 if(conversation&&(conversation.token_hash!==hash||conversation.restaurant_id!==shop.row.id||conversation.expires_at<=now))throw new HttpError(401,"Esta conversa não está disponível. Inicie uma nova conversa.");
 if(!conversation){
  await throttle("customer-new:"+ip,10,3600);
  await db.prepare("DELETE FROM assistant_conversations WHERE restaurant_id=? AND expires_at<=?").bind(shop.row.id,now).run();
  await db.prepare("INSERT INTO assistant_conversations(id,restaurant_id,token_hash,created_at,updated_at,expires_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(input.conversationId,shop.row.id,hash,stamp,stamp,now+retention).run();
  conversation=await db.prepare("SELECT id,token_hash,restaurant_id,expires_at FROM assistant_conversations WHERE id=?").bind(input.conversationId).first<Conversation>();
  if(!conversation||conversation.token_hash!==hash||conversation.restaurant_id!==shop.row.id)throw new HttpError(401,"Conversa não disponível.");
 }
 const existing=await db.prepare("SELECT id,request_id,input_hash,question,answer,state,source,created_at FROM assistant_turns WHERE conversation_id=? AND request_id=?").bind(input.conversationId,input.requestId).first<Turn>();
 if(existing){if(existing.input_hash!==inputHash)throw new HttpError(409,"Esta tentativa já foi usada com outra pergunta.");if(existing.state==="completed"&&existing.answer)return {id:existing.id,question:existing.question,answer:JSON.parse(existing.answer) as CustomerAnswer,createdAt:existing.created_at};throw new HttpError(409,"A resposta anterior ainda não foi confirmada. Aguarde antes de fazer outra pergunta.");}
 const count=await db.prepare("SELECT COUNT(*) AS n FROM assistant_turns WHERE conversation_id=?").bind(input.conversationId).first<{n:number}>();if((count?.n||0)>=30)throw new HttpError(429,"Esta conversa chegou ao limite. Fale com a loja para continuar.");
 const lock=await db.prepare("UPDATE assistant_conversations SET pending_request=?,pending_until=?,updated_at=? WHERE id=? AND token_hash=? AND (pending_request IS NULL OR pending_until<?)").bind(input.requestId,now+100,stamp,input.conversationId,hash,now).run();if(!lock.meta.changes)throw new HttpError(409,"Aguarde a resposta que já está sendo preparada.");
 const id=crypto.randomUUID();
 try{
  await db.prepare("INSERT INTO assistant_turns(id,conversation_id,request_id,input_hash,question,state,source,created_at,updated_at) VALUES(?,?,?,?,?,'pending','local',?,?)").bind(id,input.conversationId,input.requestId,inputHash,message,stamp,stamp).run();
  const history=(await db.prepare("SELECT question,answer FROM assistant_turns WHERE conversation_id=? AND state='completed' ORDER BY created_at DESC,id DESC LIMIT 4").bind(input.conversationId).all<{question:string;answer:string}>()).results.reverse().map(t=>({question:t.question,answer:(JSON.parse(t.answer) as CustomerAnswer).text}));
  let answer=localCustomerAnswer(shop.data,message,shop.siteOrderingAllowed);
  if(!answer)try{answer=await modelAnswer(shop.row.ownerId,shop.row.id,id,shop.data,message,history,shop.siteOrderingAllowed);}catch{answer={text:"Não consegui confirmar uma resposta agora. Posso ajudar com horários, entrega, pagamento e como pedir. Para essa dúvida, fale com a pizzaria pelo contato abaixo.",source:"handoff",handoff:true,products:[]};}
  await db.prepare("UPDATE assistant_turns SET answer=?,state='completed',source=?,updated_at=? WHERE id=? AND state='pending'").bind(JSON.stringify(answer),answer.source,new Date().toISOString(),id).run();
  return {id,question:message,answer,createdAt:stamp};
 }finally{await db.prepare("UPDATE assistant_conversations SET pending_request=NULL,pending_until=0,updated_at=? WHERE id=? AND pending_request=?").bind(new Date().toISOString(),input.conversationId,input.requestId).run();}
}
export async function ownerAssistantOverview(restaurantId:string,ownerId:string){
 const now=Math.floor(Date.now()/1000),db=env.DB!,allowed=await hasCustomerAssistant(ownerId);
 const totals=await db.prepare("SELECT COUNT(DISTINCT c.id) AS conversations,COUNT(t.id) AS questions,COALESCE(SUM(CASE WHEN t.source='ai' THEN 1 ELSE 0 END),0) AS ai,COALESCE(SUM(CASE WHEN t.source='handoff' THEN 1 ELSE 0 END),0) AS handoffs FROM assistant_conversations c LEFT JOIN assistant_turns t ON t.conversation_id=c.id WHERE c.restaurant_id=? AND c.expires_at>?").bind(restaurantId,now).first();
 const conversations=(await db.prepare("SELECT c.id,c.updated_at AS updatedAt,COUNT(t.id) AS questions FROM assistant_conversations c LEFT JOIN assistant_turns t ON t.conversation_id=c.id WHERE c.restaurant_id=? AND c.expires_at>? GROUP BY c.id ORDER BY c.updated_at DESC,c.id DESC LIMIT 20").bind(restaurantId,now).all()).results;
 return {allowed,providerReady:studioConfig().enabled&&planQuotasEnabled(),totals,conversations};
}
/** Caller must first authorize the owner or platform administrator. */
export async function assistantConversationTurns(restaurantId:string,conversation:string){
 if(!/^[a-f0-9-]{36}$/.test(conversation))throw new HttpError(400,"Conversa inválida.");
 const found=await env.DB!.prepare("SELECT id FROM assistant_conversations WHERE id=? AND restaurant_id=? AND expires_at>?").bind(conversation,restaurantId,Math.floor(Date.now()/1000)).first();if(!found)throw new HttpError(404,"Conversa não encontrada.");
 return (await env.DB!.prepare("SELECT id,question,answer,state,created_at AS createdAt FROM assistant_turns WHERE conversation_id=? ORDER BY created_at,id LIMIT 30").bind(conversation).all()).results.map(t=>({...t,answer:t.answer?JSON.parse(t.answer as string):null}));
}
