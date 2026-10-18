import {arrangeMenuWords,type ReaderWord} from "./menu-reader-policy.ts";

/** PDF text positions are converted to the same coordinates used by photo review. */
export type PdfTextItem={str:string;width:number;height:number;transform:number[]};
export function pdfMenuLines(items:PdfTextItem[],matrix:number[],scale:number,width:number,height:number){
 const words:ReaderWord[]=[];let length=0;
 for(const item of items){
  const text=item.str.replace(/\s+/g," ").trim();if(!text)continue;
  length+=text.length;if(length>60000)throw Error("Este PDF tem texto demais. Envie uma parte do cardápio por vez.");
  const t=item.transform,x=matrix[0]*t[4]+matrix[2]*t[5]+matrix[4],y=matrix[1]*t[4]+matrix[3]*t[5]+matrix[5];
  const h=Math.max(1,Math.hypot(t[2],t[3])*scale),w=Math.max(1,item.width*scale);
  const box={x0:Math.max(0,Math.min(width-1,x)),y0:Math.max(0,Math.min(height-1,y-h)),x1:Math.min(width,x+w),y1:Math.min(height,y)};
  if(box.x1>box.x0&&box.y1>box.y0)words.push({text,confidence:100,box});
 }
 return arrangeMenuWords(words,width);
}
