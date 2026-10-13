import {z} from "zod";
import {restaurantSchema,type RestaurantData,type Product,type Size} from "./domain.ts";

export type SourceBox={x0:number;y0:number;x1:number;y1:number};
export type ReaderLine={text:string;confidence?:number;box?:SourceBox};
export type ReaderWord={text:string;confidence:number;box:SourceBox};
export type ReaderPage={id:string;name:string;image:string;width:number;height:number;lines:ReaderLine[]};
const amount=z.number().int().min(1).max(1000000).nullable();
export const readerItemSchema=z.object({id:z.string().max(100),sourceId:z.string().max(100),sourceText:z.string().max(2000),box:z.object({x0:z.number(),y0:z.number(),x1:z.number(),y1:z.number()}).optional(),name:z.string().max(100),description:z.string().max(600),category:z.string().max(60),kind:z.enum(["pizza","simple","crust"]),price:amount,sizes:z.object({p:amount,m:amount,g:amount}),issues:z.array(z.string().max(180)).max(12),selected:z.boolean(),action:z.enum(["add","update"]),existingId:z.string().max(80).optional(),image:z.string().regex(/^\/media\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/).optional()});
export type ReaderItem=z.infer<typeof readerItemSchema>;
export type ReaderResult={items:ReaderItem[];unmatched:{sourceId:string;text:string}[];pages:number};
export const normalizeMenuText=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
export function menuAmount(s:string){
  const clean=s.replace(/R\s*\$/gi,"").trim();
  if(!/^\d{1,6}(?:\.\d{3})*(?:[,.]\d{2})?$/.test(clean))return null;
  const decimal=clean.includes(",")?clean.replace(/\./g,"").replace(",","."):/^\d+\.\d{2}$/.test(clean)?clean:clean.replace(/\./g,"");
  const cents=Math.round(Number(decimal)*100);
  return Number.isInteger(cents)&&cents>0&&cents<=1000000?cents:null;
}
const priceRE=/(?:R\s*\$\s*\d{1,6}(?:\.\d{3})*(?:[,.]\d{2})?|\b\d{1,6}(?:\.\d{3})*[,.]\d{2}\b)/gi;
const sizesIn=(s:string)=>[...normalizeMenuText(s).matchAll(/\b(pequena|pequeno|media|medio|grande|p|m|g)\b/g)].map(m=>({size:({pequena:"p",pequeno:"p",media:"m",medio:"m",grande:"g",p:"p",m:"m",g:"g"} as const)[m[1] as "p"],index:m.index!}));
function categoryFor(s:string):{category:string;kind:ReaderItem["kind"]}|null{
  const n=normalizeMenuText(s).replace(/[^a-z ]/g,"").trim();
  if(/^(pizzas? (salgadas?|tradicionais?|especiais?)|pizzas?|sabores)$/.test(n))return {category:"Pizzas",kind:"pizza"};
  if(/^(pizzas? doces?|doces)$/.test(n))return {category:"Pizzas doces",kind:"pizza"};
  if(/^(bebidas?|refrigerantes?|sucos?|cervejas?)$/.test(n))return {category:"Bebidas",kind:"simple"};
  if(/^(combos?|combos? da casa)$/.test(n))return {category:"Combos",kind:"simple"};
  if(/^(bordas?( recheadas?)?|adicionais? de borda)$/.test(n))return {category:"Bordas",kind:"crust"};
  return null;
}
function union(a?:SourceBox,b?:SourceBox){return !a?b:!b?a:{x0:Math.min(a.x0,b.x0),y0:Math.min(a.y0,b.y0),x1:Math.max(a.x1,b.x1),y1:Math.max(a.y1,b.y1)};}
export function arrangeMenuWords(words:ReaderWord[],width:number):ReaderLine[]{
  // Keep prices with their row and preserve parallel menu columns using word positions.
  const rows:{y:number;height:number;words:ReaderWord[]}[]=[];
  for(const word of words.filter(w=>w.text.trim()).sort((a,b)=>(a.box.y0+a.box.y1)-(b.box.y0+b.box.y1))){
    const y=(word.box.y0+word.box.y1)/2,height=word.box.y1-word.box.y0;
    let row=rows.findLast(r=>Math.abs(r.y-y)<=Math.max(6,Math.min(r.height,height)*.55));
    if(!row){row={y,height,words:[]};rows.push(row);}row.words.push(word);row.height=Math.max(row.height,height);
  }
  // Photos sometimes produce isolated low-confidence letters next to a good
  // product row. Keep uncertain text and distant prices, but exclude those
  // detached non-price fragments from the product text and its source box.
  for(const row of rows){
    const chunks:ReaderWord[][]=[];
    for(const word of row.words.sort((a,b)=>a.box.x0-b.box.x0)){
      const last=chunks.at(-1);
      if(!last||word.box.x0-last.at(-1)!.box.x1>Math.max(32,width*.035))chunks.push([word]);else last.push(word);
    }
    if(chunks.some(chunk=>chunk.some(w=>w.confidence>=75)))row.words=chunks.flatMap(chunk=>{
      const text=chunk.map(w=>w.text).join(" ");
      const meaningfulPrice=!!text.match(priceRE)||/^[PMG]$/i.test(text.trim());
      return chunk.every(w=>w.confidence<55)&&!meaningfulPrice?[]:chunk;
    });
  }
  const boundaries:number[]=[];
  for(const row of rows){
    const chunks:ReaderWord[][]=[];
    for(const word of row.words.sort((a,b)=>a.box.x0-b.box.x0)){const last=chunks.at(-1);if(!last||word.box.x0-last.at(-1)!.box.x1>Math.max(80,width*.09))chunks.push([word]);else last.push(word);}
    const headings=chunks.filter(chunk=>!!categoryFor(chunk.map(w=>w.text).join(" ")));
    if(headings.length>=2)for(let i=1;i<headings.length;i++){const x=(headings[i-1].at(-1)!.box.x1+headings[i][0].box.x0)/2;if(!boundaries.some(b=>Math.abs(b-x)<width*.1))boundaries.push(x);}
  }
  boundaries.sort((a,b)=>a-b);
  const columns:ReaderLine[][]=Array.from({length:boundaries.length+1},()=>[]);
  for(const row of rows){
    const segments:ReaderWord[][]=Array.from({length:columns.length},()=>[]);
    for(const word of row.words){const x=(word.box.x0+word.box.x1)/2;segments[boundaries.filter(b=>x>b).length].push(word);}
    for(let i=0;i<segments.length;i++){const segment=segments[i].sort((a,b)=>a.box.x0-b.box.x0);if(!segment.length)continue;columns[i].push({text:segment.map(w=>w.text).join(" "),confidence:segment.reduce((sum,w)=>sum+w.confidence,0)/segment.length,box:segment.reduce<SourceBox|undefined>((box,w)=>union(box,w.box),undefined)});}
  }
  return columns.flat();
}
export function readMenuPages(pages:Pick<ReaderPage,"id"|"lines">[]):ReaderResult{
  const items:ReaderItem[]=[],unmatched:ReaderResult["unmatched"]=[];
  for(const page of pages){
    let category="Pizzas",kind:ReaderItem["kind"]="pizza",header:Size[]=[],shared:Partial<Record<Size,number>>={},pending:ReaderItem|null=null;
    const flush=()=>{if(pending){if(!pending.name.trim())unmatched.push({sourceId:page.id,text:pending.sourceText});else{if(pending.kind==="pizza"&&!Object.values(pending.sizes).some(Boolean))pending.issues.push(pending.price?"Escolha o tamanho desse preço.":"Confira o preço e o tamanho.");if(pending.kind!=="pizza"&&!pending.price)pending.issues.push("Informe o preço.");items.push(pending);}pending=null;}};
    for(const raw of page.lines){
      const text=raw.text.replace(/\s+/g," ").trim();if(!text)continue;
      const norm=normalizeMenuText(text),matches=[...text.matchAll(priceRE)],prices=matches.map(m=>menuAmount(m[0])),labels=sizesIn(text);
      const section=categoryFor(text);
      if(section){flush();({category,kind}=section);header=[];shared={};continue;}
      if(/\b(promocao|promocoes|oferta|ofertas)\b/.test(norm)){flush();unmatched.push({sourceId:page.id,text:"Oferta da foto: "+text});continue;}
      if(/^(whatsapp|telefone|contato|endereco|rua |av\.|avenida|pix|delivery|entrega|taxa |horario|funcionamento|aberto|peca|pedido|minimo|instagram|www\.|@)/.test(norm)||/\(?\d{2}\)?\s*9?\d{4}[- ]\d{4}/.test(norm)){flush();unmatched.push({sourceId:page.id,text});continue;}
      const unsupported=/\b(gg|familia|gigante|brotinho)\b|\b\d{2}\s*cm\b/.test(norm);
      if(!matches.length&&labels.length&&/^(sabores?|tamanhos?|pequena|pequeno|media|medio|grande|p\b|m\b|g\b)/.test(norm)){flush();header=labels.map(v=>v.size);if(unsupported)unmatched.push({sourceId:page.id,text:"Tamanho a conferir: "+text});continue;}
      if(matches.length&&/^(todas|todos|qualquer sabor|preco unico|pizzas? (grandes?|medias?|pequenas?))/.test(norm)){
        flush();shared={};if(labels.length===prices.length)labels.forEach((v,i)=>{if(prices[i])shared[v.size]=prices[i]!;});else unmatched.push({sourceId:page.id,text:"Preço compartilhado a conferir: "+text});continue;
      }
      const before=matches.length?text.slice(0,matches[0].index).replace(/\b(?:P|M|G|pequena|média|grande)\s*[-:·]?\s*$/i,"").replace(/[.\-:·|\s]+$/g,""):text;
      const name=before.replace(/^\d{1,3}\s*[.)\-:]\s*/,"").trim();
      const ingredients=/^(ingredientes?\s*:|molho\b|mucarela\b|mozzarella\b|queijo\b|tomate\b|massa\b)/.test(norm)||!matches.length&&text.includes(",");
      if(pending&&ingredients&&!matches.length){pending.description=(pending.description?pending.description+" ":"")+text.replace(/^ingredientes?\s*:\s*/i,"");pending.description=pending.description.slice(0,600);pending.sourceText=(pending.sourceText+"\n"+text).slice(0,2000);pending.box=union(pending.box,raw.box);continue;}
      if(matches.length&&!name&&pending){
        pending.sourceText=(pending.sourceText+"\n"+text).slice(0,2000);pending.box=union(pending.box,raw.box);
      }else{
        flush();
        if(name.length<2||/^[\d\s,.R$PMGr$|:-]+$/.test(name)){unmatched.push({sourceId:page.id,text});continue;}
        pending={id:`${page.id}-${items.length}`,sourceId:page.id,sourceText:text.slice(0,2000),box:raw.box,name:name.slice(0,100),description:"",category,kind,price:null,sizes:{p:shared.p??null,m:shared.m??null,g:shared.g??null},issues:[],selected:true,action:"add"};
      }
      if(raw.confidence!==undefined&&raw.confidence<75)pending!.issues.push("Confira a leitura deste trecho.");
      if(unsupported){pending!.issues.push("Tamanho fora de P/M/G: confirme o tamanho no editor.");pending!.selected=false;}
      if(matches.length){
        if(kind!=="pizza")pending!.price=prices.length===1?prices[0]:null;
        else if(labels.length===prices.length)labels.forEach((v,i)=>{pending!.sizes[v.size]=prices[i];});
        else if(header.length===prices.length)header.forEach((v,i)=>{pending!.sizes[v]=prices[i];});
        else if(prices.length===1)pending!.price=prices[0];
        else pending!.issues.push("Vários preços sem tamanhos claros: confira na foto.");
        if(prices.some(v=>v===null))pending!.issues.push("Há um preço ilegível.");
      }
    }
    flush();
  }
  return {items,unmatched,pages:pages.length};
}
export function readerItemReady(item:ReaderItem){return item.name.trim().length>=2&&item.category.trim().length>=2&&(item.kind==="pizza"?Object.values(item.sizes).some(v=>v!==null&&v>0):!!item.price&&item.price>0);}
export function prepareReaderItems(items:ReaderItem[],data:RestaurantData,options:{preserveSelection?:boolean}={}){
 return items.map(item=>{
  const entries=item.kind==="crust"?data.crusts:data.products;
  const existing=item.existingId?entries.find(v=>v.id===item.existingId):entries.find(v=>normalizeMenuText(v.name)===normalizeMenuText(item.name));
  const issues=[...new Set(item.issues)].slice(0,12);
  if(item.existingId&&!existing)return {...item,selected:false,issues:[...new Set(["O item original mudou ou foi removido. Confira no editor antes de importar.",...issues])].slice(0,12)};
  return {...item,issues,...(existing?{existingId:existing.id,selected:!!options.preserveSelection&&item.action==="update"&&item.existingId===existing.id&&item.selected,action:"update" as const,issues:[...new Set(["Já cadastrado: marque somente se quiser atualizar.",...issues])].slice(0,12)}:{})};
 });
}
/** Leave every skipped item available, including valid prices and intentional updates. */
export function remainingReaderItems(items:ReaderItem[],after:RestaurantData){return prepareReaderItems(items.filter(item=>!item.selected),after,{preserveSelection:true});}
/** The reader may clear selected rows only after the draft write is acknowledged. */
export async function importReaderItems(data:RestaurantData,items:ReaderItem[],persist:(patch:Partial<RestaurantData>)=>void|Promise<void>,makeId=()=>crypto.randomUUID()){
 const patch=applyReaderItems(data,items,makeId);
 await persist(patch);
 return {patch,remaining:remainingReaderItems(items,{...data,...patch})};
}
export function reconcileReaderReview(previous:ReaderItem[],recognized:ReaderItem[],data:RestaurantData){
 const restored=recognized.map(item=>{
  const before=previous.find(v=>v.id===item.id&&v.sourceId===item.sourceId&&v.sourceText===item.sourceText);
  return before?{...before,box:item.box,issues:[...new Set([...item.issues,...before.issues])].slice(0,12)}:item;
 });
 return prepareReaderItems(restored,data,{preserveSelection:true}).map(item=>({...item,selected:item.selected&&readerItemReady(item)}));
}
export function applyReaderItems(data:RestaurantData,items:ReaderItem[],makeId=()=>crypto.randomUUID()):Partial<RestaurantData>{
  const selected=items.filter(v=>v.selected);if(!selected.length)throw Error("Escolha pelo menos um item.");
  if(selected.some(v=>!readerItemReady(v)))throw Error("Confira os nomes, preços e tamanhos dos itens selecionados.");
  const categories=data.categories.map(v=>({...v})),products=data.products.map(v=>({...v,sizes:{...v.sizes}})),crusts=data.crusts.map(v=>({...v}));
  const handled=new Set<string>();
  for(const item of selected){
    const key=item.kind+":"+normalizeMenuText(item.name);if(handled.has(key))throw Error("O mesmo item aparece mais de uma vez. Escolha uma versão para importar.");handled.add(key);
    if(item.kind==="crust"){
      const current=item.existingId?crusts.find(v=>v.id===item.existingId):crusts.find(v=>normalizeMenuText(v.name)===normalizeMenuText(item.name));
      if(current&&item.action!=="update")throw Error("Uma borda já está cadastrada. Confira a atualização.");
      if(item.action==="update"&&!current)throw Error("A borda mudou durante a leitura. Confira novamente.");
      if(current){current.name=item.name.trim();current.price=item.price!;}else crusts.push({id:makeId(),name:item.name.trim(),price:item.price!});continue;
    }
    let category=categories.find(v=>normalizeMenuText(v.name)===normalizeMenuText(item.category));if(!category){category={id:makeId(),name:item.category.trim()};categories.push(category);}
    const current=item.existingId?products.find(v=>v.id===item.existingId):products.find(v=>normalizeMenuText(v.name)===normalizeMenuText(item.name));
    if(current&&item.action!=="update")throw Error("Um produto já está cadastrado. Confira a atualização.");
    if(item.action==="update"&&!current)throw Error("O produto mudou durante a leitura. Confira novamente.");
    const fields={name:item.name.trim(),categoryId:category.id,description:item.description,kind:item.kind,price:item.kind==="simple"?item.price!:0,sizes:{p:item.sizes.p||0,m:item.sizes.m||0,g:item.sizes.g||0}};
    if(current){Object.assign(current,fields);if(item.image)current.image=item.image;}else products.push({id:makeId(),...fields,image:item.image||"",enabled:true,featured:false} as Product);
  }
  if(products.length>200)throw Error("Seu cardápio pode ter até 200 produtos. Selecione menos itens nesta importação.");
  if(categories.length>20)throw Error("Use até 20 categorias. Reaproveite as categorias cadastradas.");
  if(crusts.length>12)throw Error("Use até 12 bordas recheadas.");
  const patch={categories,products,crusts};restaurantSchema.parse({...data,...patch});return patch;
}
