import {money,type RestaurantData} from "./domain.ts";
import type {DailyCampaign} from "./daily-campaigns.ts";
function image(url:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Não foi possível carregar a foto. Envie outra foto desse produto."));img.src=url;});}
function text(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,width:number,size:number,maxLines=2){
 let lines:string[]=[];
 do{ctx.font=`800 ${size}px Arial, sans-serif`;lines=[];let row="";for(const word of value.split(/\s+/)){if(row&&ctx.measureText(row+" "+word).width>width){lines.push(row);row=word;}else row+=(row?" ":"")+word;}if(row)lines.push(row);if(lines.length<=maxLines)break;size-=2;}while(size>18);
 lines.slice(0,maxLines).forEach((value,i)=>{let row=value;while(ctx.measureText(row).width>width&&row.length>1)row=row.slice(0,-2);if(row!==value||i===maxLines-1&&lines.length>maxLines)row=row.slice(0,-1)+"…";ctx.fillText(row,x,y+i*size*1.15);});
}
/** Compose the owner's existing product photos locally; values stay editable text. */
export async function renderDailyCampaign(data:RestaurantData,campaign:DailyCampaign,menuPath:string,format:"square"|"story"){
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=format==="story"?1920:1080;const ctx=canvas.getContext("2d");if(!ctx)throw Error("Não foi possível montar a arte neste navegador.");
 const height=canvas.height,pad=64;ctx.textBaseline="top";ctx.fillStyle="#181e1a";ctx.fillRect(0,0,1080,height);ctx.fillStyle="#fff9ec";text(ctx,data.name,pad,55,952,36,2);ctx.fillStyle="#ffd382";text(ctx,"DESTAQUE DO DIA",pad,139,952,23,1);
 const top=195,photoHeight=format==="story"?895:385,photos=await Promise.all(campaign.photos.slice(0,2).map(image));
 if(photos.length){const gap=14,width=(952-gap*(photos.length-1))/photos.length;photos.forEach((img,i)=>{const x=pad+i*(width+gap),scale=Math.max(width/img.width,photoHeight/img.height);ctx.save();ctx.beginPath();ctx.roundRect(x,top,width,photoHeight,24);ctx.clip();ctx.drawImage(img,x+(width-img.width*scale)/2,top+(photoHeight-img.height*scale)/2,img.width*scale,img.height*scale);ctx.restore();});}
 else{ctx.fillStyle=data.accent;ctx.fillRect(pad,top,952,photoHeight);ctx.fillStyle="#fff";text(ctx,"Hoje é dia de pizza",pad+38,top+photoHeight/3,876,70,2);}
 const titleY=top+photoHeight+35;ctx.fillStyle="#fff9ec";text(ctx,campaign.headline,pad,titleY,952,52,2);ctx.fillStyle="#ece0c8";text(ctx,campaign.detail,pad,titleY+130,952,30,2);ctx.fillStyle="#ffd382";text(ctx,money(campaign.price),pad,height-213,952,86,1);ctx.fillStyle="#f2e4cd";text(ctx,"Peça pelo nosso cardápio · Entrega à parte",pad,height-103,952,25,1);text(ctx,menuPath+" · "+campaign.day.split("-").reverse().slice(0,2).join("/"),pad,height-58,952,23,1);
 return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("Não foi possível baixar a arte.")),"image/png"));
}
