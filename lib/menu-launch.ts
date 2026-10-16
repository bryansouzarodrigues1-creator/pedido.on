import {z} from "zod";
import {galleryStyleId} from "./gallery-styles.ts";
export const launchKey="pizzaria-menu-idea-v1",guestReadingId="pizzaria-menu-guest-v1";
export const launchSchema=z.object({id:z.string().uuid(),savedAt:z.number().finite(),idea:z.string().max(1600),brandName:z.string().trim().min(2).max(100).optional(),sourceText:z.string().max(60000),hasPhotos:z.boolean().default(false),hasAssets:z.boolean().optional(),styleId:galleryStyleId.optional(),refinement:z.string().max(600).optional(),previewReady:z.boolean().optional(),aiRequested:z.boolean().optional(),targetRestaurantId:z.string().uuid().optional()}).strict();
export type MenuLaunch=z.infer<typeof launchSchema>;
type StorageLike=Pick<Storage,"getItem"|"setItem"|"removeItem">;
export function readMenuLaunch(storage:StorageLike,now=Date.now()):MenuLaunch|null{
 try{const value=launchSchema.safeParse(JSON.parse(storage.getItem(launchKey)||"null"));if(!value.success||value.data.savedAt>now+60000||now-value.data.savedAt>7*86400000)return null;return value.data;}catch{return null;}
}
export function saveMenuLaunch(storage:StorageLike,launch:MenuLaunch){storage.setItem(launchKey,JSON.stringify(launchSchema.parse(launch)));}
export function clearMenuLaunch(storage:StorageLike,id:string){if(readMenuLaunch(storage)?.id===id)storage.removeItem(launchKey);}
export const guestReadingKey=(id:string)=>guestReadingId+"-"+id;
export const launchDestination="/app?new=1&setup=1";
export const launchSignup="/cadastro?next="+encodeURIComponent(launchDestination);
