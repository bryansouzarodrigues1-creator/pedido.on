import type {SourceBox} from "./menu-reader-policy.ts";
export type ProductCrop={side:"left"|"right";rect:SourceBox};
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
