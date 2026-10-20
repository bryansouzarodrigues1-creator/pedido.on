import type {ReaderPage} from "./menu-reader-policy.ts";
import {pdfMenuLines,type PdfTextItem} from "./menu-pdf-layout.ts";
import {MENU_PDF_READER_VERSION} from "./menu-pdf-source.ts";

/** Lazy, browser-only PDF.js. Files and pixels stay on the owner's device. */
export async function prepareMenuPdf(file:File,remaining=8,onProgress?:(label:string)=>void):Promise<ReaderPage[]>{
 if(remaining<1)throw Error("Esta leitura já tem 8 páginas. Remova uma página ou importe outra parte depois.");
 if(file.size>15*1024*1024)throw Error("Envie um PDF de até 15 MB.");
 const data=new Uint8Array(await file.arrayBuffer());
 if(!new TextDecoder().decode(data.slice(0,1024)).includes("%PDF-"))throw Error("Este arquivo não é um PDF válido. Exporte o cardápio novamente.");
 const pdfjs=await import("pdfjs-dist");
 const assets=`/pdf/v${pdfjs.version}/`;
 pdfjs.GlobalWorkerOptions.workerSrc=assets+"pdf.worker.min.mjs";
 const task=pdfjs.getDocument({data,isEvalSupported:false,enableXfa:false,cMapUrl:assets+"cmaps/",cMapPacked:true,standardFontDataUrl:assets+"standard_fonts/",wasmUrl:assets+"wasm/"});
 try{
  const pdf=await task.promise;
  if(pdf.numPages>remaining)throw Error(`Há ${pdf.numPages} páginas neste PDF. Envie até ${remaining} páginas nesta leitura.`);
  const pages:ReaderPage[]=[];
  for(let i=1;i<=pdf.numPages;i++){
   onProgress?.(`Abrindo página ${i} de ${pdf.numPages} do PDF…`);
   const page=await pdf.getPage(i),original=page.getViewport({scale:1});
   const scale=Math.min(2.5,2600/Math.max(original.width,original.height),Math.sqrt(4500000/(original.width*original.height)));
   const viewport=page.getViewport({scale}),canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.floor(viewport.width));canvas.height=Math.max(1,Math.floor(viewport.height));
   try{
    const ctx=canvas.getContext("2d");if(!ctx)throw Error("O navegador não conseguiu abrir o PDF.");
    await page.render({canvas,canvasContext:ctx,viewport,background:"rgb(255,255,255)"}).promise;
    const content=await page.getTextContent();
    const items=content.items.filter((v):v is typeof v&PdfTextItem=>"str" in v);
    const extracted=pdfMenuLines(items,viewport.transform,scale,canvas.width,canvas.height);
    // A scanned page may have only a digital header. OCR it rather than losing its products.
    const text=extracted.map(line=>line.text).join("\n");
    const lines=viewport.rotation%360===0&&text.replace(/\s/g,"").length>=30&&/(?:R\s*\$\s*\d|\d+[,.]\d{2})/.test(text)?extracted:[];
    pages.push({id:crypto.randomUUID(),name:`${file.name.slice(0,75)} · p. ${i}`,image:canvas.toDataURL("image/jpeg",.92),width:canvas.width,height:canvas.height,lines,pdfReaderVersion:MENU_PDF_READER_VERSION});
   }finally{canvas.width=canvas.height=0;page.cleanup();}
  }
  return pages;
 }catch(e){
  if(e instanceof Error&&e.name==="PasswordException")throw Error("Este PDF tem senha. Envie uma cópia sem senha ou fotos do cardápio.");
  if(e instanceof Error&&e.name==="InvalidPDFException")throw Error("Não consegui abrir este PDF. Exporte novamente ou envie fotos do cardápio.");
  throw e;
 }finally{await task.destroy();}
}
