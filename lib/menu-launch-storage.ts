import {clearMenuLaunch,guestReadingKey,type MenuLaunch} from "./menu-launch.ts";
import {loadReading,saveReading,removeReading} from "./menu-reader-storage.ts";
/** Clear the guest checkpoint only after the restaurant's copy is durable. */
export async function adoptMenuLaunch(launch:MenuLaunch,restaurantId:string,storage:Pick<Storage,"getItem"|"setItem"|"removeItem">){
 const key=guestReadingKey(launch.id);let guest=null;
 try{guest=await loadReading(key);}catch(error){if(launch.hasPhotos)throw error;}
 if(launch.hasPhotos&&!guest?.pages.length)throw Error("As fotos iniciais não estão disponíveis neste aparelho. Sua ideia foi mantida.");
 const source=guest&&(guest.pages.length||guest.items.length||guest.text)?guest:null;
 if(source){await saveReading({...source,restaurantId,savedAt:Date.now()});await removeReading(key);}
 clearMenuLaunch(storage,launch.id);
 return {hasSource:!!source||!!launch.sourceText,sourceText:source?"":launch.sourceText};
}
