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
 const height=canvas.height,pad=64,story=format==="story";ctx.textBaseline="top";
 const background=ctx.createLinearGradient(0,0,1080,height);background.addColorStop(0,"#171b15");background.addColorStop(.6,"#29251b");background.addColorStop(1,"#121710");ctx.fillStyle=background;ctx.fillRect(0,0,1080,height);
 ctx.save();ctx.globalAlpha=.13;ctx.fillStyle=data.accent;ctx.beginPath();ctx.arc(1060,80,600,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.fillStyle="#fff9ec";text(ctx,data.name,pad,55,952,36,2);ctx.fillStyle="#ffd382";text(ctx,"UMA BOA PEDIDA DA CASA",pad,139,952,23,1);
 const top=195,photoHeight=story?895:420,photos=await Promise.all(campaign.photos.slice(0,2).map(image));
 if(photos.length){const gap=14,width=(952-gap*(photos.length-1))/photos.length;photos.forEach((img,i)=>{const x=pad+i*(width+gap),scale=Math.max(width/img.width,photoHeight/img.height);ctx.save();ctx.beginPath();ctx.roundRect(x,top,width,photoHeight,24);ctx.clip();ctx.drawImage(img,x+(width-img.width*scale)/2,top+(photoHeight-img.height*scale)/2,img.width*scale,img.height*scale);ctx.restore();});}
 else{const fill=ctx.createLinearGradient(pad,top,1016,top+photoHeight);fill.addColorStop(0,data.accent);fill.addColorStop(1,"#722d1e");ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(pad,top,952,photoHeight,24);ctx.fill();ctx.save();ctx.globalAlpha=.1;ctx.strokeStyle="#fff9ec";ctx.lineWidth=18;for(const radius of [120,210,300]){ctx.beginPath();ctx.arc(850,top+photoHeight/2,radius,0,Math.PI*2);ctx.stroke();}ctx.restore();ctx.fillStyle="#fff9ec";text(ctx,"SEU SABOR\nEM DESTAQUE".replace("\n"," "),pad+38,top+photoHeight/3,740,72,2);}
 const titleY=top+photoHeight+28;ctx.fillStyle="#fff9ec";text(ctx,campaign.headline,pad,titleY,952,story?65:50,2);ctx.fillStyle="#d9d7c9";text(ctx,campaign.detail,pad,titleY+(story?170:124),952,story?34:26,2);
 const priceY=story?height-355:height-215;ctx.fillStyle="#ffd382";text(ctx,money(campaign.price),pad,priceY,952,story?112:86,1);
 if(story){ctx.fillStyle="#405137";ctx.beginPath();ctx.roundRect(pad,height-195,952,68,34);ctx.fill();ctx.fillStyle="#fff9ec";text(ctx,"ESCOLHA NO CARDÁPIO. FAÇA SEU PEDIDO.",pad+28,height-174,896,27,1);}
 ctx.fillStyle="#f2e4cd";const delivery=data.deliveryEnabled?"Entrega à parte · confira a taxa no cardápio":data.pickupEnabled?"Retirada na loja · confira o endereço":"Consulte a disponibilidade com a loja";text(ctx,story?delivery:"Peça pelo nosso cardápio · "+(data.deliveryEnabled?"Entrega à parte":"Retirada na loja"),pad,height-103,952,story?26:23,1);ctx.fillStyle="#aaa99a";text(ctx,menuPath+" · "+campaign.day.split("-").reverse().slice(0,2).join("/"),pad,height-58,952,23,1);
 return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("Não foi possível baixar a arte.")),"image/png"));
}
