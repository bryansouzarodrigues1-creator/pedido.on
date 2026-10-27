import {env} from "cloudflare:workers";
import {z} from "zod";
import {sha256} from "./auth-policy";
import {HttpError} from "./http";
import {restaurantSchema,type RestaurantData} from "./domain";
import {campaignAccess} from "./campaign-access";
import {campaignCreativeSource,trialIdeas} from "./trial-campaign-policy";
import {generateImage,imageConfig} from "./ai-images";
import {runStudio,studioConfig} from "./studio";
import {studioProposal} from "./studio-policy";
import {planQuotasEnabled} from "./ai-budget";
import {curatedWelcome} from "./welcome-campaign-seeds";
type Row={id:string;owner_id:string;restaurant_id:string;trial_started:number;round:number;source_version:string;snapshot:string;brief:string;text_request:string;image_requests:string;proposal:string|null};
type Store={id:string;ownerId:string;revision:number;data:string;slug?:string};
export const campaignInput=z.object({round:z.union([z.literal(1),z.literal(2)]),action:z.enum(["prepare","text","image1","image2","retryImage1","retryImage2","retryText"]),revision:z.number().int().positive(),brief:z.string().trim().max(600).default("")}).strict();
const db=()=>env.DB!;
async function find(ownerId:string,started:number,round:number){return db().prepare("SELECT * FROM trial_campaigns WHERE owner_id=? AND trial_started=? AND round=?").bind(ownerId,started,round).first<Row>();}
export async function readCampaigns(store:Store){
 const access=await campaignAccess(store.ownerId),sourceVersion=await sha256(campaignCreativeSource(restaurantSchema.parse(JSON.parse(store.data)))),records=[];
 for(const round of [1,2]){const seed=curatedWelcome(store.slug,restaurantSchema.parse(JSON.parse(store.data)),round);if(seed&&access.startedAt&&Math.floor(Date.now()/1000)>=access.rounds[round-1].availableAt){records.push(seed);continue;}const row=await find(store.ownerId,access.startedAt,round);if(!row||row.restaurant_id!==store.id)continue;
  const ids=JSON.parse(row.image_requests) as string[],jobs=(await db().prepare("SELECT request_id,state,result_url FROM image_jobs WHERE owner_id=? AND restaurant_id=? AND campaign_key=? ORDER BY created_at").bind(store.ownerId,store.id,row.id).all<{request_id:string;state:string;result_url:string|null}>()).results;
  const text=await db().prepare("SELECT state FROM studio_jobs WHERE owner_id=? AND restaurant_id=? AND request_id=?").bind(store.ownerId,store.id,row.text_request).first<{state:string}>();
  const ideas=trialIdeas(restaurantSchema.parse(JSON.parse(row.snapshot)),round);
  records.push({round,id:row.id,stale:row.source_version!==sourceVersion,brief:row.brief,proposal:row.proposal?studioProposal.parse(JSON.parse(row.proposal)):null,textState:text?.state||"new",images:ids.map((id,index)=>{const job=jobs.find(j=>j.request_id===id);return {productId:ideas[index]?.items[0].productId||"",state:job?.state||"new",url:job?.state==="completed"&&job.result_url?.startsWith(`/media/${store.id}/`)?job.result_url:""};})});
 }
 return {access,records,sourceVersion,imageEnabled:imageConfig().enabled&&planQuotasEnabled(),textEnabled:studioConfig().enabled};
}
export async function prepareCampaign(store:Store,input:z.infer<typeof campaignInput>){
 const access=await campaignAccess(store.ownerId);if(!access.rounds.find(r=>r.round===input.round)?.available)throw new HttpError(403,access.active?"A segunda rodada fica disponível no sexto dia do período Free.":"As duas rodadas pertencem ao período Free. As criações já salvas continuam no seu histórico.");
 if(store.revision!==input.revision)throw new HttpError(409,"Seu cardápio mudou. Atualize o painel e confira as sugestões.");
 const first=await db().prepare("SELECT id FROM restaurants WHERE owner_id=? ORDER BY created_at,id LIMIT 1").bind(store.ownerId).first<{id:string}>();if(first?.id!==store.id)throw new HttpError(403,"O kit Free é compartilhado pela conta e pertence à primeira pizzaria.");
 const data=restaurantSchema.parse(JSON.parse(store.data)),ideas=trialIdeas(data,input.round);if(ideas.length!==2)throw new HttpError(400,"Cadastre pelo menos um produto disponível com preço para preparar seu kit.");
 if(curatedWelcome(store.slug,data,input.round))return readCampaigns(store);
 const version=await sha256(campaignCreativeSource(data));
 await db().prepare("INSERT INTO trial_campaigns(id,owner_id,restaurant_id,trial_started,round,source_version,snapshot,brief,text_request,image_requests,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(owner_id,trial_started,round) DO NOTHING").bind(crypto.randomUUID(),store.ownerId,store.id,access.startedAt,input.round,version,JSON.stringify(data),input.brief,crypto.randomUUID(),JSON.stringify([crypto.randomUUID(),crypto.randomUUID()]),new Date().toISOString()).run();
 let row=(await find(store.ownerId,access.startedAt,input.round))!;if(row.restaurant_id!==store.id)throw new HttpError(409,"Este kit já foi preparado para outra pizzaria da conta.");if(row.source_version!==version)throw new HttpError(409,"O cardápio mudou desde a preparação. Reutilize suas imagens em Criar com IA; este kit não gera outra rodada automaticamente.");
 if(input.action.startsWith("retry")){
  const text=input.action==="retryText",slot=input.action==="retryImage1"?0:1,ids=JSON.parse(row.image_requests) as string[],requestId=text?row.text_request:ids[slot],table=text?"studio_jobs":"image_jobs";
  const job=await db().prepare(`SELECT state FROM ${table} WHERE owner_id=? AND restaurant_id=? AND request_id=?`).bind(store.ownerId,store.id,requestId).first<{state:string}>();if(job?.state!=="cancelled")throw new HttpError(409,"Apenas uma tentativa devolvida pode ser refeita sem outra cobrança. Confira o resultado atual.");
  if(text)await db().prepare("UPDATE trial_campaigns SET text_request=? WHERE id=? AND text_request=?").bind(crypto.randomUUID(),row.id,requestId).run();
  else await db().prepare("UPDATE trial_campaigns SET image_requests=json_set(image_requests,?,?) WHERE id=? AND json_extract(image_requests,?)=?").bind(`$[${slot}]`,crypto.randomUUID(),row.id,`$[${slot}]`,requestId).run();
  return readCampaigns(store);
 }
 if(input.action==="text"){
  const picked=ideas.map(idea=>idea.items[0].productId),snapshot={...data,products:data.products.filter(p=>picked.includes(p.id))};
  const response=await runStudio(store.ownerId,store.id,{requestId:row.text_request,mode:"ai",snapshot,history:row.brief?[{role:"user" as const,content:("Referência visual da loja para este kit: "+row.brief).slice(0,1000)}]:[],message:(`Sugira um layout forte e organizado para a loja, respeitando a marca atual. Em productDescriptions dê uma chamada publicitária curta por produto, sem inventar ingredientes, números, descontos, horários, prêmios, entrega ou benefícios. Não renomeie a loja. Em reply explique a organização e as duas ideias de destaque.`).slice(0,1600)});
  await db().prepare("UPDATE trial_campaigns SET proposal=? WHERE id=? AND owner_id=?").bind(JSON.stringify(response.proposal),row.id,store.ownerId).run();
 }else if(input.action==="image1"||input.action==="image2"){
  if(!planQuotasEnabled())throw new HttpError(503,"O kit de imagens está em preparação. Os textos e a organização continuam disponíveis.");
  const slot=input.action==="image1"?0:1,idea=ideas[slot],product=data.products.find(p=>p.id===idea.items[0].productId)!;
  await generateImage(store.ownerId,store.id,data.name,{requestId:(JSON.parse(row.image_requests) as string[])[slot],asset:"product",productId:product.id,theme:data.theme,accent:data.accent,description:(`Foto publicitária ilustrativa deste produto, fiel aos ingredientes cadastrados, composição apetitosa para redes sociais, luz de forno e fundo com a cor da marca. Sem textos, preços, números ou selos. ${row.brief}`).slice(0,600)},product,row.id);
 }
 return readCampaigns(store);
}
