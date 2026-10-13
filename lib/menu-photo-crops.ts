import type {SourceBox} from "./menu-reader-policy.ts";
export type ProductCrop={side:"left"|"right";rect:SourceBox};
export type PhotoRaster={width:number;height:number;data:ArrayLike<number>};
/** A geometric *candidate*, not proof that this photo belongs to the product. */
export function suggestProductCrops(width:number,height:number,box?:SourceBox):ProductCrop[]{
 if(!box||!Number.isFinite(width)||!Number.isFinite(height)||width<220||height<220)return [];
 const {x0,y0,x1,y1}=box;
 if([x0,y0,x1,y1].some(v=>!Number.isFinite(v))||x0<0||y0<0||x1>width||y1>height||x0>=x1||y0>=y1)return [];
 const gap=Math.max(8,Math.round(width*.018));
 const availableLeft=x0-gap,availableRight=width-x1-gap;
 const required=Math.max(90,Math.round(width*.15));
 const intended=Math.round(Math.min(width*.29,height*.36));
 const middle=(y0+y1)/2;
 const make=(side:"left"|"right",available:number):ProductCrop|null=>{
  if(available<required)return null;
  const sideLength=Math.min(Math.round(available),intended);
  if(sideLength<required)return null;
  const startX=side==="left"?x0-gap-sideLength:x1+gap;
  const startY=Math.max(0,Math.min(height-sideLength,middle-sideLength/2));
  return {side,rect:{x0:Math.round(startX),y0:Math.round(startY),x1:Math.round(startX+sideLength),y1:Math.round(startY+sideLength)}};
 };
 return [make("left",availableLeft),make("right",availableRight)].filter((v):v is ProductCrop=>!!v);
}

/** Local photo candidates from a small raster. No recognition of the food itself.
 * Color and texture distinguish a possible photo from whitespace or plain text;
 * OCR boxes limit the search to this row. Uncertain/monochrome sources may yield none.
 */
export function detectProductPhotoCrops(width:number,height:number,box:SourceBox|undefined,raster:PhotoRaster,neighbors:SourceBox[]=[]):ProductCrop[]{
 if(!suggestProductCrops(width,height,box).length||!box)return [];
 const rw=raster.width,rh=raster.height;
 if(!Number.isInteger(rw)||!Number.isInteger(rh)||rw<1||rh<1||rw>512||rh>512||raster.data.length!==rw*rh*4)return [];
 const sx=rw/width,sy=rh/height,gap=Math.max(8,Math.round(width*.018)),required=Math.max(90,Math.round(width*.15));
 const reach=Math.min(width*.29,height*.36);
 let top=Math.max(0,box.y0-reach),bottom=Math.min(height,box.y1+reach);
 for(const neighbor of neighbors){
  if(Object.values(neighbor).some(v=>!Number.isFinite(v))||neighbor.x0>=neighbor.x1||neighbor.y0>=neighbor.y1)continue;
  // Only neighboring text in the same column defines the row limits.
  if(Math.min(box.x1,neighbor.x1)<=Math.max(box.x0,neighbor.x0))continue;
  if(neighbor.y1<box.y0)top=Math.max(top,neighbor.y1+gap/2);
  if(neighbor.y0>box.y1)bottom=Math.min(bottom,neighbor.y0-gap/2);
 }
 const results:ProductCrop[]=[];
 for(const side of ["left","right"] as const){
  const left=side==="left"?0:box.x1+gap,right=side==="left"?box.x0-gap:width;
  if(right-left<required||bottom-top<required)continue;
  const x0=Math.max(0,Math.ceil(left*sx)),x1=Math.min(rw,Math.floor(right*sx)),y0=Math.max(0,Math.ceil(top*sy)),y1=Math.min(rh,Math.floor(bottom*sy));
  const mask=new Uint8Array(rw*rh);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
   const i=(y*rw+x)*4,r=raster.data[i],g=raster.data[i+1],b=raster.data[i+2];
   if(Math.max(r,g,b)-Math.min(r,g,b)>=28&&Math.max(r,g,b)>45&&raster.data[i+3]>200)mask[y*rw+x]=1;
  }
  let best:{rect:SourceBox;score:number}|null=null;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
   const start=y*rw+x;if(!mask[start])continue;
   mask[start]=0;const queue=[start];let minX=x,maxX=x,minY=y,maxY=y,sum=0,squares=0;
   for(let n=0;n<queue.length;n++){
    const pixel=queue[n],px=pixel%rw,py=Math.floor(pixel/rw),i=pixel*4;
    minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
    const light=(raster.data[i]+raster.data[i+1]+raster.data[i+2])/3;sum+=light;squares+=light*light;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const nx=px+dx,ny=py+dy;if(nx<x0||nx>=x1||ny<y0||ny>=y1)continue;
     const next=ny*rw+nx;if(mask[next]){mask[next]=0;queue.push(next);}
    }
   }
   const w=(maxX-minX+1)/sx,h=(maxY-minY+1)/sy,area=(maxX-minX+1)*(maxY-minY+1),variance=squares/queue.length-(sum/queue.length)**2;
   if(w<required||h<required||w>width*.42||h>height*.5||w/h<.6||w/h>1.7||queue.length/area<.15||variance<100)continue;
   const padding=Math.max(2,Math.round(width*.004));
   const rect={x0:Math.max(Math.ceil(left),Math.floor(minX/sx)-padding),y0:Math.max(Math.ceil(top),Math.floor(minY/sy)-padding),x1:Math.min(Math.floor(right),Math.ceil((maxX+1)/sx)+padding),y1:Math.min(Math.floor(bottom),Math.ceil((maxY+1)/sy)+padding)};
   if(!best||queue.length>best.score)best={rect,score:queue.length};
  }
  if(best)results.push({side,rect:best.rect});
 }
 return results;
}
