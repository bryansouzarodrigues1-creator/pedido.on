import {readerItemReady,type ReaderItem} from "./menu-reader-policy.ts";

/** Owner-approved photo upload for a particular product. Never call from OCR,
 * rendering or preview effects: selecting the association is a human action. */
export async function uploadApprovedMenuPhoto(restaurantId:string,photo:string,send:typeof fetch=fetch):Promise<string>{
 if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(photo))throw Error("A foto sugerida não está disponível. Confira o arquivo novamente.");
 const blob=await (await send(photo)).blob();
 if(blob.type!=="image/jpeg"||!blob.size||blob.size>2*1024*1024)throw Error("Este recorte não é um JPEG válido de até 2 MB.");
 const body=new FormData();body.append("file",new File([blob],"foto-do-cardapio.jpg",{type:"image/jpeg"}));
 const response=await send(`/api/restaurants/${encodeURIComponent(restaurantId)}/media`,{method:"POST",body});
 const result=await response.json() as {url?:string;error?:string};
 if(!response.ok||!result.url||!result.url.startsWith(`/media/${restaurantId}/`))throw Error(result.error||"Não foi possível guardar uma das fotos.");
 return result.url;
}

/** A batch is still a set of individual affirmative product/photo matches.
 * Successful uploads are acknowledged one at a time for safe retry. */
export async function attachApprovedMenuPhotos(
 items:ReaderItem[],photos:Record<string,string>,approved:Record<string,boolean>,restaurantId:string,
 onAttach:(id:string,url:string)=>void=()=>{},upload=uploadApprovedMenuPhoto
):Promise<ReaderItem[]>{
 const updated=items.map(item=>({...item}));
 for(const item of updated){
  if(!item.selected||!readerItemReady(item)||!approved[item.id]||!photos[item.id]||item.image)continue;
  item.image=await upload(restaurantId,photos[item.id]);
  onAttach(item.id,item.image);
 }
 return updated;
}
