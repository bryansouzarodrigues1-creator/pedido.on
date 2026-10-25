import {env} from "cloudflare:workers";
import {z} from "zod";
import {owner,HttpError} from "./server";
import {platformAdmin} from "./platform";
import {parseGuestPreview} from "./guest-preview-policy";
export async function requirePlatformAdmin(){const user=await owner();if(!platformAdmin(user))throw new HttpError(403,"Acesso exclusivo da administração.");return user;}
export const sharedMenuCreate=z.object({requestId:z.string().uuid(),label:z.string().trim().min(2).max(100),days:z.union([z.literal(7),z.literal(30),z.literal(90)]),confirmed:z.literal(true),data:z.unknown()}).strict();
export const sharedMenuEdit=z.object({version:z.number().int().positive(),action:z.enum(["pause","restore","renew"]),days:z.union([z.literal(7),z.literal(30),z.literal(90)]).optional()}).strict();
export type SharedMenuRow={id:string;created_by:string;request_id:string;content_hash:string;label:string;object_key:string;created_at:number;updated_at:number;expires_at:number;disabled_at:number|null;version:number};
export function sharedMenuState(row:Pick<SharedMenuRow,"disabled_at"|"expires_at">,now=Math.floor(Date.now()/1000)){return row.disabled_at!==null?"paused":row.expires_at<=now?"expired":"active";}
export function sharedMenuView(row:SharedMenuRow){return {id:row.id,label:row.label,path:"/c/"+row.id,createdAt:new Date(row.created_at*1000).toISOString(),expiresAt:new Date(row.expires_at*1000).toISOString(),status:sharedMenuState(row),version:row.version};}
export function shareableMenu(raw:unknown){const data=parseGuestPreview(raw);return {...data,pix:{enabled:false,key:"",recipient:""}};}
export const sharedMenuSelect="SELECT id,created_by,request_id,content_hash,label,object_key,created_at,updated_at,expires_at,disabled_at,version FROM admin_shared_menus";
export async function findSharedMenu(id:string){return env.DB!.prepare(sharedMenuSelect+" WHERE id=?").bind(id).first<SharedMenuRow>();}
