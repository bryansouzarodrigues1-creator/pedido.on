import {z} from "zod";
import type {RestaurantData} from "./domain";

export const supportInput=z.object({requestId:z.string().uuid(),kind:z.enum(["guidance","text","image"]),message:z.string().trim().max(3000).default(""),asset:z.enum(["cover","logo","product","promotion","reference"]).default("reference"),productId:z.string().max(80).default("")}).strict().superRefine((v,c)=>{
 if(v.kind!=="image"&&v.message.length<5)c.addIssue({code:"custom",message:"Escreva a orientação ou o texto para a loja."});
 if(v.kind==="image"&&v.asset==="product"&&!v.productId)c.addIssue({code:"custom",message:"Escolha o produto que receberá a foto."});
 if(v.kind!=="image"&&(v.asset!=="reference"||v.productId))c.addIssue({code:"custom",message:"Escolha uma imagem para definir o destino."});
});
export const supportDecision=z.object({id:z.string().uuid(),expectedVersion:z.number().int().positive(),state:z.enum(["available","archived"])}).strict();
export type SupportItem={id:string;kind:"guidance"|"text"|"image"|"promotion";actorRole:string;asset:string;productId:string;message:string;url:string;state:string;version:number;createdAt:string;updatedAt:string};
export function supportMedia(url:string,id:string){return /^[a-zA-Z0-9_-]+$/.test(id)&&url.startsWith(`/media/${id}/`)&&/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(?:png|jpe?g|webp)$/i.test(url.slice(`/media/${id}/`.length));}
export function supportImagePatch(data:RestaurantData,item:Pick<SupportItem,"kind"|"asset"|"productId"|"url">,restaurantId:string):Partial<RestaurantData>{
 if(item.kind!=="image"||!supportMedia(item.url,restaurantId))throw Error("Escolha uma imagem recebida por esta pizzaria.");
 if(item.asset==="cover")return {cover:item.url};
 if(item.asset==="logo")return {logo:item.url};
 if(item.asset==="product"){if(!data.products.some(p=>p.id===item.productId))throw Error("O produto desta foto não está mais no cardápio.");return {products:data.products.map(p=>p.id===item.productId?{...p,image:item.url}:p)};}
 throw Error("Esta imagem é uma referência ou arte para divulgação. Baixe ou use como fundo de uma promoção.");
}
export type CreativeEntry={id:string;source:string;createdAt:string;state:string;label:string;message:string;url:string;asset:string;productId:string;result:unknown};
export const creativeCursor=z.object({at:z.string().datetime(),id:z.string().min(1).max(100),source:z.enum(["image","studio","import","support","campaign"])}).strict();
export const creativeArchiveInput=z.object({source:z.enum(["daily","trial","promotion"]),sourceId:z.string().min(1).max(120),round:z.union([z.literal(1),z.literal(2)]).optional(),format:z.enum(["text","square","story"]),textVariant:z.enum(["whatsapp","status"]).optional(),revision:z.number().int().positive()}).strict();
