import {extractIfoodDOM} from "./extractor.js";
import {makeMenuText,makeMenuJSON,selectedRows} from "./format.js";
const byId = id => document.getElementById(id);
let capture = null;
const selected = new Set();
const pizzaSizes = {}; // Choice made by the owner, never inferred from a bare price.
const notice = value => { byId("notice").textContent = value; };
const valid = item => item.available && !item.needsReview && Number.isSafeInteger(item.priceCents) && item.priceCents > 0;
const countText = () => {
 const pizzas = selectedRows(capture,selected).filter(row=>/pizza|sabor/i.test(row.category)&&!/combo|bebida|sobremesa|lanche/i.test(row.category));
 const pending = pizzas.filter(row=>!pizzaSizes[row.id]).length;
 return `${capture.itemCount} produto(s) identificados, ${selected.size} selecionado(s).${pending?` ${pending} pizza(s) ainda sem tamanho: escolha abaixo ou revise no Pizzaria.on.`:""} Confira preços e fotos no destino.${capture.truncated ? " Leitura limitada aos primeiros 200 produtos." : ""}`;
};
function draw(){
  const list = byId("products");list.replaceChildren();
  for (const category of capture.categories) for(const item of category.items){
    const row = document.createElement("label");row.className="product";
    const input=document.createElement("input");input.type="checkbox";input.checked=selected.has(item.id);input.disabled=!valid(item);
    input.addEventListener("change",()=>{if(input.checked)selected.add(item.id);else selected.delete(item.id);update();});
    const detail=document.createElement("span"),name=document.createElement("span"),meta=document.createElement("span");
    name.className="name";name.textContent=item.name;
    meta.className="meta"+(valid(item)?"":" pending");
    const price = item.priceCents!==null ? `R$ ${(item.priceCents/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}` : "Preço a revisar";
    meta.textContent=`${category.name} • ${item.available?price:"Indisponível"}${item.needsReview?" • precisa revisão":""}`;
    detail.append(name,meta);
    if(item.imageUrl){const reference=document.createElement("small");reference.className="photo-reference";
      const link=document.createElement("a");link.href=item.imageUrl;link.target="_blank";link.rel="noreferrer noopener";link.textContent="Ver foto identificada ↗";
      reference.append(link);detail.append(reference);}

    if (/pizza|sabor/i.test(category.name) && !/combo|bebida|sobremesa|lanche/i.test(category.name)) {
      const size=document.createElement("select");size.className="pizza-size";
      size.setAttribute("aria-label",`Tamanho de ${item.name}`);
      const choices=[["","Tamanho não informado"],["p","Pequena"],["m","Média"],["g","Grande"],["unico","Preço único (sem tamanho)"]];
      for(const [value,label] of choices){const option=document.createElement("option");option.value=value;option.textContent=label;size.append(option);}
      size.value=pizzaSizes[item.id] || "";size.disabled=!valid(item);
      size.addEventListener("change",()=>{pizzaSizes[item.id]=size.value;update();});
      detail.append(size);
    }
    row.append(input,detail);list.append(row);
  }
  update();
}
function update(){byId("summary").textContent=countText();for(const id of ["txt","json","copy"])byId(id).disabled=selected.size===0;}
function save(filename,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
byId("read").addEventListener("click",async()=>{
  capture=null;selected.clear();for(const id of Object.keys(pizzaSizes))delete pizzaSizes[id];byId("results").hidden=true;byId("read").disabled=true;notice("Lendo os produtos da aba ativa...");
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.id||!/^https:\/\/(?:www\.)?ifood\.com\.br\/delivery\//i.test(tab.url||""))throw Error("Abra primeiro a página do cardápio da sua loja no iFood.");
    const response=await chrome.scripting.executeScript({target:{tabId:tab.id},func:extractIfoodDOM});
    const result=response?.[0]?.result;
    if(result?.status!=="captured")throw Error(result?.message||"Não foi possível ler o cardápio desta aba.");
    capture=result;
    for(const c of capture.categories)for(const item of c.items)if(valid(item))selected.add(item.id);
    byId("store").textContent=capture.storeName||"Loja sem nome identificado";
    byId("results").hidden=false;draw();notice("Leitura local concluída. Confira a lista antes de exportar.");
  }catch(error){notice(error instanceof Error?error.message:"Falha ao ler. Experimente PDF ou fotos no Pizzaria.on.");}
  finally{byId("read").disabled=false;}
});
byId("selectAll").addEventListener("click",()=>{if(!capture)return;for(const c of capture.categories)for(const i of c.items)if(valid(i))selected.add(i.id);draw();});
byId("deselectAll").addEventListener("click",()=>{selected.clear();draw();});
byId("txt").addEventListener("click",()=>{if(!capture)return;save("cardapio-ifood-pizzaria-on.txt",makeMenuText(capture,selected,pizzaSizes),"text/plain;charset=utf-8");});
byId("json").addEventListener("click",()=>{if(!capture)return;save("cardapio-ifood-origem.json",makeMenuJSON(capture,selected,pizzaSizes),"application/json;charset=utf-8");});
byId("copy").addEventListener("click",async()=>{if(!capture)return;try{await navigator.clipboard.writeText(makeMenuText(capture,selected,pizzaSizes));notice(`Texto de ${selectedRows(capture,selected).length} itens copiado. Cole no campo de criação do Pizzaria.on.`);}catch{notice("Falha ao copiar: use o botão Baixar TXT.");}});


byId("sendSite").addEventListener("click",async()=>{
 if(!capture)return;
 const field=byId("pairCode"),code=String(field.value||"").trim();
 if(!/^[a-f\d-]{36}\.[a-f\d]{64}$/i.test(code)){notice("Cole o código temporário completo gerado pela administração.");return;}
 const rows=capture.categories.flatMap(category=>category.items.map(item=>({
   id:item.id,category:category.name,name:item.name,description:item.description||"",priceCents:item.priceCents,
   rawPrice:item.rawPrice||"",imageUrl:item.imageUrl||null,needsReview:!!item.needsReview,available:!!item.available,
   selected:selected.has(item.id),sizeChoice:pizzaSizes[item.id]||null
 })));
 const payload={sourceUrl:capture.sourceUrl,storeName:capture.storeName||"",capturedAt:capture.capturedAt||new Date().toISOString(),truncated:!!capture.truncated,items:rows};
 const button=byId("sendSite");button.disabled=true;notice("Entregando catálogo ao servidor Pizzaria.on para revisão...");
 try{
  const response=await fetch("https://forno-cardapios.waves4845.chatgpt.site/api/menu-import-deliveries",{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+code},
    body:JSON.stringify(payload),credentials:"omit",cache:"no-store",signal:AbortSignal.timeout(30000)
  });
  const body=await response.json();
  if(!response.ok)throw Error(body.error||"Não foi possível entregar o catálogo.");
  field.value="";
  notice("Recebido pelo Pizzaria.on! "+body.stats.total+" registros e "+body.stats.photoReferences+" referências de fotos. O dono deve revisar antes de publicar.");
 }catch(e){notice(e instanceof Error?e.message:"Falha de conexão. Confira o código e tente novamente.");}
 finally{button.disabled=false;}
});
