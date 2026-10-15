import type {PromotionArt} from "./promotion-art";
type Format="square"|"story";
function loadImage(url:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error("Não foi possível abrir a foto. Escolha outro fundo."));image.src=url;});}
function wrap(ctx:CanvasRenderingContext2D,text:string,width:number){const words=text.split(/\s+/),lines:string[]=[];let line="";for(const word of words){if(ctx.measureText(word).width>width){for(const char of word){if(ctx.measureText(line+char).width>width){lines.push(line);line="";}line+=char;}continue;}if(line&&ctx.measureText(line+" "+word).width>width){lines.push(line);line=word;}else line+=(line?" ":"")+word;}if(line)lines.push(line);return lines;}
function block(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,maxHeight:number,size:number,weight=800){let lines:string[]=[];do{ctx.font=`${weight} ${size}px Arial, sans-serif`;lines=wrap(ctx,text,width);if(lines.length*size*1.18<=maxHeight)break;size-=2;}while(size>16);for(const line of lines){ctx.fillText(line,x,y);y+=size*1.18;}return y;}
/** Text and monetary values come from the verified offer, never from model pixels. */
export async function renderPromotion(art:PromotionArt,background:string,format:Format):Promise<Blob>{
 const canvas=document.createElement("canvas"),width=1080,height=format==="story"?1920:1080;canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext("2d");if(!ctx)throw Error("Seu navegador não conseguiu preparar a arte.");
 ctx.fillStyle="#161817";ctx.fillRect(0,0,width,height);
 if(background){const image=await loadImage(background),scale=Math.max(width/image.width,height/image.height);ctx.drawImage(image,(width-image.width*scale)/2,(height-image.height*scale)/2,image.width*scale,image.height*scale);}
 const shade=ctx.createLinearGradient(0,0,0,height);shade.addColorStop(0,"rgba(12,14,12,.97)");shade.addColorStop(.53,background?"rgba(12,14,12,.69)":"rgba(12,14,12,.95)");shade.addColorStop(1,"rgba(12,14,12,.98)");ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
 const pad=76;ctx.textBaseline="top";ctx.fillStyle="#fff";
 let nameX=pad;if(art.logo){const logo=await loadImage(art.logo);ctx.save();ctx.beginPath();ctx.roundRect(pad,64,90,90,18);ctx.clip();ctx.drawImage(logo,pad,64,90,90);ctx.restore();nameX+=116;}
 block(ctx,art.name,nameX,80,width-nameX-pad,80,36,700);
 const top=format==="story"?260:205;ctx.fillStyle=art.accent;ctx.fillRect(pad,top-27,70,7);ctx.fillStyle="#f8ce73";ctx.font="700 24px Arial, sans-serif";ctx.fillText("PROMOÇÃO DO DIA",pad,top);
 ctx.fillStyle="#fff";let y=block(ctx,art.title,pad,top+56,width-pad*2,format==="story"?350:220,format==="story"?92:76);
 if(art.detail){y+=24;ctx.fillStyle="#f0e8db";y=block(ctx,art.detail,pad,y,width-pad*2,format==="story"?280:170,34,500);}
 const footer=height-220,priceY=Math.max(y+40,format==="story"?height-550:height-420);ctx.fillStyle="#f8ce73";block(ctx,art.price,pad,Math.min(priceY,footer-130),width-pad*2,115,100);
 ctx.fillStyle="rgba(255,255,255,.2)";ctx.fillRect(pad,footer-20,width-pad*2,2);ctx.fillStyle="#fff";block(ctx,"Válido até "+art.expires+" · Brasília",pad,footer+12,width-pad*2,44,28,600);
 ctx.fillStyle="#d9d8d0";ctx.font="400 23px Arial, sans-serif";ctx.fillText("Não acumula com cupom.",pad,footer+60);ctx.fillStyle="#f8ce73";ctx.font="700 29px Arial, sans-serif";ctx.fillText("Peça pelo nosso cardápio",pad,footer+106);ctx.fillStyle="#fff";block(ctx,art.menuPath,pad,footer+148,width-pad*2,48,26,500);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("Não foi possível salvar a arte.")),"image/png"));
}
