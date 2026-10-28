import {z} from "zod";
import {money,type RestaurantData,type Product} from "./domain.ts";
import {isActivePromotion,promotionLabel,lowestProductPrice} from "./promotions.ts";
export const customerAssistantInput=z.object({conversationId:z.string().uuid(),token:z.string().regex(/^[a-f0-9]{64}$/),requestId:z.string().uuid(),message:z.string().trim().min(1).max(700)}).strict();
export const assistantSelection=z.object({intent:z.enum(["facts","recommendation","handoff"]),factIds:z.array(z.string().max(60)).max(4),productIds:z.array(z.string().max(80)).max(3)}).strict();
export type AssistantFact={id:string;title:string;text:string};
export type CustomerAnswer={text:string;source:"local"|"ai"|"handoff";handoff:boolean;products:{id:string;name:string;description:string;price:number}[]};
export const normalizeQuestion=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
/** Contact details and private order links are unnecessary for these answers. */
export function redactCustomerMessage(value:string){return value.trim().replace(/https?:\/\/\S+/gi,"[link omitido]").replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,"[e-mail omitido]").replace(/\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/g,"[documento omitido]").replace(/(?:\+?55[\s.-]*)?(?:\(?\d{2}\)?[\s.-]*)?\d{4,5}[\s.-]?\d{4}\b/g,"[contato omitido]").slice(0,700);}
export function assistantProducts(data:RestaurantData){return data.products.filter(p=>p.enabled&&lowestProductPrice(data,p)>0);}
export function relevantProducts(data:RestaurantData,question:string,limit=12){
 const terms=normalizeQuestion(question).split(" ").filter(t=>t.length>2&&!['uma','para','com','que','quero','tem','voces','pizza','pizzas','por','favor','qual','mais','ser','essa','isso'].includes(t));
 return assistantProducts(data).map((product,index)=>({product,index,score:terms.reduce((n,t)=>n+(normalizeQuestion(product.name).includes(t)?6:normalizeQuestion(product.description).includes(t)?2:0),0)+(product.featured?0.1:0)})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,limit).map(v=>v.product);
}
export function shopFacts(data:RestaurantData,siteOrderingAllowed:boolean,now=Date.now()):AssistantFact[]{
 const offers=data.promotions.filter(p=>isActivePromotion(data,p,now));
 return [
  {id:"store",title:"Sobre a loja",text:[data.name,data.description].filter(Boolean).join(". ")},
  {id:"hours",title:"Funcionamento",text:`A loja está ${data.isOpen?"aberta":"fechada"} para pedidos neste momento. ${data.hours?"Horário informado: "+data.hours:"A loja ainda não informou os horários."} O horário escrito é informativo; a disponibilidade atual aparece no cardápio.`},
  {id:"delivery",title:"Entrega",text:data.deliveryEnabled?`Há entrega. Prazo informado: ${data.eta}. ${data.deliveryZones.length?"O valor depende do bairro. Confira os bairros e a taxa no fechamento do pedido.":`Taxa cadastrada: ${money(data.deliveryFee)}.`} ${data.minOrder?`Pedido mínimo: ${money(data.minOrder)}.`:""}`:"A loja não está recebendo pedidos para entrega pelo cardápio."},
  {id:"pickup",title:"Retirada e endereço",text:data.pickupEnabled?`Retirada disponível. ${[data.address,data.city].filter(Boolean).join(" · ")||"Confirme o endereço com a loja antes de sair."}`:"Retirada não está habilitada neste cardápio."},
  {id:"payments",title:"Pagamento",text:`Formas cadastradas: ${data.payments.join(", ")}. ${siteOrderingAllowed&&data.pix.enabled?"O Pix antecipado aparece no fechamento. A pizzaria confere o recebimento no banco.":"Confirme a forma de pagamento com a loja. Não envie comprovantes nesta conversa."} Esta conversa não confirma pagamentos.`},
  {id:"ordering",title:"Como fazer seu pedido",text:`Escolha o produto, tamanho e quantidade, toque em Adicionar e abra o seu pedido. ${siteOrderingAllowed?"No fechamento, escolha entrega ou retirada, informe os dados solicitados e envie. Acompanhe a confirmação pelo link do pedido.":"Confira o resumo e envie pelo botão de WhatsApp. A loja confirma disponibilidade, entrega e pagamento."} Conversar aqui não cria um pedido.`},
  {id:"half",title:"Meio a meio e bordas",text:`Você pode escolher até dois sabores no mesmo tamanho disponível. O preço usa ${data.halfRule==="max"?"o sabor de maior valor":"a média dos dois sabores"}. ${data.crusts.length?"Bordas cadastradas: "+data.crusts.map(c=>`${c.name} (${money(c.price)})`).join(", ")+".":"Não há bordas cadastradas neste momento."} O carrinho mostra o total antes de enviar.`},
  {id:"promotions",title:"Ofertas publicadas",text:offers.length?offers.map(p=>`${promotionLabel(data,p)}: ${money(p.price)}`).join(". "):"Não há promoção ativa publicada neste momento. Os preços disponíveis estão nos produtos."},
  {id:"tracking",title:"Acompanhar um pedido",text:"Use o link privado recebido ao enviar o pedido. Nele você acompanha o andamento e pode falar com a pizzaria. Este assistente não consulta pedidos ou pagamentos privados; para resolver um caso específico, fale com a loja."},
  ...data.assistant.faqs.map((faq,index)=>({id:"faq-"+index,title:faq.question,text:faq.answer})),
 ];
}
const empty=(text:string,source:CustomerAnswer['source']="local",handoff=false):CustomerAnswer=>({text,source,handoff,products:[]});
export function productCards(data:RestaurantData,products:Product[]){return products.map(p=>({id:p.id,name:p.name,description:p.description,price:lowestProductPrice(data,p)}));}
/** Known facts are rendered by the application, never invented by the model. */
export function localCustomerAnswer(data:RestaurantData,message:string,siteOrderingAllowed:boolean):CustomerAnswer|null{
 const q=normalizeQuestion(message),facts=shopFacts(data,siteOrderingAllowed),fact=(id:string)=>empty(facts.find(f=>f.id===id)!.text);
 if(/alerg|lactose|gluten|celiac|amendoim|intoleran|restricao|diabet|gravida|contamin/.test(q))return empty("Os ingredientes informados estão na descrição dos produtos. Para alergias, intolerâncias e risco de contaminação cruzada, confirme diretamente com a pizzaria antes de pedir. Eu não consigo garantir que um alimento seja seguro para uma restrição alimentar.","handoff",true);
 if(/\b(humano|atendente|pessoa|dono|reclamar|reclamacao|problema|cancelar|estorno|reembolso|cobranca)\b/.test(q))return empty("O contato da loja está disponível abaixo para você falar com a equipe. Nenhum pedido ou pagamento é alterado por esta conversa.","handoff",true);
 if(/meu pedido|meu pagamento|paguei|comprovante|chegou|atrasou|rastrea|status do pedido/.test(q))return {...fact("tracking"),handoff:true};
 if(/\b(hora|horas|horario|abre|abrem|fecha|fecham|aberto|aberta|funciona|funcionamento)\b/.test(q)&&!/site|como funciona/.test(q))return fact("hours");
 if(/\b(retira|retirada|endereco|localiza|onde fica|buscar na loja)\b/.test(q))return fact("pickup");
 if(/\b(entrega|entregam|frete|taxa|bairro|demora|prazo|delivery)\b/.test(q))return fact("delivery");
 if(/\b(pix|pagar|pagamento|dinheiro|cartao|credito|debito|troco)\b/.test(q))return fact("payments");
 if(/meio a meio|dois sabores|2 sabores|borda/.test(q))return fact("half");
 if(/promoc|oferta|desconto|cupom|combo/.test(q))return fact("promotions");
 if(/como (?:eu )?(?:faco|fazer|pedir|compro|comprar)|como funciona|\bsite\b|carrinho|finaliz|cadastro/.test(q))return fact("ordering");
 if(/^(oi|ola|bom dia|boa tarde|boa noite|tudo bem|obrigad[oa]|valeu)( |$)/.test(q)&&q.split(" ").length<=5)return empty(`Olá! Sou ${data.assistant.name}, da ${data.name}. Posso ajudar com sabores, preços, entrega, horários e como pedir.`);
 const custom=facts.filter(f=>f.id.startsWith("faq-")).find(f=>normalizeQuestion(f.title)===q);if(custom)return empty(custom.text);
 const terms=q.split(" ").filter(t=>t.length>3),products=relevantProducts(data,message,3),matched=products.filter(p=>terms.some(t=>normalizeQuestion(p.name).includes(t)));
 if(matched.length&&!/recomenda|sugere|sugest|melhor|indica|gosto|nao gosto|sem |evitar|barat|car[oa]|vegetari|vegana/.test(q))return {...empty("Encontrei estas opções no cardápio. Abra o produto para conferir os tamanhos, ingredientes e valores."),products:productCards(data,matched)};
 return null;
}
export function answerFromSelection(data:RestaurantData,raw:unknown,siteOrderingAllowed:boolean,allowedProducts:Product[]):CustomerAnswer{
 const selection=assistantSelection.parse(raw),facts=shopFacts(data,siteOrderingAllowed);
 if(new Set(selection.factIds).size!==selection.factIds.length||new Set(selection.productIds).size!==selection.productIds.length)throw Error("Resposta repetida.");
 if(selection.factIds.some(id=>!facts.some(f=>f.id===id))||selection.productIds.some(id=>!allowedProducts.some(p=>p.id===id)))throw Error("Resposta fora do contexto da loja.");
 const products=productCards(data,selection.productIds.map(id=>allowedProducts.find(p=>p.id===id)!));
 if(selection.intent==="handoff"||!selection.factIds.length&&!products.length)return empty("Essa informação não está confirmada nos dados da loja. Fale com a pizzaria para conferir; o contato está logo abaixo.","handoff",true);
 return {text:[selection.intent==="recommendation"?"Estas opções do cardápio podem ajudar na sua escolha. Confira os ingredientes e o tamanho; a loja pode orientar a quantidade para o seu grupo.":"Encontrei estas informações da loja:",...selection.factIds.map(id=>facts.find(f=>f.id===id)!.text)].join("\n\n"),source:"ai",handoff:false,products};
}
export function customerAssistantPrompt(data:RestaurantData,message:string,history:{question:string;answer:string}[],siteOrderingAllowed:boolean){
 const products=relevantProducts(data,message+" "+history.slice(-1).map(t=>t.question).join(" "));
 return {task:"customer-support",store:{name:data.name,tone:data.assistant.tone,facts:shopFacts(data,siteOrderingAllowed)},products:products.map(p=>({id:p.id,name:p.name,description:p.description.slice(0,250),price:lowestProductPrice(data,p)})),history:history.slice(-4).map(t=>({question:t.question.slice(0,700),answer:t.answer.slice(0,700)})),message};
}
