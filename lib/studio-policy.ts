import {z} from "zod";
import {extractOwnerName} from "./owner-intake.ts";
import {designFromMessage,presentationSchema} from "./menu-design.ts";
import {restaurantSchema,type RestaurantData} from "./domain.ts";
export const studioInput=z.object({requestId:z.string().uuid(),mode:z.enum(["local","ai"]).default("local"),message:z.string().trim().min(5).max(1600),snapshot:restaurantSchema,productId:z.string().max(80).optional(),history:z.array(z.object({role:z.enum(["user","assistant"]),content:z.string().max(1000)}).strict()).max(4).default([])}).strict();
export const studioClaim=z.object({jobId:z.string().uuid(),token:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const studioProposal=z.object({reply:z.string().min(1).max(1600),name:z.string().trim().min(2).max(100).optional(),theme:z.enum(["editorial","classic","dark","playful"]).optional(),accent:z.string().regex(/^#[a-fA-F0-9]{6}$/).optional(),presentation:presentationSchema.optional(),tagline:z.string().max(120).optional(),description:z.string().max(700).optional(),productDescriptions:z.array(z.object({id:z.string().min(1).max(80),description:z.string().max(600)}).strict()).max(12).default([]),imageBrief:z.object({asset:z.enum(["logo","cover","profile","product"]),productId:z.string().min(1).max(80).optional(),description:z.string().min(10).max(600)}).strict().refine(v=>v.asset==="product"?!!v.productId:v.productId===undefined,"Uma foto de produto exige um produto da loja.").optional()}).strict();
export type StudioProposal=z.infer<typeof studioProposal>;
export const studioProtocol="pedido-studio-v1",studioLimits={monthly:20,daily:20};
export function studioEndpoint(raw:string|undefined){try{const u=new URL(raw||"");return u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&u.hostname.endsWith(".lovable.app")&&u.pathname==="/api/pedido-on/studio"?u.href:"";}catch{return "";}}
export function proposalPatch(raw:unknown,data:RestaurantData):Partial<RestaurantData>{const p=studioProposal.parse(raw);if(p.productDescriptions.some(d=>!data.products.some(item=>item.id===d.id))||new Set(p.productDescriptions.map(d=>d.id)).size!==p.productDescriptions.length)throw new Error("Os textos precisam corresponder aos produtos desta pizzaria.");if(p.imageBrief?.asset==="product"&&!data.products.some(item=>item.id===p.imageBrief!.productId))throw new Error("A imagem precisa corresponder a um produto desta pizzaria.");const patch:Partial<RestaurantData>={};for(const k of ["name","theme","accent","presentation","tagline","description"] as const)if(p[k]!==undefined)(patch as Record<string,unknown>)[k]=p[k];if(p.productDescriptions.length)patch.products=data.products.map(item=>({...item,description:p.productDescriptions.find(d=>d.id===item.id)?.description??item.description}));restaurantSchema.parse({...data,...patch});return patch;}
/** Extract a brand name from the way a pizzaiolo actually types, with or without accents. */
export function nameFromBriefing(message:string):string|undefined{
 const structured=extractOwnerName(message);if(structured)return structured;
 const input=message.trim();
 const patterns=[
  /\b(?:o )?nome da (?:minha |nossa |sua )?pizzaria\s*(?::|=|(?:é|e|será)(?=\s|["“]))\s*["“]?([^\n.!?;,"”]{2,100})/i,
  /\b(?:a )?(?:minha |nossa )?pizzaria\s+(?:se chama|chama-se|chama|tem (?:o )?nome de)(?=\s|["“])\s*["“]?([^\n.!?;,"”]{2,100})/i,
  /\b(?:o )?nome do (?:meu |nosso )?neg[oó]cio\s*(?::|=|(?:é|e)(?=\s|["“]))\s*["“]?([^\n.!?;,"”]{2,100})/i,
 ];
 const explicit=patterns.map(pattern=>input.match(pattern)?.[1]).find(Boolean);
 const copula=explicit?undefined:input.match(/\b(?:a )?(?:minha |nossa )?pizzaria\s+(?:é|e)(?=\s|["“])\s*["“]?([^\n.!?;,"”]{2,100})/i)?.[1];
 const matched=explicit||copula;
 if(!matched)return;
 const value=matched.replace(/\s+(?:e|,)\s+(?:quero|gostaria|preciso|pretendo|vou|vai|ter[aá]|com|ser[aá])\b.*$/i,"")
  .replace(/\s+(?:quero|gostaria|preciso)\s+(?:um|uma|que|de)\b.*$/i,"")
  .replace(/\s+/g," ").replace(/[\s"'“”]+$/g,"").trim();
 // A bare "pizzaria é..." may describe the business rather than name it.
 if(copula&&/^(?:um|uma|nova|loja|moderna?|artesanal|tradicional|simples|pequena|grande|familiar|escura?|clara?|chique|premium|de bairro|muito moderna|muito pequena)(?:\s|$)/i.test(value))return;
 return value.length>=2&&value.length<=100?value:undefined;
}
export function localStudio(message:string,data:RestaurantData,productId?:string):StudioProposal{
 const design=designFromMessage(message,data);
 const m=message.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(),p:StudioProposal={reply:"Prévia criada com estilos prontos. Confira o visual e escolha Usar no cardápio.",productDescriptions:[]};
 const explicitName=nameFromBriefing(message);if(explicitName)p.name=explicitName;
 if(/escuro|noturno|preto|black/.test(m))p.theme="dark";else if(/artesanal|rustic|lenha|tradicional/.test(m))p.theme="editorial";else if(/familia|colorido|divertido/.test(m))p.theme="playful";else if(/claro|branco|minimal|limpo|essencial/.test(m))p.theme="classic";
 const hex=message.match(/#[a-fA-F0-9]{6}\b/)?.[0];if(hex)p.accent=hex;else for(const [word,color] of [["vermelho","#dc3828"],["laranja","#e5662a"],["amarelo","#e5b32c"],["verde","#418653"],["azul","#296bac"],["dourado","#c3a35b"]])if(m.includes(word)){p.accent=color;break;}
 Object.assign(p,design);
 const slogan=message.match(/(?:slogan|frase|chamada)\s*[:=]\s*["“]?([^\n"”]{2,120})/i)?.[1]?.trim();if(slogan)p.tagline=slogan;
 if(!p.tagline&&/mais diret|textos? curt/.test(m))p.tagline=data.tagline||"Escolha sua pizza. Faça seu pedido.";
 if(/logo|capa|perfil|imagem|foto/.test(m)){const product=data.products.find(item=>item.id===productId||m.includes(item.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()));const photo=!!product&&/foto|produto|pizza/.test(m)&&!/logo|capa|perfil/.test(m);p.imageBrief={asset:photo?"product":/logo/.test(m)?"logo":/perfil/.test(m)?"profile":"cover",...(photo?{productId:product.id}:{}),description:message.slice(0,600).padEnd(10," ")};}
 if(!Object.keys(proposalPatch(p,data)).length&&!p.imageBrief)p.reply="Descreva o visual: lista artesanal, fotos grandes, cardápio compacto ou cartões. Você também pode pedir cores, letras e uma frase de abertura.";
 return p;
}
export function studioPrompt(input:z.infer<typeof studioInput>){const d=input.snapshot,products=d.products.filter(p=>!input.productId||p.id===input.productId).slice(0,12).map(p=>({id:p.id,name:p.name,description:p.description}));return JSON.stringify({brand:{name:d.name,theme:d.theme,presentation:d.presentation,accent:d.accent,tagline:d.tagline,description:d.description},products,history:input.history,message:input.message});}

export function studioImagePatch(data:RestaurantData,image:{url:string;asset:string;productId?:string}|null):Partial<RestaurantData>{if(!image)return {};if(!/^\/media\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(image.url))throw new Error("A imagem deve vir do armazenamento da loja.");let patch:Partial<RestaurantData>;if(image.asset==="product"){if(!data.products.some(p=>p.id===image.productId))throw new Error("Escolha um produto desta pizzaria.");patch={products:data.products.map(p=>p.id===image.productId?{...p,image:image.url}:p)};}else if(image.asset==="cover")patch={cover:image.url};else if(image.asset==="logo"||image.asset==="profile")patch={logo:image.url};else throw new Error("Tipo de imagem inválido.");restaurantSchema.parse({...data,...patch});return patch;}

// A missing optional photo target must not discard a valid visual/text proposal.
// Foreign or mismatched product IDs still fail the ownership checks below.
export function normalizeStudioResponse(raw:unknown,input:z.infer<typeof studioInput>):StudioProposal{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return studioProposal.parse(raw);
 const candidate={...raw} as Record<string,unknown>;let omitted=false;
 if(candidate.imageBrief===null)delete candidate.imageBrief;
 else if(candidate.imageBrief&&typeof candidate.imageBrief==="object"&&!Array.isArray(candidate.imageBrief)){
  const brief=candidate.imageBrief as Record<string,unknown>;
  if(brief.asset==="product"&&(brief.productId===undefined||brief.productId==="")){
   // Check the rest of the optional brief before tolerating only its absent ID.
   const valid=z.object({asset:z.literal("product"),productId:z.literal("").optional(),description:z.string().min(10).max(600)}).strict().safeParse(brief);
   if(valid.success){if(input.productId&&input.snapshot.products.some(p=>p.id===input.productId))candidate.imageBrief={...brief,productId:input.productId};else{delete candidate.imageBrief;omitted=true;}}
  }
 }
 const proposal=studioProposal.parse(candidate),design=designFromMessage(input.message,input.snapshot,proposal.theme);
 if(!proposal.presentation&&design.presentation)proposal.presentation=design.presentation;
 if(omitted)proposal.reply=(proposal.reply.slice(0,1440)+" A ideia de foto ficou para depois de escolher um produto; o visual e os textos estão prontos para conferir.").slice(0,1600);
 proposalPatch(proposal,input.snapshot);
 return proposal;
}
