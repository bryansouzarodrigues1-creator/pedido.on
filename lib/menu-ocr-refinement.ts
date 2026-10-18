import {menuLineAmounts,readMenuPages,readerItemReady,type ReaderLine} from "./menu-reader-policy.ts";

export function chooseMenuOcrReading(original:ReaderLine[],alternative:ReaderLine[],sourceId:string):ReaderLine[]{
 const score=(lines:ReaderLine[])=>readMenuPages([{id:sourceId,lines}]).items.filter(readerItemReady).length;
 if(score(alternative)<=score(original))return original;
 return alternative.map(line=>{
  if(!line.box||!menuLineAmounts(line.text).length)return line;
  const box=line.box,partner=original.find(other=>other.box&&menuLineAmounts(other.text).length&&Math.abs(other.box.y1-box.y1)<Math.max(8,Math.min(other.box.y1-other.box.y0,box.y1-box.y0)*.6)&&Math.min(other.box.x1,box.x1)-Math.max(other.box.x0,box.x0)>Math.min(other.box.x1-other.box.x0,box.x1-box.x0)*.5);
  if(!partner)return line;const checked=reconcileOcrLine(line,partner);
  return {...line,priceConfidence:checked.priceConfidence,priceDisagreement:checked.priceDisagreement};
 });
}

/** Re-reading the same pixels may confirm a price, but disagreement needs review. */
export function reconcileOcrLine(original:ReaderLine,refined:ReaderLine):ReaderLine {
 const before=menuLineAmounts(original.text),after=menuLineAmounts(refined.text);
 if(!after.length||after.some(v=>v===null))return original;
 const agrees=before.length===after.length&&before.every((value,i)=>value===after[i]);
 const stronger=(refined.confidence??0)>(original.confidence??0);
 if(!agrees){
  if((refined.priceConfidence??refined.confidence??0)<75)return original;
  return {...(stronger?refined:original),box:original.box,priceDisagreement:true,priceConfidence:Math.min(original.priceConfidence??100,50)};
 }
 return {...(stronger?refined:original),box:original.box,
  confidence:Math.max(original.confidence??0,refined.confidence??0),
  priceDisagreement:original.priceDisagreement||refined.priceDisagreement,
  priceConfidence:original.priceDisagreement||refined.priceDisagreement?50:Math.max(original.priceConfidence??original.confidence??0,refined.priceConfidence??refined.confidence??0)};
}

/** Preserve saturated lettering in dark menus; remove long rules from a text crop. */
export function enhanceDarkMenuCrop(rgba:Uint8ClampedArray,width:number,height:number,removeRules=true):Uint8ClampedArray {
 let dark=0;for(let i=0;i<rgba.length;i+=4)if(Math.max(rgba[i],rgba[i+1],rgba[i+2])<100)dark++;
 if(dark<width*height*.55)return rgba;
 const result=new Uint8ClampedArray(rgba.length);
 for(let i=0;i<rgba.length;i+=4){const value=255-Math.max(rgba[i],rgba[i+1],rgba[i+2]);result[i]=result[i+1]=result[i+2]=value;result[i+3]=255;}
 if(removeRules)for(let y=0;y<height;y++){
  let start=-1;
  for(let x=0;x<=width;x++){
   const ink=x<width&&result[(y*width+x)*4]<100;
   if(ink&&start<0)start=x;
   if(!ink&&start>=0){if(x-start>width*.12)for(let xx=start;xx<x;xx++){const i=(y*width+xx)*4;result[i]=result[i+1]=result[i+2]=255;}start=-1;}
  }
 }
 return result;
}
