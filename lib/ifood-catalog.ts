import type {MenuStoreInfo} from "./menu-store-info.ts";
type Obj=Record<string,unknown>;
const obj=(v:unknown):Obj=>v&&typeof v==="object"&&!Array.isArray(v)?v as Obj:{};
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const clean=(v:unknown,max=100)=>{if(typeof v!=="string")return "";const text=v.replace(/<[^>]*>/g," ").replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim();return text.length<=max?text:"";};
const norm=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const currency=(n:number)=>(n/100).toFixed(2).replace(".",",");
function amount(value:unknown):number|null{
 const v=obj(value);if(v.currency!==undefined&&v.currency!=="BRL"||v.priceCurrency!==undefined&&v.priceCurrency!=="BRL")return null;
 const raw=v.value;if(typeof raw!=="number"&&typeof raw!=="string"||typeof raw==="string"&&!/^\d+(?:\.\d{1,2})?$/.test(raw))return null;
 const n=Number(raw);return Number.isFinite(n)&&n>=0&&n<=10000&&Math.abs(n*100-Math.round(n*100))<.000001?Math.round(n*100):null;
}
/** DEFAULT is delivery; another channel's override must not change these prices. */
function effective(value:unknown):Obj{
 const v=obj(value),modifiers=arr(v.contextModifiers).map(obj).filter(m=>m.catalogContext==="DEFAULT"),prices=arr(v.priceByCatalog).map(obj).filter(m=>m.catalogContext==="DEFAULT"),statuses=arr(v.statusByCatalog).map(obj).filter(m=>m.catalogContext==="DEFAULT");
 if(modifiers.length>1||prices.length>1||statuses.length>1)return {...v,status:"UNAVAILABLE"};
 return {...v,...modifiers[0],...(prices.length?{price:{...obj(v.price),...prices[0],value:prices[0].value}}:{}),...(statuses.length?{status:statuses[0].status}:{})};
}
const available=(value:unknown)=>effective(value).status==="AVAILABLE";
export const officialIfoodItemAvailable=available;
const week=["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"],dayNames=["segunda","terça","quarta","quinta","sexta","sábado","domingo"];
export function officialIfoodHours(value:unknown){
 const groups=Array.isArray(value)?value:[value],shifts=groups.flatMap(group=>{
  const g=obj(group);if(g.operation&&g.operation!=="DELIVERY"||g.salesChannel&&g.salesChannel!=="MARKETPLACE")return [];
  return arr(g.shifts);
 });if(!shifts.length||shifts.length>28)return "";
 const rows=new Map<string,Set<number>>(),intervals:{start:number;end:number}[]=[];
 for(const raw of shifts){
  const shift=obj(raw),day=week.indexOf(String(shift.dayOfWeek)),time=String(shift.start),duration=shift.duration;
  if(day<0||!/^([01]\d|2[0-3]):[0-5]\d:00$/.test(time)||typeof duration!=="number"||!Number.isInteger(duration)||duration<1||duration>1440)return "";
  const start=Number(time.slice(0,2))*60+Number(time.slice(3,5)),end=start+duration,clock=(n:number)=>String(Math.floor(n%1440/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
  const absolute=day*1440+start;
  if(intervals.some(v=>[absolute-10080,absolute,absolute+10080].some(s=>s<v.end&&s+duration>v.start)))return "";
  intervals.push({start:absolute,end:absolute+duration});
  const label=duration===1440&&start===0?"24h":`${time.slice(0,5)} às ${clock(end)}${end>=1440?" (dia seguinte)":""}`;
  const days=rows.get(label)||new Set<number>();days.add(day);rows.set(label,days);
 }
 const result=[...rows].map(([hours,days])=>{
  const values=[...days].sort((a,b)=>a-b),label=values.length===7?"Todos os dias":values.length>2&&values.every((n,i)=>!i||n===values[i-1]+1)?dayNames[values[0]]+" a "+dayNames[values.at(-1)!]:values.map(n=>dayNames[n]).join(", ");
  return label+", "+hours;
 }).join("; ");return result.length<=300?result:"";
}
export function officialIfoodStore(merchant:Obj,hours:unknown):MenuStoreInfo{
 const name=clean(merchant.name),a=obj(merchant.address),street=clean(a.street,120),number=typeof a.number==="number"?String(a.number):clean(a.number,20),district=clean(a.district,50),city=clean(a.city,70),state=clean(a.state,30),country=clean(a.country,20);
 const address=[street,number,district,[city,state].filter(Boolean).join(" - ")].filter(Boolean).join(", ");
 const validAddress=street&&city&&/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(state)&&(!country||country==="BR")&&address.length<=200;
 const operatingHours=officialIfoodHours(hours),phone=clean(merchant.telephone||merchant.phone,25),digits=phone.replace(/\D/g,"");
 return {...(name?{name}:{}),...(validAddress?{address}:{}),...(operatingHours?{hours:operatingHours}:{}),...(/^(?:\d{10,11}|55\d{10,11})$/.test(digits)&&/^[\d\s()+.-]+$/.test(phone)?{telephone:phone}:{})};
}
type Entry={name:string;description:string;category:string;kind:"pizza"|"simple";price:number|null;sizes:{p:number|null;m:number|null;g:number|null}};
const sizeName=(name:string):"p"|"m"|"g"|null=>/^(p|pequen[ao]|brotinho)$/.test(norm(name))?"p":/^(m|medi[ao])$/.test(norm(name))?"m":/^(g|grande)$/.test(norm(name))?"g":null;
export function officialIfoodCatalog(categories:unknown[],textLimit=60000){
 const limit=Number.isFinite(textLimit)?Math.max(0,Math.min(60000,Math.floor(textLimit))):0;
 const entries=new Map<string,Entry>(),conflicts=new Set<string>(),warnings:string[]=[];let seen=0;
 const warn=(text:string)=>{if(!warnings.includes(text)&&warnings.length<20)warnings.push(text.slice(0,180));};
 function put(entry:Entry){
  if(!entry.name||entry.name.length<2||/R\s*\$|[{}<>|\[\]]/i.test(entry.name))return;
  const key=norm(entry.kind+":"+entry.category+":"+entry.name),old=entries.get(key);if(conflicts.has(key))return;
  if(old&&JSON.stringify({...old,name:"",description:""})!==JSON.stringify({...entry,name:"",description:""})){entries.delete(key);conflicts.add(key);warn(`${entry.name}: preços divergentes; confira manualmente.`);return;}
  if(!old&&entries.size>=500){warn("A leitura atingiu o limite de 500 produtos. Confira o restante do catálogo por arquivo.");return;}
  entries.set(key,entry);
 }
 for(const raw of categories.slice(0,30)){
  const category=effective(raw);if(!available(category))continue;
  const categoryName=clean(category.name,60).replace(/[\[\]]/g,"")||"Produtos";
  for(const value of arr(category.items)){
   if(++seen>1000){warn("A leitura atingiu o limite de itens. Confira o restante do catálogo por arquivo.");break;}
   const graph=obj(value),item=effective(graph.item||graph);if(!available(item))continue;
   const products=arr(graph.products).map(obj),groups=arr(graph.optionGroups).map(effective),options=arr(graph.options).map(effective);
   const roots=products.filter(p=>arr(p.optionGroups).length),product=products.find(p=>p.id===item.productId)||(roots.length===1?roots[0]:undefined)|| (products.length===1?products[0]:obj(graph.product));
   const name=clean(product.name||item.name),description=clean(product.description||item.description,600);
   if(item.type!=="PIZZA"){
    if(item.type&&item.type!=="DEFAULT"||groups.length||arr(product.optionGroups).length||arr(item.optionGroupIds).length){warn(`${name||categoryName}: adicionais ou combo precisam de revisão manual.`);continue;}
    const price=amount(item.price);if(price===null||price===0){warn(`${name||categoryName}: preço não disponível para importar.`);continue;}
    const kind=/pizz/.test(norm(categoryName))?"pizza":"simple";if(kind==="pizza")warn(`${name}: confirme a qual tamanho pertence o preço.`);
    put({name,description,category:categoryName,kind,price,sizes:{p:null,m:null,g:null}});continue;
   }
   const byType=new Map(groups.map(g=>[String(g.optionGroupType),g])),refs=arr(product.optionGroups).map(obj);
   if(groups.length!==4||["SIZE","CRUST","EDGE","TOPPING"].some(type=>!available(byType.get(type)))){warn(`${name||categoryName}: estrutura de pizza incompleta; confira os tamanhos e adicionais.`);continue;}
   const choices=(group:Obj)=>options.filter(o=>arr(group.optionIds).includes(o.id)&&available(o));
   const sizeRef=refs.find(r=>r.id===byType.get("SIZE")!.id),toppingRef=refs.find(r=>r.id===byType.get("TOPPING")!.id);
   if(sizeRef?.min!==1||sizeRef?.max!==1||toppingRef?.min!==1||typeof toppingRef?.max!=="number"||toppingRef.max<1){warn(`${name||categoryName}: seleção obrigatória de tamanho ou sabor precisa de revisão.`);continue;}
   let defaultsValid=true;
   for(const type of ["CRUST","EDGE"]){const group=byType.get(type)!,ref=refs.find(r=>r.id===group.id),values=choices(group);
    if(!ref||!Number.isInteger(ref.min)||Number(ref.min)<0||Number(ref.min)>1||!Number.isInteger(ref.max)||Number(ref.max)<Number(ref.min)||Number(ref.max)>1||Number(ref.min)>0&&!values.some(o=>amount(o.price)===0))defaultsValid=false;
    if(values.some(o=>amount(o.price)!==0))warn("Massas e bordas com adicionais não foram transferidas; os preços são da opção sem acréscimo.");
   }
   if(!defaultsValid){warn(`${name||categoryName}: massa ou borda obrigatória sem opção gratuita; confira o preço completo.`);continue;}
   const base=item.price===undefined?0:amount(item.price);if(base===null)continue;
   const sizes=choices(byType.get("SIZE")!).map(option=>({option,size:sizeName(clean(products.find(p=>p.id===option.productId)?.name||option.name)),price:amount(option.price)}));
   if(sizes.some(s=>arr(s.option.fractions).some(v=>typeof v==="number"&&v>2)))warn("Pizzas com três ou mais sabores precisam de ajuste; o cardápio permite até dois sabores por pizza.");
   if(sizes.some(s=>!s.size))warn("Há tamanhos fora de P/M/G no iFood. Confira esses produtos manualmente.");
   const toppings=options.filter(o=>arr(byType.get("TOPPING")!.optionIds).includes(o.id)),flavors=[...new Set(toppings.map(o=>String(o.productId)))];
   for(const id of flavors){
    const flavor=products.find(p=>p.id===id);if(!flavor)continue;
    const entry:Entry={name:clean(flavor.name),description:clean(flavor.description,600)||description,category:categoryName,kind:"pizza",price:null,sizes:{p:null,m:null,g:null}};let invalid=false;
    for(const s of sizes){if(!s.size||s.price===null)continue;
     const prices=toppings.filter(o=>o.productId===id&&o.parentCustomizationOptionId===s.option.id),fallback=toppings.filter(o=>o.productId===id&&o.parentCustomizationOptionId===undefined),selected=prices.length?prices:fallback;
     if(selected.length!==1){invalid=true;break;}if(!available(selected[0]))continue;const topping=amount(selected[0].price);if(topping===null||base+s.price+topping<=0||base+s.price+topping>1000000){invalid=true;break;}
     const price=base+s.price+topping;if(entry.sizes[s.size]!==null&&entry.sizes[s.size]!==price){invalid=true;break;}entry.sizes[s.size]=price;
    }
    if(invalid||Object.values(entry.sizes).every(v=>v===null)){warn(`${entry.name}: preço por tamanho não ficou inequívoco; confira manualmente.`);continue;}
    put(entry);
   }
  }
 }
 const rows:string[]=[];let count=0,length=0;
 for(const entry of entries.values()){
  const sizes=Object.entries(entry.sizes).filter(([,price])=>price!==null).map(([size,price])=>`${size.toUpperCase()} R$ ${currency(price!)}`).join(" · ");
  const line=`Categoria: ${entry.category} [${entry.kind}]\n${entry.name} ${sizes||"R$ "+currency(entry.price!)}${entry.description?"\nDescrição: "+entry.description:""}\n`;
  const added=line.length+(rows.length?1:0);
  if(length+added>limit){warn("A leitura atingiu o limite de texto. Confira o restante por arquivo.");break;}rows.push(line);length+=added;count++;
 }
 return {text:rows.join("\n"),count,warnings};
}
