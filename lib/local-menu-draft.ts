import {z} from "zod";
import {restaurantSchema,productSchema,type RestaurantData,type Product} from "./domain.ts";
const MAX_BYTES=600000,MAX_AGE=7*24*60*60*1000;
const checkpointSchema=z.object({version:z.literal(1),restaurantId:z.string().uuid(),revision:z.number().int().nonnegative(),savedAt:z.number().int(),draft:restaurantSchema,product:productSchema.extend({name:z.string().max(100)}).nullable()});
export type LocalMenuDraft=z.infer<typeof checkpointSchema>;
type Storage=Pick<globalThis.Storage,"getItem"|"setItem"|"removeItem">;
export const menuDraftKey=(id:string)=>"pizzaria-menu-draft-"+id;
export function readLocalMenuDraft(storage:Storage,id:string,now=Date.now()):LocalMenuDraft|null{
 try{const raw=storage.getItem(menuDraftKey(id));if(!raw||raw.length>MAX_BYTES)return null;const parsed=checkpointSchema.safeParse(JSON.parse(raw));if(!parsed.success||parsed.data.restaurantId!==id||parsed.data.savedAt>now+60000||now-parsed.data.savedAt>MAX_AGE)return null;return parsed.data;}catch{return null;}
}
export function writeLocalMenuDraft(storage:Storage,id:string,revision:number,draft:RestaurantData,product:Product|null,now=Date.now()):boolean{
 try{const parsed=checkpointSchema.safeParse({version:1,restaurantId:id,revision,savedAt:now,draft,product});if(!parsed.success)return false;const raw=JSON.stringify(parsed.data);if(raw.length>MAX_BYTES)return false;storage.setItem(menuDraftKey(id),raw);return true;}catch{return false;}
}
export function removeLocalMenuDraft(storage:Storage,id:string){try{storage.removeItem(menuDraftKey(id));}catch{}}
