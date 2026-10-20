import {guestReadingKey,type MenuLaunch} from "./menu-launch.ts";
import {clearLaunchCheckpoint} from "./menu-launch-checkpoint.ts";
import {loadReading,saveReading,removeReading} from "./menu-reader-storage.ts";
import {refreshGuestMenuReading} from "./menu-guest-review.ts";
import {loadBrandAssets,saveBrandAssets,removeBrandAssets} from "./guest-brand-assets.ts";
/** Clear the guest checkpoint only after the restaurant's copy is durable. */
export async function adoptMenuLaunch(launch:MenuLaunch,restaurantId:string,storage?:Pick<Storage,"getItem"|"setItem"|"removeItem">){
 if(launch.targetRestaurantId&&launch.targetRestaurantId!==restaurantId)throw Error("Estes arquivos já estão vinculados a outro rascunho. Retome a pizzaria que você criou.");
 const key=guestReadingKey(launch.id);let guest=null;
 try{guest=await loadReading(key);}catch(error){if(launch.hasPhotos)throw error;}
 if(launch.hasPhotos&&!guest?.pages.length)throw Error("As fotos iniciais não estão disponíveis neste aparelho. Sua ideia foi mantida.");
 const assets=launch.hasAssets?await loadBrandAssets(key):null;
 if(launch.hasAssets&&!assets?.logo&&!assets?.cover)throw Error("As imagens iniciais da marca não estão disponíveis neste aparelho. Sua ideia foi mantida.");
 const source=guest&&(guest.pages.length||guest.items.length||guest.text)?guest:null;
 if(assets)await saveBrandAssets({...assets,key:restaurantId});
 if(source)await saveReading({...refreshGuestMenuReading(source),restaurantId,savedAt:Date.now()});
 await clearLaunchCheckpoint(launch.id,storage); // All destination copies are durable before this clear.
 // Cleanup is best effort. A failed guest cleanup cannot undo the completed handoff.
 if(source)await removeReading(key).catch(()=>{});
 if(assets)await removeBrandAssets(key).catch(()=>{});
 return {hasSource:!!source||!!launch.sourceText,sourceText:source?"":launch.sourceText};
}
