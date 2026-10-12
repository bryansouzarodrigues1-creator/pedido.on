export type ImageAsset="logo"|"cover"|"profile"|"product";
export type CreationTarget="image"|"visual"|ImageAsset;
export const defaultCreationTarget:CreationTarget="image";
export type ImageIntent={asset:ImageAsset|null;label:string};
export const imageLabels:Record<ImageAsset,string>={logo:"logo",cover:"capa",profile:"imagem de perfil",product:"foto do produto"};

/** Route an explicit image request before reserving a text generation. */
export function requestedImage(message:string):ImageIntent|null{
 const text=message.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
 const verbs=/\b(?:gere|gerar|gera|crie|criar|cria|faca|fazer|faz|desenhe|desenhar|produza|produzir|quero|preciso|gostaria)\b/g;
 const segments:string[]=[];
 for(const command of text.matchAll(verbs)){
  const before=text.slice(Math.max(0,command.index!-15),command.index);
  if(/\b(?:nao|sem)\s+(?:\w+\s+){0,2}$/.test(before))continue;
  const segment=text.slice(command.index!+command[0].length).split(/[.!?;\n]/,1)[0].slice(0,180);
  if(/^\s*(?:(?:um|uma|o|a|me|de)\s+)*(?:briefing|descricao|descricoes|texto|textos|prompt|prompts|ideia|ideias|sugestao|sugestoes)\b/.test(segment))continue;
  const firstAsset=segment.search(/\b(?:logo|logotipo|logomarca|capa|banner|avatar|foto|fotografia|imagem|imagens)\b/);
  if(firstAsset<0){
   // An art request need not say "image" or "photo". The owner's mobile request
   // was otherwise sent to the paid writing model instead of image generation.
   if(/\b(?:arte|artes|ilustracao|ilustracoes|desenho|desenhos)\b/.test(segment)||/^\s*(?:algo|alguma\s+coisa)\b/.test(segment)&&/\b(?:pizza|pizzas|queijo|queijos|forno|bebida|sabor)\b/.test(segment))segments.push(segment);
   continue;
  }
  if(firstAsset>110)continue;
  if(/\b(?:cardapio|layout|identidade|visual|cores|textos|descricoes)\b/.test(segment.slice(0,firstAsset)))continue;
  segments.push(segment);
 }
 if(!segments.length&&/^(?:um\s+|uma\s+|nova?\s+)?(?:logo|logotipo|logomarca|capa|banner|avatar|foto|fotografia|imagem|imagens)\b/.test(text)&&!/^logo\s+(?:depois|mais\s+tarde)/.test(text))segments.push(text);
 if(!segments.length)return null;
 const assets=new Set<ImageAsset>();let generic=false;
 for(const raw of segments){
  const segment=raw.replace(/\bsem\s+(?:texto\s+(?:e|ou)\s+)?(?:um\s+|uma\s+)?(?:logo|logotipo|logomarca|capa|banner|avatar|foto|fotografia|imagem)\b/g,"");
  let found=false;
  if(/\b(?:logo|logotipo|logomarca)\b/.test(segment)){assets.add("logo");found=true;}
  if(/\b(?:capa|banner)\b/.test(segment)){assets.add("cover");found=true;}
  if(/\b(?:avatar|(?:foto|imagem)\s+(?:de|do|para\s+o)\s+perfil)\b/.test(segment)){assets.add("profile");found=true;}
  if(!/\bperfil\b/.test(segment)&&/\b(?:foto|fotografia|imagem)\b[^.!?;\n]{0,60}\b(?:produto|pizza|pizzas|sabor|bebida)\b/.test(segment)){assets.add("product");found=true;}
  if(!found)generic=true;
 }
 const asset=assets.size===1&&!generic?[...assets][0]:null;
 return {asset,label:asset?imageLabels[asset]:"imagem"};
}

export function creationTarget(selected:CreationTarget,message:string,mode:"ai"|"local"){
 const intent=selected==="visual"||selected==="image"?requestedImage(message):null;
 const target:"visual"|ImageAsset=selected==="image"?intent?.asset||"cover":selected==="visual"&&mode==="ai"&&intent?.asset?intent.asset:selected;
 return {target,intent,
  needsChoice:selected==="visual"&&!!intent&&(!intent.asset||mode==="local")};
}
