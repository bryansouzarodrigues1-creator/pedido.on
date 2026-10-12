import {z} from "zod";
import {studioProposal} from "./studio-policy.ts";
export const historyCursor=z.object({at:z.string().datetime(),id:z.string().uuid()}).strict();
export const savedCreation=z.discriminatedUnion("kind",[z.object({kind:z.literal("image"),id:z.string().uuid(),createdAt:z.string().datetime(),asset:z.enum(["logo","cover","profile","product"]),url:z.string().regex(/^\/media\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/)}).strict(),z.object({kind:z.literal("text"),id:z.string().uuid(),createdAt:z.string().datetime(),proposal:studioProposal}).strict()]);
export type SavedCreation=z.infer<typeof savedCreation>;
export function ownedCreation(raw:{id:string;kind:string;created_at:string;asset:string|null;result:string|null;url:string|null},restaurantId:string){try{if(raw.kind==="image"){if(!raw.url?.startsWith("/media/"+restaurantId+"/"))return null;return savedCreation.parse({kind:"image",id:raw.id,createdAt:raw.created_at,asset:raw.asset,url:raw.url});}return savedCreation.parse({kind:"text",id:raw.id,createdAt:raw.created_at,proposal:JSON.parse(raw.result||"null")});}catch{return null;}}
