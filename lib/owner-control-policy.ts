import {z} from "zod";
import {money,restaurantSchema,type RestaurantData,type Product,type Size} from "./domain.ts";
import {brasiliaDay} from "./ai-offer-policy.ts";
import {requestedImage} from "./creation-intent.ts";
import {assistantAnswer} from "./assistant-help.ts";
import {localStudio,proposalPatch} from "./studio-policy.ts";

export const ownerSelection=z.object({productId:z.string().min(1).max(80).optional(),size:z.enum(["p","m","g"]).optional(),price:z.number().int().min(1).max(1000000).optional(),startsAt:z.string().datetime({offset:true}).optional(),endsAt:z.string().datetime({offset:true}).optional()}).strict();
export const ownerControlInput=z.object({requestId:z.string().uuid(),message:z.string().trim().min(2).max(1600),mode:z.enum(["smart","ai"]).default("smart"),snapshot:restaurantSchema,selection:ownerSelection.default({})}).strict();
export type OwnerControlInput=z.infer<typeof ownerControlInput>;
export type OwnerSelection=z.infer<typeof ownerSelection>;
export type OwnerChange={label:string;before:string;after:string};
export type OwnerForm={kind:"promotion"|"price"|"product";products:{id:string;name:string;kind:string;sizes:Size[]}[];selection:OwnerSelection};
export type OwnerControlResult={status:"preview"|"clarify"|"creative";source:"direct"|"ai";reply:string;changes:OwnerChange[];patch?:Partial<RestaurantData>;form?:OwnerForm;canUseAI?:boolean;screen?:"menu"|"store"|"overview"|"studio";attempt?:string};
const normalize=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const sizes:Size[]=["p","m","g"];
const clarify=(reply:string,form?:OwnerForm):OwnerControlResult=>({status:"clarify",source:"direct",reply,changes:[],...(form?{form}:{})});
const valueAfterSeparator=(v:string)=>v.match(/(?:\b(?:para|pra)\b|[:=])\s*([\s\S]+)$/i)?.[1]||"";
const quoted=(v:string)=>v.trim().replace(/^["“]|["”]$/g,"").trim();
const dateLabel=(v:string)=>new Date(v).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"});
function productLabel(p:Product,size?:Size){return p.name+(size?" · "+size.toUpperCase():"");}
function saleLabel(data:RestaurantData,p:RestaurantData["promotions"][number]){return (p.kind==="bundle"?p.name:productLabel(data.products.find(v=>v.id===p.productId)!,p.size))+" · "+money(p.price)+" · "+(p.enabled?"até "+dateLabel(p.endsAt):"desativada");}

/** Summaries are derived from validated patches, never from the model's claims. */
export function ownerChanges(data:RestaurantData,patch:Partial<RestaurantData>):OwnerChange[]{
 const after=restaurantSchema.parse({...data,...patch}),changes:OwnerChange[]=[];
 const fields={name:"Nome da pizzaria",tagline:"Chamada do cardápio",description:"Texto de apresentação",hours:"Horário",address:"Endereço",city:"Cidade",instagram:"Instagram",whatsapp:"WhatsApp",eta:"Prazo de entrega",accent:"Cor da marca",theme:"Estilo"} as const;
 for(const [key,label] of Object.entries(fields) as [keyof typeof fields,string][])if(data[key]!==after[key])changes.push({label,before:data[key]||"Não informado",after:after[key]||"Não informado"});
 for(const [key,label] of [["isOpen","Loja aberta"],["deliveryEnabled","Entrega"],["pickupEnabled","Retirada"]] as const)if(data[key]!==after[key])changes.push({label,before:data[key]?"Sim":"Não",after:after[key]?"Sim":"Não"});
 for(const [key,label] of [["deliveryFee","Taxa de entrega"],["minOrder","Pedido mínimo"]] as const)if(data[key]!==after[key])changes.push({label,before:money(data[key]),after:money(after[key])});
 if(JSON.stringify(data.presentation)!==JSON.stringify(after.presentation))changes.push({label:"Composição do cardápio",before:"Visual atual",after:"Novo visual na prévia"});
 for(const p of after.products){const old=data.products.find(v=>v.id===p.id);if(!old){changes.push({label:"Novo produto",before:"Não cadastrado",after:p.name});if(p.kind==="pizza")for(const size of sizes){if(p.sizes[size]>0)changes.push({label:"Preço · "+productLabel(p,size),before:"Sem preço cadastrado",after:money(p.sizes[size])});}else changes.push({label:"Preço · "+p.name,before:"Sem preço cadastrado",after:money(p.price)});continue;}
  for(const [key,label] of [["name","Nome"],["description","Descrição"]] as const)if(old[key]!==p[key])changes.push({label:label+" · "+old.name,before:old[key]||"Sem texto",after:p[key]||"Sem texto"});
  if(old.enabled!==p.enabled)changes.push({label:"Disponibilidade · "+p.name,before:old.enabled?"Disponível":"Pausado",after:p.enabled?"Disponível":"Pausado"});
  if(p.kind==="pizza")for(const size of sizes){if(old.sizes[size]!==p.sizes[size])changes.push({label:"Preço · "+productLabel(p,size),before:money(old.sizes[size]),after:money(p.sizes[size])});}
  else if(old.price!==p.price)changes.push({label:"Preço · "+p.name,before:money(old.price),after:money(p.price)});
 }
 for(const p of after.promotions){const old=data.promotions.find(v=>v.id===p.id);if(JSON.stringify(old)!==JSON.stringify(p))changes.push({label:"Promoção",before:old?saleLabel(data,old):"Sem esta oferta",after:saleLabel(after,p)});}
 return changes;
}
export function ownerPreview(data:RestaurantData,patch:Partial<RestaurantData>,reply:string,source:"direct"|"ai"="direct"):OwnerControlResult{
 const changes=ownerChanges(data,patch);return {status:"preview",source,reply:changes.length?reply:"As informações já estão assim. Nenhuma mudança é necessária.",patch,changes};
}

function matches(message:string,product:Product){
 const full=normalize(product.name),primary=full.replace(/^pizza\s+/g,"").split(/[.;,:]|\s+(?:molho|ingredientes|mussarela|mucarela)\b/)[0].trim();
 return [full,primary].filter(v=>v.length>2).some(v=>(" "+message.replace(/[^a-z0-9 ]/g," ")+" ").includes(" "+v+" "));
}
function chooseProduct(input:OwnerControlInput,data:RestaurantData):{product?:Product;ambiguous:boolean;conflict:boolean;options:Product[]}{
 const message=normalize(input.message),matched=data.products.filter(p=>matches(message,p));
 const selected=data.products.find(p=>p.id===input.selection.productId);
 if(input.selection.productId&&!selected)throw Error("Escolha um produto desta pizzaria.");
 if(selected&&matched.length&&!matched.some(p=>p.id===selected.id))return {ambiguous:true,conflict:true,options:matched};
 return {product:selected||(matched.length===1?matched[0]:undefined),ambiguous:matched.length>1,conflict:false,options:matched.length?matched:data.products};
}
function form(kind:OwnerForm["kind"],selection:OwnerSelection,products:Product[]):OwnerForm{return {kind,selection,products:products.map(p=>({id:p.id,name:p.name,kind:p.kind,sizes:p.kind==="pizza"?sizes.filter(s=>p.sizes[s]>0):[]}))};}
function priceFromMessage(message:string,allowZero=false){
 const amount="(\\d{1,5}(?:[.,]\\d{1,2})?)(?![\\d.,%])";
 const targets=[...message.matchAll(new RegExp("\\b(?:por|para|pra)\\s+(?:R\\$\\s*)?"+amount,"gi"))].map(m=>m[1]);
 const currency=[...message.matchAll(new RegExp("R\\$\\s*"+amount,"gi"))].map(m=>m[1]);
 const values=[...new Set((targets.length?targets:currency).map(v=>Math.round(Number(v.replace(",","."))*100)))];
 return values.length===1&&(allowZero?values[0]>=0:values[0]>0)&&values[0]<=1000000?values[0]:undefined;
}
function sizeFromMessage(message:string):Size|undefined{const m=normalize(message);if(/\b(grande|g)\b/.test(m))return "g";if(/\b(media|m)\b/.test(m))return "m";if(/\b(pequena|p)\b/.test(m))return "p";}
function period(message:string,now:Date){
 const day=brasiliaDay(now),m=normalize(message),tomorrow=/\bamanha\b/.test(m),time=m.match(/\bate\s+(\d{1,2})(?::|h)(\d{2})?\b/);
 let start=now.toISOString(),end:string|undefined;
 if(tomorrow){start=day.end;end=new Date(Date.parse(day.end)+86400000).toISOString();}
 else if(/\bhoje\b/.test(m))end=day.end;
 if(time){const h=Number(time[1]),minute=Number(time[2]||0);if(h<24&&minute<60){const date=(tomorrow?new Date(Date.parse(day.end)):new Date(Date.parse(day.start))).toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});end=new Date(`${date}T${String(h).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00-03:00`).toISOString();}}
 return {startsAt:start,...(end?{endsAt:end}:{})};
}
const creativeWords=/\b(reescrev|melhor|crie|escrev|sugir|sugest|quero|deixe|deixar|mude|alter|refac|refaz)/;
/** Exact, common requests are compiled locally. Missing values are asked for, never invented. */
export function resolveOwnerCommand(input:OwnerControlInput,now=new Date()):OwnerControlResult{
 const data=input.snapshot,text=input.message.trim(),m=normalize(text);
 if(/^(como|onde|qual|o que|me explica|me explique)\b/.test(m)){const help=assistantAnswer(text);return {...clarify(help?.kind==="guide"?help.reply:"Conte a mudança que deseja ou use os campos do editor."),...(help?.kind==="guide"&&help.screen?{screen:help.screen}:{})};}
 if(/\b(?:nao|talvez|se puder|se fosse|se eu)\b/.test(m.split(/\b(?:para|pra)\b|[:=]/)[0]))return clarify("Para evitar uma mudança diferente do que você quer, peça uma alteração direta de cada vez. Ex.: Coloque a calabresa grande na promoção por R$ 39,90 hoje.");
 if(/\b(senha|assinatura|fatura|verificar loja|suspender conta|chave pix|recebedor|titular|cpf|cnpj)\b/.test(m))return {...clarify("Esses dados precisam dos controles específicos da conta e da loja. Abra Pizzaria para conferir; o assistente não altera acesso, cobrança ou recebedor Pix."),screen:"store"};
 if(/\be (?:tambem |depois )?(?:mude|troque|altere|pause|coloque|crie|ative)\b/.test(m))return clarify("Vamos conferir uma alteração por vez. Você pode pedir um reajuste de todas as pizzas, ou preparar cada outra mudança separadamente.");
 const directFields=[[/^(?:mude|troque|altere|defina|coloque|atualize)\s+(?:o |a |meu |minha )?(?:horario(?: de funcionamento)?)\s+(?:para|pra|:|=)\s*(.+)$/i,"hours"],[/^(?:mude|troque|altere|defina|coloque|atualize)\s+(?:o |a |meu |minha )?(?:prazo(?: de entrega)?)\s+(?:para|pra|:|=)\s*(.+)$/i,"eta"],[/^(?:mude|troque|altere|defina|coloque|atualize)\s+(?:o |a |meu |minha )?(?:endereco)\s+(?:para|pra|:|=)\s*(.+)$/i,"address"],[/^(?:mude|troque|altere|defina|coloque|atualize)\s+(?:o |a |meu |minha )?(?:cidade)\s+(?:para|pra|:|=)\s*(.+)$/i,"city"]] as const;
 for(const [pattern,key] of directFields){const match=m.match(pattern);if(match){const original=valueAfterSeparator(text);return ownerPreview(data,{[key]:quoted(original)},"Confira os dados da loja. Mudanças de endereço podem exigir nova verificação.");}}
 for(const [pattern,key] of [[/^(?:slogan|chamada|frase)\s*[:=]\s*(.+)$/i,"tagline"],[/^(?:descricao|texto)\s+(?:da loja|da pizzaria)\s*[:=]\s*(.+)$/i,"description"]] as const){const match=normalize(text).match(pattern);if(match)return ownerPreview(data,{[key]:quoted(valueAfterSeparator(text))},"Confira o texto que você informou.");}
 if(/^(?:mude|troque|altere|defina|coloque|atualize)\b.*\b(taxa de entrega|pedido minimo)\b/.test(m)){const amount=priceFromMessage(text,true);if(amount!==undefined)return ownerPreview(data,/pedido minimo/.test(m)?{minOrder:amount}:{deliveryFee:amount},"Confira o valor. As regras de bairros continuam sendo as configuradas no editor.");return clarify("Informe o valor em reais. Ex.: Mude a taxa de entrega para R$ 8,00.");}
 if(/^(?:abra|abrir|feche|fechar)\s+(?:a |minha )?(?:loja|pizzaria)(?: agora)?[.!]?$/i.test(m))return ownerPreview(data,{isOpen:/^(abra|abrir)/.test(m)},"Confira a situação da loja antes de publicar.");

 const productText=m.match(/^(?:mude|troque|altere|defina)\s+(?:a )?descricao\s+(?:da |do |de )?(.+?)\s+(?:para|pra|:|=)\s+(.+)$/);
 if(productText){const choice=chooseProduct({...input,message:productText[1]},data);if(!choice.product)return clarify("Qual produto receberá essa descrição?",form("product",input.selection,choice.options));const description=quoted(valueAfterSeparator(text));return ownerPreview(data,{products:data.products.map(p=>p.id===choice.product!.id?{...p,description}:p)},"Confira se a descrição representa o produto da sua loja.");}
 const quick=assistantAnswer(text);
 if(quick?.kind==="rename")return ownerPreview(data,{name:quick.name},"Confira o nome da pizzaria.");
 if(quick?.kind==="style"){const patch=proposalPatch(localStudio(text,data),data);if(Object.keys(patch).length)return ownerPreview(data,patch,"Confira o visual preparado com as opções da plataforma.");}
 if(requestedImage(text))return {...clarify("Para criar uma imagem, use as opções do Estúdio logo abaixo. A geração de imagens é uma ação separada; este pedido não gastou IA."),screen:"studio"};
 const create=text.match(/^(?:adicione|cadastre|crie)\s+(?:(?:uma|nova|um|novo)\s+)?(pizza|bebida|produto)\s+(?:de\s+)?(.+?)(?=\s+(?:por|para|pra|grande|media|média|pequena|[PMG])\b|$)/i);
 if(create){
  if(/\b(promocao|promo|combo|oferta)\b/.test(m))return {...clarify("Cadastre primeiro o produto com tamanho e preço. Depois prepare a promoção com esse produto, para conferir cada etapa."),screen:"menu"};
  const name=quoted(create[2]),kind=normalize(create[1])==="pizza"?"pizza":"simple",price=priceFromMessage(text),size=kind==="pizza"?sizeFromMessage(text):undefined;
  const category=data.categories.find(c=>normalize(c.name)===(kind==="pizza"?"pizzas":"bebidas"))||(data.categories.length===1?data.categories[0]:undefined);
  if(!price||kind==="pizza"&&!size||!category)return {...clarify("Informe nome, tamanho e preço. Ex.: Adicione pizza Pepperoni grande por R$ 59,90. Para escolher outra categoria ou completar os ingredientes, use o editor."),screen:"menu"};
  if(data.products.some(p=>normalize(p.name)===normalize(name)))return {...clarify("Já existe um produto com esse nome. Edite os tamanhos e preços dele no Cardápio."),screen:"menu"};
  const product:Product={id:"owner_"+input.requestId,categoryId:category.id,name,description:"",image:"",kind,enabled:true,featured:false,price:kind==="simple"?price:0,sizes:{p:0,m:0,g:0,...(size?{[size]:price}:{})}};
  return ownerPreview(data,{products:[...data.products,product]},"Confira o produto, a categoria e o preço. Os ingredientes e a foto ficam para você completar no editor.");
 }
 const bulk=m.match(/\b(aumente|aumentar|suba|reduza|reduzir|diminua|baixe)\b.*\btodas?\b.*\bpizzas?\b.*?(\d{1,3}(?:[.,]\d{1,2})?)\s*%/);
 if(bulk){const percent=Number(bulk[2].replace(",",".")),down=/redu|diminu|baix/.test(bulk[1]);if(percent<=0||percent>100||down&&percent===100)return clarify("Informe um reajuste maior que zero; a redução precisa ser menor que 100%.");const products=data.products.map(p=>p.kind!=="pizza"?p:{...p,sizes:Object.fromEntries(sizes.map(size=>[size,p.sizes[size]>0?Math.round(p.sizes[size]*(1+(down?-1:1)*percent/100)):0])) as Product["sizes"]});return ownerPreview(data,{products},"Confira cada preço do reajuste. As ofertas com preço próprio mantêm o valor que você definiu.");}
 const availability=m.match(/^(ative|desative|habilite|desabilite)\s+(?:a |o )?(entrega|retirada)[.!]?$/);
 if(availability)return ownerPreview(data,{[availability[2]==="entrega"?"deliveryEnabled":"pickupEnabled"]:availability[1]==="ative"||availability[1]==="habilite"},"Confira a modalidade antes de publicar.");
 if(/\b(legenda|texto|chamada)\b/.test(m)&&/\b(promocao|promo|oferta|whatsapp|instagram)\b/.test(m))return {...clarify("As legendas de divulgação usam o preço e a validade da oferta publicada. Em Cardápio, abra Ofertas e Artes para preparar o texto e a imagem juntos."),screen:"menu"};
 const promotional=/\b(promocao|promo|oferta|desconto)\b/.test(m),priceChange=/\b(preco|valor)\b/.test(m)&&/\b(mude|alter|troque|coloque|defina|ajuste|deixe|atualize)/.test(m);
 const pause=/\b(pause|pausar|desative|desativar|esconda|indisponivel|acabou|esgotou|retire)\b/.test(m),activate=/\b(ative|ativar|reative|reativar|disponivel|volte|voltou)\b/.test(m);
 if(promotional||priceChange||pause||activate){
  if(/\b(combo|duas|tres|[2-9]\s*pizzas?)\b/.test(m)&&promotional)return {...clarify("Para uma oferta com várias unidades, abra Promoções e escolha Combo. Lá você confere a composição completa, o preço e a validade sem usar uma geração de IA."),screen:"menu"};
  const choice=chooseProduct(input,data),kind=promotional?"promotion":priceChange?"price":"product",selection={...input.selection};
  if(!choice.product)return clarify(choice.conflict?"O sabor mencionado é diferente do selecionado. Confira o pedido e o produto.":choice.ambiguous?"Encontrei mais de um sabor parecido. Qual deles você quer alterar?":"Qual produto vamos alterar?",form(kind,selection,choice.options));
  const product=choice.product;selection.productId=product.id;
  if(!promotional&&!priceChange){return ownerPreview(data,{products:data.products.map(p=>p.id===product.id?{...p,enabled:!pause}:p)},`Confira a disponibilidade de ${product.name}.`);}
  const available=product.kind==="pizza"?sizes.filter(s=>product.sizes[s]>0):[];
  const size=product.kind==="pizza"?selection.size||sizeFromMessage(text)||(available.length===1?available[0]:undefined):undefined;
  if(product.kind==="pizza"&&(!size||!available.includes(size)))return clarify("Qual tamanho dessa pizza? Os tamanhos sem preço não entram na oferta.",form(kind,selection,[product]));
  selection.size=size;
  if(promotional&&/\b(tire|retire|remova|encerre|desative|pause)\b/.test(m)){
   const found=data.promotions.find(p=>p.kind!=="bundle"&&p.productId===product.id&&p.size===size);
   if(!found)return clarify("Não há uma promoção desse produto e tamanho para encerrar.");
   return ownerPreview(data,{promotions:data.promotions.map(p=>p.id===found.id?{...p,enabled:false}:p)},"Confira a promoção que será encerrada no rascunho.");
  }
  if(promotional&&!product.enabled)return {...clarify("Este produto está pausado. Ative o sabor no editor antes de oferecer uma nova promoção."),screen:"menu"};
  const percent=m.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*%/),base=product.kind==="pizza"?product.sizes[size!]:product.price;
  const discount=promotional&&percent&&/\b(desconto|menos|off)\b/.test(m)?Math.round(base*(1-Number(percent[1].replace(",","."))/100)):undefined;
  selection.price=selection.price??discount??priceFromMessage(text);
  if(!selection.price)return clarify(promotional?"Qual será o preço da promoção? Use o valor que sua pizzaria pode oferecer.":"Qual é o novo preço?",form(kind,selection,[product]));
  if(!promotional)return ownerPreview(data,{products:data.products.map(p=>p.id!==product.id?p:product.kind==="pizza"?{...p,sizes:{...p.sizes,[size!]:selection.price!}}:{...p,price:selection.price!})},"Confira o preço antes de usar no rascunho.");
  const dates=period(text,now);selection.startsAt=selection.startsAt||dates.startsAt;selection.endsAt=selection.endsAt||dates.endsAt;
  if(!selection.endsAt||Date.parse(selection.endsAt)<=Math.max(now.getTime(),Date.parse(selection.startsAt)))return clarify("Até quando a promoção vale? Confira o início e o fim no horário de Brasília.",form(kind,selection,[product]));
  const existing=data.promotions.find(p=>p.kind!=="bundle"&&p.productId===product.id&&p.size===size),promotion={id:existing?.id||"owner_"+input.requestId,kind:"product" as const,productId:product.id,...(size?{size}:{}),price:selection.price,startsAt:selection.startsAt,endsAt:selection.endsAt,enabled:true};
  return ownerPreview(data,{promotions:existing?data.promotions.map(p=>p.id===existing.id?promotion:p):[...data.promotions,promotion]},"Sua oferta está preparada. Confira produto, tamanho, preço e validade; ela só entra no ar depois de salvar e publicar.");
 }
 if(creativeWords.test(m)&&/\b(texto|textos|descricao|descricoes|visual|estilo|layout|chamada|slogan|marca|cardapio|apetitos|bonit|profissional)/.test(m)){
  const needsProduct=/\b(produto|sabor|pizza|calabresa|mussarela|portuguesa)\b/.test(m)&&/\b(descricao|texto)/.test(m)&&!/\b(da loja|da pizzaria|geral)\b/.test(m),choice=chooseProduct(input,data);
  if(needsProduct&&!choice.product)return clarify("Qual produto vamos trabalhar? Assim a IA recebe só as informações relevantes.",form("product",input.selection,choice.options));
  return {status:"creative",source:"direct",changes:[],reply:"Posso usar a IA para preparar visual e textos com os dados da sua loja. Você confere a prévia antes de usar.",canUseAI:true,...(choice.product?{form:form("product",{productId:choice.product.id},[choice.product])}:{})};
 }
 return {...clarify("Conte uma mudança por vez. Posso preparar promoções, preços, disponibilidade, horários, textos e visual. Todos os campos também continuam disponíveis no editor manual."),screen:"menu"};
}
