import {requestedImage} from "./creation-intent.ts";
import {inspectMenuSourceText} from "./menu-source-links.ts";

export type AssistantScreen="menu"|"store"|"overview"|"studio";
export type AssistantAnswer=
 |{kind:"guide";reply:string;screen?:AssistantScreen;action?:string;sourceText?:string}
 |{kind:"rename";name:string}
 |{kind:"style";message:string};

/** Cost-free routing of known product questions and safe edits; never call a model for these. */
export function assistantAnswer(input:string):AssistantAnswer|null{
 const text=input.trim();
 const normalized=text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 if(!text||text.length>1600)return null;
 if(/^(?:(?:quero|preciso|gostaria de)\s+)?(?:assinar\b|(?:cancelar|gerenciar|renovar)\s+(?:minha\s+|a\s+)?assinatura\b|ver\s+(?:minhas\s+|as\s+)?faturas\b)/.test(normalized)&&!requestedImage(text))return {kind:"guide",screen:"store",action:"Abrir Pizzaria",reply:"Em Pizzaria, abra Minha conta e assinatura para ver o plano e as faturas. A assinatura usa o Asaas quando a conexão estiver habilitada; pagamento e cancelamento precisam da sua confirmação."};
 const source=inspectMenuSourceText(text);
 if(source.links.length&&!requestedImage(text))return {kind:"guide",screen:"menu",action:"Conferir no leitor",sourceText:text,reply:"Reconheci a referência da loja no iFood, sem usar créditos. Abra o leitor com esta mensagem para continuar sem perder a leitura guardada. No Cardápio, escolha Solicitar trazer meu cardápio via link para a equipe atender você. Ou importe PDF, fotos e texto; não há busca automática."};
 if(source.status==="unsupported"&&!source.menuText)return {kind:"guide",screen:"menu",action:"Abrir Cardápio",reply:"Esse endereço não é um link completo de loja do iFood reconhecido. Para importar agora, cole o texto completo, envie TXT/CSV ou fotos com os preços na aba Cardápio. Nenhuma geração de IA é necessária."};
 if(/^(?:por favor[, ]*)?(?:crie|criar|monte|montar|cadastre|cadastrar|quero(?: criar)?|preciso(?: de)?)(?:\s+(?:um|uma|novo|nova|o|a))*\s+(?:promocao|combo|oferta)\b/.test(normalized)&&!requestedImage(text))return {kind:"guide",screen:"menu",action:"Abrir Cardápio",reply:"Em Cardápio, abra Promoções e escolha Produto ou Combo. Selecione os itens, defina o preço e a validade e salve no rascunho. A oferta não precisa custar menos que o normal. Esse cadastro não usa créditos de IA."};
 const isQuestion=/^(como|onde|aonde|cade|qual|me (?:ensina|ensine|explica|explique|mostra|mostre)|preciso de ajuda|ajuda\b|o que e|para que serve)/.test(normalized)||/\?$/.test(text);
 if(isQuestion){
  // Import questions commonly mention products, prices and photos as well.
  // Route the explicit task before those broader editor topics.
  if(/ifood/.test(normalized)&&/\b(link|cnpj)\b/.test(normalized))return {kind:"guide",screen:"menu",action:"Abrir Cardápio",reply:/\bcnpj\b/.test(normalized)?"O CNPJ sozinho não importa o catálogo. A conexão oficial com o iFood depende de autorização da loja e ainda não está ativa aqui. Na aba Cardápio, cole o texto completo, envie TXT/CSV ou fotos com os preços para revisar e adicionar ao rascunho, sem créditos de IA.":"Na aba Cardápio, escolha Solicitar trazer meu cardápio via link. Pode colar a mensagem compartilhada inteira do iFood. Nossa equipe recebe o pedido e traz produtos, textos e fotos disponíveis para você conferir. Não há busca automática. Para importar agora, envie PDF, TXT/CSV, fotos ou o texto dos produtos, sem gastar tokens."};
  if(/(importa|\bocr\b|ifood|99food|captura|\bprint\b|\bpdf\b|(?:foto|imagem).*cardapio|cardapio.*(?:foto|imagem))/.test(normalized))return {kind:"guide",screen:"menu",action:"Enviar fotos do cardápio",reply:/\bpdf\b/.test(normalized)?"Na aba Cardápio, escolha Importar PDF ou fotos e envie o PDF diretamente. O leitor também aceita TXT/CSV, JPG, PNG e WebP, até 8 páginas por leitura. Confira nomes, tamanhos, preços e fotos antes de adicionar ao rascunho.":"Na aba Cardápio, use Importar cardápio. O leitor local aceita até 8 fotos por lote, incluindo prints enviados por você, e mostra produtos, tamanhos e preços para revisão. Confira os recortes de fotos antes de associá-los. Para cardápios grandes, importe em partes; o cadastro manual continua disponível."};
  if(/(borda|adicional)/.test(normalized))return {kind:"guide",screen:"menu",action:"Abrir Cardápio",reply:"Na aba Cardápio, abra Bordas recheadas para cadastrar cada borda e seu valor. Os adicionais de borda ficam disponíveis na escolha da pizza. Confira e publique a alteração quando terminar."};
  if(/(entrega|bairro|taxa|cep|frete)/.test(normalized))return {kind:"guide",screen:"store",action:"Abrir Pizzaria",reply:"Na aba Pizzaria, configure Entrega, os bairros atendidos, as taxas e o prazo. O cliente escolhe os produtos antes de informar o endereço; regiões não cadastradas podem exigir sua aprovação."};
  if(/(pix|pagamento|comprovante)/.test(normalized))return {kind:"guide",screen:"store",action:"Abrir Pizzaria",reply:"Em Pizzaria, configure os meios de pagamento e a chave Pix da própria pizzaria. Os comprovantes ficam nos detalhes dos pedidos; confira o recebimento no banco antes de marcar como pago. A assinatura da pizzaria.on é separada."};
  if(/(promoc|desconto|cupom|oferta|combo)/.test(normalized))return {kind:"guide",screen:"menu",action:"Abrir Cardápio",reply:"Em Cardápio, abra Promoções e escolha Produto ou Combo. Você define os itens, o preço e a validade; o valor não precisa ser menor que o normal. Salve no rascunho e atualize o cardápio. Categorias e cupons ficam em Mais opções."};
  if(/(preco|produto|pizza|sabor|categoria|foto)/.test(normalized))return {kind:"guide",screen:"menu",action:"Abrir Cardápio",reply:"Na aba Cardápio, adicione ou edite produtos. Cada pizza possui tamanhos e preços; confirme os valores e publique quando estiver pronto. Você também pode importar fotos de um cardápio e revisar o resultado antes de salvar."};
  if(/(cardapio|importar|ocr|ifood|99food|pdf|captura|print)/.test(normalized))return {kind:"guide",screen:"menu",action:"Enviar fotos do cardápio",reply:"Na aba Cardápio, use Importar cardápio. O leitor local aceita até 8 fotos por lote e mostra sabores, tamanhos e preços para revisão. Para cardápios grandes, importe em partes; o cadastro manual continua disponível."};
  if(/(pedido|notificac|chat|whatsapp|cliente)/.test(normalized))return {kind:"guide",screen:"overview",action:"Abrir Pedidos",reply:"Na aba Pedidos, acompanhe solicitações, pagamento, preparo e entrega. Abra o pedido para responder pelo chat. O WhatsApp é uma alternativa. Para alertas com app fechado, permita notificações e teste o PWA no celular."};
  if(/(plano|assinatura|pro\b|trial|teste gratuito)/.test(normalized))return {kind:"guide",screen:"store",action:"Abrir Pizzaria",reply:"O plano e a assinatura ficam em Minha conta e na aba Pizzaria. O teste de 30 dias é registrado, mas sua fiscalização comercial permanece desligada até a integração de cobrança ser validada."};
  if(/(logo|capa|perfil|imagem|ia|visual|cor|estilo|design)/.test(normalized))return {kind:"guide",screen:"studio",action:"Abrir Criar com IA",reply:"Em Criar com IA, escolha capa, logo, perfil, foto de produto ou visual/textos. Alterar cores simples pode usar a prévia local sem custo. Novas imagens são geradas só quando você pedir; confirme o resultado antes de publicar."};
  return {kind:"guide",reply:"Posso explicar o funcionamento da pizzaria.on e ajudar a configurar sua loja. Experimente perguntar sobre cardápio por foto, bordas, promoções, entrega, Pix, pedidos, notificações ou criação de imagens. Também posso preparar mudanças simples para você aprovar."};
 }
 // Photo or art requests are handled by the existing image routing.
 if(requestedImage(text))return null;
 const rename=text.match(/^(?:(?:por favor[, ]*)?(?:troque|mude|altere|renomeie|coloque|defina)\s+(?:(?:o|a)\s+)?(?:meu|minha|da pizzaria|do cardapio|do site)?\s*(?:nome|titulo|t[ií]tulo|nome da pizzaria|nome da loja)\s+(?:(?:para|pra|por|como|:|=)\s+))(.+)$/i);
 if(rename){
  const name=rename[1].trim().replace(/^["“]|["”]$/g,"").replace(/\.$/,"").trim();
  if(name.length<2||name.length>100)return {kind:"guide",reply:"O nome da pizzaria precisa ter entre 2 e 100 caracteres. Envie, por exemplo: Troque meu título para Bella Pizza Artesanal."};
  return {kind:"rename",name};
 }
 if(/\b(?:troque|mude|altere|configure|deixe|quero|prefiro)\b/.test(normalized)
    &&/\b(?:cor|cores|botao|botoes|tema|visual|layout|estilo|aparencia|cardapio)\b/.test(normalized)
    &&/(?:#[a-f0-9]{6}\b|\b(?:vermelh|preto|escur[oa]|azul|verde|laranja|amarelo|branco|claro|noturno|artesanal|dourado)\w*\b)/.test(normalized)){
  return {kind:"style",message:text};
 }
 return null;
}
