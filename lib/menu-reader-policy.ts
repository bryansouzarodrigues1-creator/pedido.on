import {z} from "zod";
import {restaurantSchema,type RestaurantData,type Product,type Size} from "./domain.ts";

export type SourceBox={x0:number;y0:number;x1:number;y1:number};
export type ReaderLine={text:string;confidence?:number;priceConfidence?:number;priceDisagreement?:boolean;textUncertain?:boolean;layoutUncertain?:boolean;box?:SourceBox};
export type ReaderWord={text:string;confidence:number;box:SourceBox};
export type ReaderPage={id:string;name:string;image:string;width:number;height:number;lines:ReaderLine[];pdfReaderVersion?:number};
const amount=z.number().int().min(1).max(1000000).nullable();
export const readerItemSchema=z.object({id:z.string().max(100),sourceId:z.string().max(100),sourceText:z.string().max(2000),box:z.object({x0:z.number(),y0:z.number(),x1:z.number(),y1:z.number()}).optional(),name:z.string().max(100),description:z.string().max(600),category:z.string().max(60),kind:z.enum(["pizza","simple","crust"]),price:amount,sizes:z.object({p:amount,m:amount,g:amount}),issues:z.array(z.string().max(180)).max(12),reviewRequired:z.boolean().optional(),selected:z.boolean(),action:z.enum(["add","update"]),existingId:z.string().max(80).optional(),image:z.string().regex(/^\/media\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/).optional()});
export type ReaderItem=z.infer<typeof readerItemSchema>;
export type ReaderResult={items:ReaderItem[];unmatched:{sourceId:string;text:string}[];pages:number};
export const normalizeMenuText=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
// PDF text often puts the cents in a smaller, separate span: "10 ,50".
// Keep the explicit separator and digits; never supply a missing decimal.
export const normalizeMenuPriceSpacing=(s:string)=>s.replace(/(\d)[\t ]+(?=[,.]\d{2}(?!\d))/g,"$1");
export function menuAmount(s:string){
  const clean=normalizeMenuPriceSpacing(s.replace(/R\s*\$/gi,"").trim());
  if(!/^\d{1,6}(?:\.\d{3})*(?:[,.]\d{2})?$/.test(clean))return null;
  const decimal=clean.includes(",")?clean.replace(/\./g,"").replace(",","."):/^\d+\.\d{2}$/.test(clean)?clean:clean.replace(/\./g,"");
  const cents=Math.round(Number(decimal)*100);
  return Number.isInteger(cents)&&cents>0&&cents<=1000000?cents:null;
}
const priceRE=/(?:R\s*\$\s*[-+−]?\s*\d(?:[\d.,]*\d)?(?:[\t ]+[,.]\d{2})?(?![\d.,a-z]|[\t ]+[,.]\d)|(?<![\d.,+−-])[-+−]?\d{1,6}(?:\.\d{3})*[\t ]*[,.]\d{2}(?![\d.,a-z]))/gi;
export const menuLineAmounts=(text:string)=>[...normalizeMenuPriceSpacing(text).matchAll(priceRE)].map(m=>menuAmount(m[0]));
const sizesIn=(s:string)=>[...normalizeMenuText(s).matchAll(/\b(pequena|pequeno|media|medio|grande|gg|familia|gigante|brotinho|p|m|g)\b/g)].map(m=>({size:({pequena:"p",pequeno:"p",media:"m",medio:"m",grande:"g",p:"p",m:"m",g:"g"} as Record<string,Size>)[m[1]]||null,index:m.index!}));
// Public dark-menu examples use catalog SKU IDs such as "M: 118 | G: 218".
 // Those numbers identify variants; they are not amounts and must not enter the product name.
const skuMarker=/(?:^|\s)(?:(?:GG|P|M|G)\s*:\s*\d{3,5})(?:\s*(?:[|/]\s*|\s+)(?:GG|P|M|G)\s*:\s*\d{3,5})*/gi;
function skuSizes(text:string):(Size|null)[]{
 const matches=[...text.matchAll(skuMarker)].flatMap(match=>[...match[0].matchAll(/\b(GG|P|M|G)\s*:\s*\d{3,5}\b/gi)]);
 return matches.map(match=>match[1].toLowerCase()==="gg"?null:match[1].toLowerCase() as Size);
}
function withoutSku(text:string){
 // Small variant codes commonly become M:11816:218 or M:104/6:204.
 // Remove the whole trailing code, never only its first numeric fragment.
 return text.replace(/\s+(?:GG|[PMG]|[wvn]m?)\s*[:;]?\s*\d{3,5}[\d\s:;|/PMGpmg6-]*$/i," ")
  .replace(skuMarker," ").replace(/\s+/g," ").trim();
}
function categoryFor(s:string):{category:string;kind:ReaderItem["kind"]}|null{
  const explicit=s.match(/^Categoria:\s*(.{2,60})\s+\[(pizza|simple|crust)\]$/i);if(explicit)return {category:explicit[1].trim(),kind:explicit[2].toLowerCase() as ReaderItem["kind"]};
  const n=normalizeMenuText(s).replace(/[^a-z ]/g,"").trim();
  if(/^(pizzas? (salgadas?|tradicionais?|especiais?|classicas?)|pizzas?|sabores|salgadas?|classicas?)(?: (?:media|grande|pequena))*$/.test(n))return {category:"Pizzas",kind:"pizza"};
  if(/^(pizzas? doces?|doces)$/.test(n))return {category:"Pizzas doces",kind:"pizza"};
  if(/^(bebidas?|refrigerantes?|sucos?|cervejas?)$/.test(n))return {category:"Bebidas",kind:"simple"};
  if(/^(para refrescar|bebidas e sucos)$/.test(n))return {category:"Bebidas",kind:"simple"};
  if(/^(entradas?|entradas e porcoes?)$/.test(n))return {category:"Entradas",kind:"simple"};
  if(/^(combos?|combos? da casa)$/.test(n))return {category:"Combos",kind:"simple"};
  if(/^(hamburgueres?|hamburguer|hamburgers?|lanches?|sanduiches?)$/.test(n))return {category:"Lanches",kind:"simple"};
  if(/^(produtos?|porcoes?|acompanhamentos?|sobremesas?)$/.test(n))return {category:s.trim(),kind:"simple"};
  if(/^(docinhos extras|doces individuais)$/.test(n))return {category:"Sobremesas",kind:"simple"};
  if(/^(bordas?( recheadas?)?|adicionais? de borda)$/.test(n))return {category:"Bordas",kind:"crust"};
  if(/^(?:r )?bordas especiais$/.test(n))return {category:"Bordas",kind:"crust"};
  if(/^(?:acrescimos|acrescimos na pizza)$/.test(n))return {category:"Adicionais",kind:"simple"};
  if(/^adicionais$/.test(n))return {category:"Adicionais",kind:"simple"};
  return null;
}
function union(a?:SourceBox,b?:SourceBox){return !a?b:!b?a:{x0:Math.min(a.x0,b.x0),y0:Math.min(a.y0,b.y0),x1:Math.max(a.x1,b.x1),y1:Math.max(a.y1,b.y1)};}
const interfaceText=/^(?:pra voltar a pedir|nao aceito com|o preco com desconto|adicionar\b|\d+\s*[+−-]?\s*adicionar\b|deseja (?:uma?|alguma?)|escolha ate|favorit|compartilhar|voltar\b|ver (?:sacola|mais|todos)\b|sacola\b|avaliacoes|mais vendidos)/;
function requireReview(item:ReaderItem,issue:string){item.reviewRequired=true;item.selected=false;if(!item.issues.includes(issue)&&item.issues.length<12)item.issues.push(issue);}
const storeStats=/(?:\b\d+\s*[-–]\s*\d+\s*min\b|\b\d+[,.]\d\s*\(\d+\)|\b\d+\s*avaliacoes\b)/;
const validProductName=(name:string)=>{
 const letters=name.match(/[\p{L}]/gu)?.length||0;
 return letters>=3&&letters/Math.max(1,name.replace(/\s/g,"").length)>.55&&!/[{}<>*=|]/.test(name)&&name.split(/\s+/).length<=16;
};
/** Product explanations frequently occupy a separate PDF text span. A prose
 * sentence must not become a new sellable product simply because a price is
 * printed in the next column or on the following line. */
function descriptionProse(text:string){
 const value=text.trim();if(!value)return false;
 const words=value.split(/\s+/);
 return words.length===1&&/^[a-zà-ú][\p{L}-]*[.!?]$/u.test(value)
  ||words.length>=2&&/^(?:ingredientes?|molho|mussarela|mu[cç]arela|mozzarella|tomate|massa|queijo)\b/i.test(value)
  ||words.length>=2&&/^[a-zà-ú]/u.test(value)
  ||words.length>=3&&/[.!?]\s*$/.test(value)
  ||words.length>=6&&/[,;]/.test(value);
}
/** A product detail screenshot has one base product, not a catalogue of UI labels. */
export function readProductDetail(page:Pick<ReaderPage,"id"|"lines">):ReaderItem|null{
 const lines=page.lines.map(l=>({...l,text:normalizeMenuPriceSpacing(l.text.replace(/\s+/g," ").trim())})).filter(l=>l.text),norms=lines.map(l=>normalizeMenuText(l.text));
 const markers=norms.filter(n=>interfaceText.test(n));if(markers.length<2||!norms.some(n=>/adicionar\b|preco com desconto/.test(n)))return null;
 const optional=norms.findIndex(n=>/^(deseja (?:uma?|alguma?)|escolha ate)/.test(n)),end=optional<0?lines.length:optional;
 let start=0;for(let i=0;i<end;i++)if(storeStats.test(norms[i]))start=i+1;
 const priceIndex=lines.findIndex((line,i)=>i>=start&&i<end&&!interfaceText.test(norms[i])&&!storeStats.test(norms[i])&&/R\s*\$\s*\d+[,.]\d{2}/i.test(line.text));if(priceIndex<0)return null;
 const content=lines.slice(start,priceIndex).filter(line=>(line.confidence===undefined||line.confidence>=60)&&!interfaceText.test(normalizeMenuText(line.text))&&!storeStats.test(normalizeMenuText(line.text)));
 const ingredientIndex=content.findIndex(line=>line.text.includes(",")||/^(pao|molho|ingredientes?|massa)\b/.test(normalizeMenuText(line.text)));
 const headings=(ingredientIndex>=0?content.slice(0,ingredientIndex):content).filter(l=>validProductName(l.text)&&!l.text.match(priceRE));
 const title=start>0?headings[0]:headings.at(-1);if(!title)return null;
 const titleIndex=content.indexOf(title),description=content.slice(titleIndex+1).map(l=>l.text).join(" ").slice(0,600),prices=[...lines[priceIndex].text.matchAll(priceRE)].map(m=>menuAmount(m[0]));
 const titleNorm=normalizeMenuText(title.text),productNorm=normalizeMenuText(title.text+" "+description),merchantNorm=norms.slice(0,start).join(" ");
 const combo=/^(combo|kit|porcao|dupla)\b/.test(titleNorm),drink=!combo&&/\b(refrigerante|guarana|coca[ -]?cola|pepsi|fanta|sprite|suco|agua|cerveja|heineken|brahma|vinho)\b/.test(titleNorm)&&!/^pizza\b/.test(titleNorm);
 const explicitPizza=/^pizza\b|\bbrotinho\b/.test(titleNorm),burger=!explicitPizza&&/hamburguer|burguer|burger|sanduiche|pao artesanal|\bx[ -]?(tudo|salada|bacon)/.test(productNorm);
 const pizzaContext=explicitPizza||/pizz/.test(merchantNorm)||/\b(margherita|marguerita|calabresa|portuguesa|quatro queijos|frango com catupiry)\b/.test(titleNorm);
 const kind:ReaderItem["kind"]=!combo&&!drink&&!burger&&pizzaContext?"pizza":"simple",promotional=norms.some(n=>/voltar a pedir|cupons|preco com desconto/.test(n))||prices.length!==1||(prices[0]||0)<300;
 const relevant=[title,...content.slice(titleIndex+1),lines[priceIndex]],box=relevant.reduce<SourceBox|undefined>((box,line)=>union(box,line.box),undefined);
 const weakPrice=(lines[priceIndex].priceConfidence??lines[priceIndex].confidence??100)<75||lines.slice(start,priceIndex+1).some(l=>l.textUncertain||l.layoutUncertain);
 return {id:page.id+"-detail",sourceId:page.id,sourceText:relevant.map(l=>l.text).join("\n").slice(0,2000),box,name:title.text.slice(0,100),description,category:kind==="pizza"?"Pizzas":drink?"Bebidas":combo?"Combos":burger?"Lanches":"Produtos",kind,price:prices[0]||null,sizes:{p:null,m:null,g:null},issues:[...(promotional?["Este print mostra uma oferta do aplicativo. Defina o preço que sua loja realmente vai praticar."]:[]),...(weakPrice?["Confira o preço: a leitura desse valor tem baixa confiança."]:[]),...(optional>=0?["Bebidas e adicionais opcionais não foram incluídos no produto."]:[]),...(kind==="pizza"?["Escolha o tamanho desse preço."]:[])],reviewRequired:promotional||weakPrice,selected:!promotional&&!weakPrice&&kind!=="pizza",action:"add"};
}
export function arrangeMenuWords(words:ReaderWord[],width:number,options:{digitalPdf?:boolean}={}):ReaderLine[]{
  // Keep prices with their row and preserve parallel menu columns using word positions.
  const rows:{y:number;height:number;words:ReaderWord[]}[]=[];
  for(const word of words.filter(w=>w.text.trim()).sort((a,b)=>a.box.y1-b.box.y1)){
    // Baselines keep large prices, smaller currency symbols and product names
    // together; their vertical centres differ even on the same printed row.
    const y=word.box.y1,height=word.box.y1-word.box.y0;
    let row=rows.findLast(r=>Math.abs(r.y-y)<=Math.max(6,Math.min(r.height,height)*.5));
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
      const meaningfulPrice=!!text.match(priceRE)||/^(?:[PMG]|GG|[-+−]|pequena|pequeno|m[eé]dia|m[eé]dio|grande|fam[ií]lia|gigante|brotinho)$/i.test(text.trim());
      return chunk.every(w=>w.confidence<55)&&!meaningfulPrice?[]:chunk;
    });
  }
  const boundaries:number[]=[];
  // Require repeated named price evidence on both sides. Products in different
  // columns can have staggered baselines; P/M/G prices alone are not evidence.
  const gutters:{left:number;right:number;rows:Set<typeof rows[number]>}[]=[];
  const pricedName=(part:ReaderWord[])=>{
    const text=part.map(w=>w.text).join(" "),price=[...text.matchAll(priceRE)][0];if(!price)return false;
    const name=text.slice(0,price.index).trim();
    return validProductName(name)&&normalizeMenuText(name).replace(/\b(pequena|pequeno|media|medio|grande|gg|familia|gigante|brotinho|p|m|g)\b/g,"").replace(/[^a-z]/g,"").length>=3;
  };
  for(const row of rows){
    const words=row.words.sort((a,b)=>a.box.x0-b.box.x0);
    for(let i=1;i<words.length;i++){
      const left=words[i-1].box.x1,right=words[i].box.x0;if(right-left<Math.max(60,width*.05)||!pricedName(words.slice(0,i))||!pricedName(words.slice(i)))continue;
      const group=gutters.find(g=>Math.max(g.left,left)<Math.min(g.right,right)&&Math.abs(g.left+g.right-left-right)<width*.24);
      if(group){group.left=Math.max(group.left,left);group.right=Math.min(group.right,right);group.rows.add(row);}else gutters.push({left,right,rows:new Set([row])});
    }
  }
  for(const gutter of gutters){
    const boundary=(gutter.left+gutter.right)/2;
    let left=0,right=0;
    if(gutter.rows.size<2)for(const row of rows){
      if(pricedName(row.words.filter(w=>(w.box.x0+w.box.x1)/2<boundary)))left++;
      if(pricedName(row.words.filter(w=>(w.box.x0+w.box.x1)/2>=boundary)))right++;
      if(left>=2&&right>=2)break;
    }
    if(gutter.rows.size>=2||left>=2&&right>=2)boundaries.push(boundary);
  }
  // Digital PDFs of restaurant menus often put names, descriptions and M/G
  // prices on three *different* baselines. The old gutter detector expected
  // names and prices on one line and merged whole side-by-side catalogues.
  // Two independent rows of textual content on opposing halves are enough to
  // identify a persistent column split; a lone mixed row is not.
  if(!boundaries.length&&options.digitalPdf){
    const middle=width/2;
    const named=(part:ReaderWord[])=>{
      const sorted=[...part].sort((a,b)=>a.box.x0-b.box.x0);
      // Two names in the same half can belong to a three-column catalogue.
      // Splitting that page at its midpoint invents a product association.
      if(sorted.some((word,i)=>i>0&&word.box.x0-sorted[i-1].box.x1>=width*.06))return false;
      const value=sorted.map(w=>w.text).join(" ").trim();
      return validProductName(value)&&!value.match(priceRE)&&!categoryFor(value)&&
        (value.match(/[\p{L}]/gu)?.length||0)>=4&&
        !/^(?:R\s*\$|[PMG]\s*(?:[:;]|R\s*\$)|\d)/i.test(value);
    };
    let paired=0;
    for(const row of rows){
      // PDF columns may start only ~1.9% beyond the page midpoint. A 2%
      // exclusion margin silently merged *every* pair in the owner's menu.
      const left=row.words.filter(w=>w.box.x1<=middle-width*.01);
      const right=row.words.filter(w=>w.box.x0>=middle+width*.01);
      if(!left.length||!right.length)continue;
      const gap=Math.min(...right.map(w=>w.box.x0))-Math.max(...left.map(w=>w.box.x1));
      if(gap>=width*.06&&named(left)&&named(right)&&++paired>=2){boundaries.push(middle);break;}
    }
  }
  if(!boundaries.length)for(const row of rows){
    const chunks:ReaderWord[][]=[];
    for(const word of row.words.sort((a,b)=>a.box.x0-b.box.x0)){const last=chunks.at(-1);if(!last||word.box.x0-last.at(-1)!.box.x1>Math.max(80,width*.09))chunks.push([word]);else last.push(word);}
    const headings=chunks.filter(chunk=>!!categoryFor(chunk.map(w=>w.text).join(" ")));
    if(headings.length>=2)for(let i=1;i<headings.length;i++){
      const end= headings[i-1].at(-1)!.box.x1,start=headings[i][0].box.x0;
      // Category titles are shorter than product rows. A midpoint between
      // headings can cut the left column's right-aligned price off and attach
      // it to the next column's product (e.g. drinks next to desserts).
      const x=options.digitalPdf&&end<width/2&&start>width/2?width/2:(end+start)/2;
      if(!boundaries.some(b=>Math.abs(b-x)<width*.1))boundaries.push(x);
    }
  }
  boundaries.sort((a,b)=>a-b);
  const columns:ReaderLine[][]=Array.from({length:boundaries.length+1},()=>[]);
  for(const row of rows){
    const segments:ReaderWord[][]=Array.from({length:columns.length},()=>[]);
    for(const word of row.words){const x=(word.box.x0+word.box.x1)/2;segments[boundaries.filter(b=>x>b).length].push(word);}
    for(let i=0;i<segments.length;i++){
      const segment=segments[i].sort((a,b)=>a.box.x0-b.box.x0);if(!segment.length)continue;
      const text=segment.map(w=>w.text).join(" ").replace(/\bR[sS]\s+(?=\d)/g,"R$ ");
      const matches=[...text.matchAll(priceRE)];let offset=0;
      const positioned=segment.map(w=>{const start=offset;offset+=w.text.length+1;return {...w,start,end:offset-1};});
      // Currency glyph confidence and SKU noise must not mask a confident name
      // or number. Every actual price digit still retains its own confidence.
      const prices=positioned.filter(w=>(/\d/.test(w.text)||/^[-+−]$/.test(w.text))&&matches.some(m=>w.start<m.index!+m[0].length&&w.end>m.index!));
      const prose=positioned.filter(w=>/[\p{L}]{2}/u.test(w.text)&&! /^(?:[wn]m?)[:;]/i.test(w.text)&&(!matches.length||w.start<matches[0].index!));
      const relevant=prose.length?prose:segment;
      columns[i].push({text,confidence:relevant.reduce((sum,w)=>sum+w.confidence,0)/relevant.length,...(prices.length?{priceConfidence:Math.min(...prices.map(w=>w.confidence))}:{}),box:segment.reduce<SourceBox|undefined>((box,w)=>union(box,w.box),undefined)});
    }
  }
  return columns.flat();
}
export function readMenuPages(pages:Pick<ReaderPage,"id"|"lines">[]):ReaderResult{
  const items:ReaderItem[]=[],unmatched:ReaderResult["unmatched"]=[];
  const conflicts=new WeakMap<ReaderItem,Set<Size|"price">>();
  function assignPrice(item:ReaderItem,key:Size|"price",value:number|null){
    const blocked=conflicts.get(item)||new Set<Size|"price">();
    const current=key==="price"?item.price:item.sizes[key];
    if(blocked.has(key))return;
    if(current!==null&&current!==value){blocked.add(key);conflicts.set(item,blocked);requireReview(item,"Preços conflitantes para "+(key==="price"?"este produto":key.toUpperCase())+": confira o valor na fonte.");if(key==="price")item.price=null;else item.sizes[key]=null;return;}
    if(key==="price")item.price=value;else item.sizes[key]=value;
  }
  for(const page of pages){
    const detail=readProductDetail(page);if(detail){items.push(detail);continue;}
    let category="Pizzas",kind:ReaderItem["kind"]="pizza",header:(Size|null)[]=[],headerUnsupported=false,shared:Partial<Record<Size,number>>={},pending:ReaderItem|null=null;
    const flush=()=>{if(pending){
      // A heading/footer has no price evidence; keeping it as a product makes
      // fake, empty cards. Unpriced text remains in the manual-review list.
      const noPrice=!pending.price&&!Object.values(pending.sizes).some(Boolean)&&!pending.sourceText.match(priceRE);
      // Preserve an unmistakable but unpriced drink, accompaniment or combo
      // for the owner's later review ("Água"), without turning page headings,
      // disclaimers and size labels into empty sellable products.
      const reviewableWithoutPrice=pending.kind!=="pizza"&&pending.name.split(/\s+/).length<=5&&
        !/[\d/:;,.!?]/.test(pending.name)&&pending.description.length<90;
      if(!validProductName(pending.name)||noPrice&&!reviewableWithoutPrice)unmatched.push({sourceId:page.id,text:pending.sourceText});
      else{if(pending.kind==="pizza"&&!Object.values(pending.sizes).some(Boolean))pending.issues.push(pending.price?"Escolha o tamanho desse preço.":"Confira o preço e o tamanho.");if(pending.kind!=="pizza"&&!pending.price){pending.issues.push("Informe o preço.");pending.selected=false;}items.push(pending);}pending=null;
    }};
    for(const raw of page.lines){
      const text=normalizeMenuPriceSpacing(raw.text.replace(/\s+/g," ").trim());if(!text)continue;
      const norm=normalizeMenuText(text),matches=[...text.matchAll(priceRE)],prices=matches.map(m=>menuAmount(m[0]));
      if(!matches.length&&/\b(?:exemplo ficticio|valores ilustrativos|fotos geradas para ilustracao|nao representa(?:m)? oferta comercial)\b/.test(norm)){
        flush();unmatched.push({sourceId:page.id,text});continue;
      }
      if(pending&&!matches.length&&raw.box&&pending.box&&descriptionProse(text)&&
        raw.box.y0-pending.box.y1>Math.max(90,(pending.box.y1-pending.box.y0)*.65)){
        // A remote footer, editorial tip or legal notice belongs to the page,
        // not to the last sellable product in that column.
        flush();unmatched.push({sourceId:page.id,text});continue;
      }
      const description=text.match(/^descri[cç][aã]o\s*:\s*(.*)$/i);
      if(pending&&description){pending.description=((pending.description?pending.description+" ":"")+description[1]).slice(0,600);pending.sourceText=(pending.sourceText+"\n"+text).slice(0,2000);pending.box=union(pending.box,raw.box);continue;}
      const labels=sizesIn(matches.length?withoutSku(text.slice(0,matches[0].index))+" "+text.slice(matches[0].index):text);
      if(interfaceText.test(norm)||storeStats.test(norm)){flush();unmatched.push({sourceId:page.id,text});continue;}
      if(raw.confidence!==undefined&&raw.confidence<45&&!matches.length){unmatched.push({sourceId:page.id,text});continue;}
      const section=categoryFor(text);
      if(section){flush();({category,kind}=section);header=labels.map(v=>v.size);headerUnsupported=false;shared={};continue;}
      if(/\b(promocao|promocoes|oferta|ofertas)\b/.test(norm)){flush();unmatched.push({sourceId:page.id,text:"Oferta da foto: "+text});continue;}
       if(!matches.length&&(/^(?:10%\s*opcional|taxa\s*(?:de\s*)?servico|sucos?\s+e|vitaminas?)$/.test(norm)||/\bbordas especiais\b/.test(norm))){flush();unmatched.push({sourceId:page.id,text});continue;}
       
      if(/^(whatsapp|telefone|contato|endereco|rua |av\.|avenida|pix|delivery|entrega|frete\b|taxa |horario|funcionamento|aberto|peca|pedido|minimo|instagram|www\.|@)/.test(norm)||/\(?\d{2}\)?\s*9?\d{4}[- ]\d{4}/.test(norm)){flush();unmatched.push({sourceId:page.id,text});continue;}
      // "Noite em Família" is a combo name, not a forbidden pizza size.
      const unsupported=kind==="pizza"&&/\b(gg|familia|gigante|brotinho)\b|\b\d{2}\s*cm\b/.test(norm);
      if(!matches.length&&labels.length&&/^(sabores?|tamanhos?|pequena|pequeno|media|medio|grande|gg\b|familia\b|gigante\b|brotinho\b|p\b|m\b|g\b)/.test(norm)){flush();header=labels.map(v=>v.size);headerUnsupported=unsupported;if(unsupported)unmatched.push({sourceId:page.id,text:"Tamanho a conferir: "+text});continue;}
      if(matches.length&&/^(todas|todos|qualquer sabor|preco unico|pizzas? (grandes?|medias?|pequenas?))/.test(norm)){
        flush();shared={};if(!unsupported&&labels.length===prices.length)labels.forEach((v,i)=>{if(v.size&&prices[i])shared[v.size]=prices[i]!;});else unmatched.push({sourceId:page.id,text:"Preço compartilhado a conferir: "+text});continue;
      }
      const before=matches.length?text.slice(0,matches[0].index).replace(/\b(?:GG|P|M|G|pequena|média|grande|família|gigante|brotinho)\s*[-:·]?\s*$/i,"").replace(/[+.\-:·|\s]+$/g,""):text;
      const bare=withoutSku(before.replace(/^\d{1,3}\s*[.)\-:]\s*/,"")).trim();
       const unbulleted=bare.replace(/^[•●▪»*]\s+/,"");
       const name=(kind==="pizza"?unbulleted.replace(/^x\s+(?!tudo\b|salada\b|bacon\b|burger\b)/i,"").replace(header.length>=2?/\s+\d{3,5}\s*[|/]\s*\d{3,5}$/:/$^/,""):unbulleted.replace(/^x\s+(?=coca[ -]|[aá]gua\b|refrigerante\b|guaran[aá]\b)/i,"")).trim();
      const ingredients=/^(ingredientes?\s*:|(?:molho|mucarela|mozzarella|queijo|tomate|massa)\s+\S|mussarela\s+(?:e|com)\b)/.test(norm)||!matches.length&&text.includes(",");
      if(pending&&ingredients&&!matches.length){pending.description=(pending.description?pending.description+" ":"")+text.replace(/^ingredientes?\s*:\s*/i,"");pending.description=pending.description.slice(0,600);pending.sourceText=(pending.sourceText+"\n"+text).slice(0,2000);pending.box=union(pending.box,raw.box);continue;}
      const prose=text.slice(0,matches[0]?.index??text.length).trim();
      const markedProduct=skuSizes(text).length>0||/\b(?:GG|[PMG]|[wv]|6)\s*[:;]\s*\d{3,5}\b/i.test(text)||/^(?:[•●▪»*]\s*|x\s+(?=[A-ZÀ-Ü]))/u.test(prose);
      // A new priced accompaniment can begin with an ingredient word:
      // "Tomate-cereja + R$ 6" and "Molho da casa + R$ 4" are products,
      // not descriptions to concatenate onto "Bacon + R$ 8".
      const pricedSimpleName=kind!=="pizza"&&matches.length>0&&prose.split(/\s+/).length<=5&&!/[.!?]\s*$/.test(prose);
      // A combo description can mention "pizza grande" without being a
      // size/price header. Size words are meaningful here only with amounts.
      if(descriptionProse(prose)&&(!matches.length||!labels.length)&&!markedProduct&&!pricedSimpleName){
       if(!pending){
        unmatched.push({sourceId:page.id,text});continue;
       }
       if(pending){
       pending.description=[pending.description,prose].filter(Boolean).join(" ").slice(0,600);
       if(!matches.length){pending.sourceText=(pending.sourceText+"\n"+text).slice(0,2000);pending.box=union(pending.box,raw.box);continue;}
       }
      }
      if(matches.length&&pending&&(!name||descriptionProse(prose)&&!labels.length&&!markedProduct&&!pricedSimpleName)){
        pending.sourceText=(pending.sourceText+"\n"+text).slice(0,2000);pending.box=union(pending.box,raw.box);
      }else{
        flush();
        if(!validProductName(name)||/^[\d\s,.R$PMGr$|:-]+$/.test(name)){unmatched.push({sourceId:page.id,text});continue;}
        const itemKind=kind==="pizza"&&/^(x[ -]?(tudo|salada|bacon|burguer)|hamburguer|sanduiche)\b/.test(normalizeMenuText(name))?"simple":kind;
        pending={id:`${page.id}-${items.length}`,sourceId:page.id,sourceText:text.slice(0,2000),box:raw.box,name:name.slice(0,100),description:"",category:itemKind!==kind?"Lanches":category,kind:itemKind,price:null,sizes:{p:shared.p??null,m:shared.m??null,g:shared.g??null},issues:[],selected:true,action:"add"};
      }
      if(name&&raw.confidence!==undefined&&raw.confidence<75)requireReview(pending!,"Confira a leitura deste trecho.");
      if(matches.length&&raw.priceConfidence!==undefined&&raw.priceConfidence<75)requireReview(pending!,"Confira o preço: a leitura desse valor tem baixa confiança.");
      if(raw.priceDisagreement)requireReview(pending!,"As leituras do preço divergiram. Confira o valor na foto.");
      if(raw.textUncertain)requireReview(pending!,"O PDF contém caracteres ilegíveis neste trecho. Confira o nome e o preço na página.");
      if(raw.layoutUncertain)requireReview(pending!,"Este trecho pode misturar colunas do cardápio. Separe os produtos e confira os preços na página.");
      // An OCR scan may lose the comma in "R$ 11,50" and show "R$ 1150".
      // Do not infer the intended decimal; flag suspicious high integer prices.
      if(matches.some((match,i)=>{
        const token=match[0].replace(/R\s*\$/ig,"").trim();
        const cents=prices[i];
        return cents!==null&&!/[,.]\d{2}$/.test(token)&&cents >= (pending!.kind==="simple"||pending!.kind==="crust"?10000:30000);
      }))requireReview(pending!,"Preço alto sem centavos claros: confira o separador decimal na foto.");
      if(unsupported||pending!.kind==="pizza"&&headerUnsupported)requireReview(pending!,"Tamanho fora de P/M/G: confirme o tamanho no editor.");
      if(matches.length){
        const mixed=matches.some((match,i)=>i>0&&/[\p{L}]{3}/u.test(normalizeMenuText(text.slice(matches[i-1].index!+matches[i-1][0].length,match.index)).replace(/\b(pequena|pequeno|media|medio|grande|gg|familia|gigante|brotinho|p|m|g)\b/g,"")));
        if(mixed)requireReview(pending!,"A linha mistura produtos ou condições de preço. Confira os trechos separados na fonte.");
        else if(pending!.kind!=="pizza"){if(prices.length===1)assignPrice(pending!,"price",prices[0]);else{pending!.price=null;requireReview(pending!,"Vários preços para este produto: confira o valor na fonte.");}}
        else if(labels.length===prices.length)labels.forEach((v,i)=>{if(v.size)assignPrice(pending!,v.size,prices[i]);else if(prices.length===1)assignPrice(pending!,"price",prices[i]);});
        else if(!labels.length&&skuSizes(pending!.sourceText).length===prices.length&&prices.length>0)skuSizes(pending!.sourceText).forEach((v,i)=>{if(v)assignPrice(pending!,v,prices[i]);else requireReview(pending!,"Tamanho fora de P/M/G: confirme o tamanho no editor.");});
        else if(!labels.length&&header.length===prices.length)header.forEach((v,i)=>{if(v)assignPrice(pending!,v,prices[i]);});
        else if(prices.length===1&&!labels.length)assignPrice(pending!,"price",prices[0]);
        else requireReview(pending!,"Vários preços sem tamanhos claros: confira na foto.");
        if(prices.some(v=>v===null))pending!.issues.push("Há um preço ilegível.");
      }
    }
    flush();
  }
  const groups=new Map<string,ReaderItem[]>();
  for(const item of items){const key=JSON.stringify([item.kind,normalizeMenuText(item.category),normalizeMenuText(item.name)]);const group=groups.get(key)||[];group.push(item);groups.set(key,group);}
  for(const group of groups.values())if(group.length>1){
    const same=group.every(item=>item.price===group[0].price&&(["p","m","g"] as const).every(size=>item.sizes[size]===group[0].sizes[size]));
    const canonical=group.find(readerItemReady)||group[0];
    for(const item of same?group.filter(item=>item!==canonical):group)requireReview(item,same?"Duplicado: este produto já aparece em outro trecho da leitura.":"Mesmo produto com valores diferentes em outros trechos: escolha a versão correta.");
  }
  return {items,unmatched,pages:pages.length};
}
export function readerItemReady(item:ReaderItem){return !item.reviewRequired&&item.name.trim().length>=2&&item.category.trim().length>=2&&(item.kind==="pizza"?Object.values(item.sizes).some(v=>v!==null&&v>0):!!item.price&&item.price>0);}
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
export function applyReaderItems(data:RestaurantData,items:ReaderItem[],makeId:()=>string=()=>crypto.randomUUID()):Partial<RestaurantData>{
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
