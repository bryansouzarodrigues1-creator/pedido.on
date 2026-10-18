import {arrangeMenuWords,type ReaderPage,type ReaderLine} from "./menu-reader-policy.ts";
import {reconcileOcrLine,enhanceDarkMenuCrop,chooseMenuOcrReading} from "./menu-ocr-refinement.ts";
const MAX_SOURCE_BYTES=15*1024*1024,MAX_PIXELS=4500000,MAX_EDGE=2600;
export function abortable<T>(promise:Promise<T>,signal:AbortSignal){return new Promise<T>((resolve,reject)=>{if(signal.aborted){reject(signal.reason);return;}const cancel=()=>reject(signal.reason);signal.addEventListener("abort",cancel,{once:true});promise.then(value=>{signal.removeEventListener("abort",cancel);resolve(value);},error=>{signal.removeEventListener("abort",cancel);reject(error);});});}
export async function prepareMenuPhoto(file:File):Promise<ReaderPage>{
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>MAX_SOURCE_BYTES)throw Error("Envie JPG, PNG ou WebP com até 15 MB por foto.");
  const url=URL.createObjectURL(file);
  try{
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Não foi possível abrir esta foto."));img.src=url;});
    const ratio=Math.min(1,MAX_EDGE/Math.max(image.naturalWidth,image.naturalHeight),Math.sqrt(MAX_PIXELS/(image.naturalWidth*image.naturalHeight)));
    const canvas=document.createElement("canvas");canvas.width=Math.round(image.naturalWidth*ratio);canvas.height=Math.round(image.naturalHeight*ratio);
    const ctx=canvas.getContext("2d");if(!ctx)throw Error("O navegador não conseguiu preparar a foto.");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    return {id:crypto.randomUUID(),name:file.name.slice(0,100),image:canvas.toDataURL("image/jpeg",.92),width:canvas.width,height:canvas.height,lines:[]};
  }finally{URL.revokeObjectURL(url);}
}
export async function rotateMenuPhoto(page:ReaderPage):Promise<ReaderPage>{
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=page.image;});
  const canvas=document.createElement("canvas");canvas.width=page.height;canvas.height=page.width;const ctx=canvas.getContext("2d")!;ctx.translate(canvas.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(image,0,0);
  return {...page,image:canvas.toDataURL("image/jpeg",.92),width:canvas.width,height:canvas.height,lines:[]};
}
export async function recognizeMenuPhotos(pages:ReaderPage[],signal:AbortSignal,onProgress:(progress:number,label:string)=>void,onPage?:(page:ReaderPage)=>Promise<void>){
  signal.throwIfAborted();const {createWorker,OEM,PSM}=await import("tesseract.js");signal.throwIfAborted();
  let index=0,refining=false;
  const loading=createWorker("por",OEM.LSTM_ONLY,{workerPath:"/ocr/v7/worker.min.js",corePath:"/ocr/v7",langPath:"/ocr/v7",workerBlobURL:false,logger:m=>{if(!signal.aborted&&!refining)onProgress(m.status==="recognizing text"?(index+m.progress*.75)/pages.length:0,m.status==="recognizing text"?`Lendo foto ${index+1} de ${pages.length}`:"Preparando o leitor no aparelho…");}});
  void loading.then(worker=>{if(signal.aborted)void worker.terminate().catch(()=>{});}).catch(()=>{});
  const worker=await abortable(loading,signal);
  const cancel=()=>{void worker.terminate().catch(()=>{});};signal.addEventListener("abort",cancel,{once:true});
  try{
    signal.throwIfAborted();await abortable(worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK,preserve_interword_spaces:"1"}),signal);
    const result:ReaderPage[]=[];
    for(index=0;index<pages.length;index++){
      signal.throwIfAborted();const page=pages[index];refining=false;
      // Automatic segmentation suppresses the food-photo texture on phone screenshots.
      await abortable(worker.setParameters({tessedit_pageseg_mode:page.height/page.width>1.6?PSM.AUTO:PSM.SINGLE_BLOCK,user_defined_dpi:"300"}),signal);
      const {data}=await abortable(worker.recognize(page.image,{rotateAuto:true},{text:true,blocks:true}),signal);signal.throwIfAborted();
      const words=data.blocks?.flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines.flatMap(line=>line.words.map(word=>({text:word.text,confidence:word.confidence,box:word.bbox})))));
      let lines:ReaderLine[]=words?.length?arrangeMenuWords(words,page.width):data.text.split("\n").map(text=>({text}));
      // Bounded re-read of uncertain prices, using only local pixels and the
      // same worker. Conflicting readings stay unselected for owner review.
      if(Math.abs(data.rotateRadians||0)<=.001){
       const image=await abortable(new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Não foi possível conferir a foto."));img.src=page.image;}),signal);
       const contrast=document.createElement("canvas");contrast.width=page.width;contrast.height=page.height;
       const contrastCtx=contrast.getContext("2d");
       if(contrastCtx){
        contrastCtx.drawImage(image,0,0);const pixels=contrastCtx.getImageData(0,0,page.width,page.height),enhanced=enhanceDarkMenuCrop(pixels.data,page.width,page.height,false);
        if(enhanced!==pixels.data){
         refining=true;pixels.data.set(enhanced);contrastCtx.putImageData(pixels,0,0);
         onProgress((index+.76)/pages.length,`Melhorando o contraste da foto ${index+1}`);
         const {data:alternative}=await abortable(worker.recognize(contrast.toDataURL("image/png"),{rotateAuto:false},{text:true,blocks:true}),signal);
         const aw=alternative.blocks?.flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words.map(w=>({text:w.text,confidence:w.confidence,box:w.bbox})))));
         const alternativeLines=aw?.length?arrangeMenuWords(aw,page.width):[];
         lines=chooseMenuOcrReading(lines,alternativeLines,page.id);
        }
       }
       const uncertain=lines.filter(line=>line.box&&/R\s*\$\s*\d|\d+[,.]\d{2}/i.test(line.text)&&((line.priceConfidence??100)<75||(line.confidence??100)<75)).slice(0,12);
       if(uncertain.length){
        refining=true;
        await abortable(worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_LINE,preserve_interword_spaces:"1",user_defined_dpi:"300"}),signal);
        for(let j=0;j<uncertain.length;j++){
         signal.throwIfAborted();const line=uncertain[j],box=line.box!;
         const left=Math.max(0,box.x0-5),top=Math.max(0,box.y0-5),width=Math.min(page.width-left,box.x1-left+5),height=Math.min(page.height-top,box.y1-top+5),scale=Math.min(3,80/height);
         if(width<=0||height<=0)continue;
         const canvas=document.createElement("canvas");canvas.width=Math.ceil(width*scale)+20;canvas.height=Math.ceil(height*scale)+20;
         const ctx=canvas.getContext("2d");if(!ctx)continue;
         ctx.drawImage(image,left,top,width,height,10,10,width*scale,height*scale);
         const pixels=ctx.getImageData(10,10,canvas.width-20,canvas.height-20);
         pixels.data.set(enhanceDarkMenuCrop(pixels.data,pixels.width,pixels.height));ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.putImageData(pixels,10,10);
         const {data:detail}=await abortable(worker.recognize(canvas.toDataURL("image/png"),{rotateAuto:false},{text:true,blocks:true}),signal);
         const detailWords=detail.blocks?.flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words.map(w=>({text:w.text,confidence:w.confidence,box:w.bbox})))));
         const candidate=detailWords?.length?arrangeMenuWords(detailWords,canvas.width):[];
         if(candidate.length===1)Object.assign(line,reconcileOcrLine(line,candidate[0]));
         onProgress((index+.75+.24*(j+1)/uncertain.length)/pages.length,`Conferindo preços da foto ${index+1}`);
        }
       }
      }
      // OCR may deskew its working image; only draw exact boxes on an unrotated source.
      if(Math.abs(data.rotateRadians||0)>.001)for(const line of lines)delete line.box;
      const scanned={...page,lines};result.push(scanned);if(onPage)await onPage(scanned);onProgress((index+1)/pages.length,`Foto ${index+1} lida`);
    }
    return result;
  }finally{signal.removeEventListener("abort",cancel);await worker.terminate().catch(()=>{});}
}
