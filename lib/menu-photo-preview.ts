import {chooseProductPhotoCrop,detectProductPhotoCrops,type PhotoRaster} from "./menu-photo-crops.ts";
import {readerItemReady,type ReaderItem,type ReaderPage,type SourceBox} from "./menu-reader-policy.ts";

function overlap(a:SourceBox,b:SourceBox){
 const area=Math.max(0,Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0))*Math.max(0,Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0));
 return area/Math.max(1,Math.min((a.x1-a.x0)*(a.y1-a.y0),(b.x1-b.x0)*(b.y1-b.y0)));
}
function decodePage(src:string):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{
 const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error("Imagem da página indisponível."));image.src=src;
});}

/** Preview-only, best-effort local image association. No upload or rights claim.
 * Ambiguous candidates and repeated photographs deliberately stay unassigned. */
export async function previewMenuPhotos(pages:ReaderPage[],items:ReaderItem[]):Promise<Record<string,string>>{
 const result:Record<string,string>={},limit=24;let count=0;
 for(const page of pages){
  if(count>=limit)break;
  const eligible=items.filter(item=>item.sourceId===page.id&&item.box&&item.kind!=="crust"&&(readerItemReady(item)||!!item.price||item.kind==="pizza"&&Object.values(item.sizes).some(Boolean)));
  if(!eligible.length)continue;
  try{
   const image=await decodePage(page.image),small=document.createElement("canvas"),factor=Math.min(1,384/Math.max(page.width,page.height));
   small.width=Math.max(1,Math.round(page.width*factor));small.height=Math.max(1,Math.round(page.height*factor));
   const ctx=small.getContext("2d",{willReadFrequently:true});if(!ctx)continue;
   ctx.drawImage(image,0,0,small.width,small.height);
   const pixels:PhotoRaster=ctx.getImageData(0,0,small.width,small.height),used:SourceBox[]=[];
   for(const item of eligible){
    if(count>=limit)break;
    const neighbors=eligible.filter(other=>other.id!==item.id&&other.box).map(other=>other.box!);
    const candidates=detectProductPhotoCrops(page.width,page.height,item.box,pixels,neighbors);
    // Prefer a picture directly above its own caption over an unrelated
    // photograph in the neighboring column at the same vertical position.
    const chosen=chooseProductPhotoCrop(candidates);
    if(!chosen||used.some(rect=>overlap(rect,chosen.rect)>.15))continue;
    const rect=chosen.rect,w=rect.x1-rect.x0,h=rect.y1-rect.y0,ratio=Math.min(1,480/Math.max(w,h));
    if(w<90||h<90)continue;
    const crop=document.createElement("canvas");crop.width=Math.round(w*ratio);crop.height=Math.round(h*ratio);
    const cropContext=crop.getContext("2d");if(!cropContext)continue;
    cropContext.drawImage(image,rect.x0,rect.y0,w,h,0,0,crop.width,crop.height);
    result[item.id]=crop.toDataURL("image/jpeg",.82);used.push(rect);count++;
    crop.width=crop.height=0;
   }
   small.width=small.height=0;
  }catch{/* Preview must still load when the browser cannot decode a page. */}
 }
 return result;
}
