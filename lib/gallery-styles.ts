import {menuIdentityId} from "./menu-identity.ts";
import {designFromMessage,brandPaletteFromBriefing,type MenuPresentation} from "./menu-design.ts";
import {defaultRestaurant,type RestaurantData,type ThemeId} from "./domain.ts";
import {nameFromBriefing} from "./studio-policy.ts";

/** Twelve identities built on the existing sale, cart, and checkout components. */
export const galleryStyles=[
 {id:"forno-classico",title:"Forno clássico",summary:"Editorial e artesanal",theme:"editorial",accent:"#a7462e",presentation:{layout:"list",hero:"split",font:"serif",corners:"square"}},
 {id:"noite-premium",title:"Noite premium",summary:"Fotos grandes, fundo escuro",theme:"dark",accent:"#dd4b35",presentation:{layout:"poster",hero:"cover",font:"bold",corners:"square"}},
 {id:"essencial",title:"Essencial",summary:"Informações diretas, sem excesso",theme:"classic",accent:"#bb392b",presentation:{layout:"compact",hero:"compact",font:"modern",corners:"square"}},
 {id:"familia",title:"Casa da família",summary:"Cartões acolhedores",theme:"playful",accent:"#c06c2d",presentation:{layout:"cards",hero:"split",font:"bold",corners:"soft"}},
 {id:"atelier",title:"Ateliê da pizza",summary:"Vitrine clara e fotos em destaque",theme:"editorial",accent:"#52734e",presentation:{layout:"poster",hero:"split",font:"serif",corners:"soft"}},
 {id:"urbano",title:"Delivery urbano",summary:"Lista ágil e visual noturno",theme:"dark",accent:"#e86638",presentation:{layout:"list",hero:"compact",font:"bold",corners:"square"}},
 {id:"trattoria",title:"Trattoria",summary:"Organização compacta e sofisticada",theme:"classic",accent:"#3e6a54",presentation:{layout:"compact",hero:"split",font:"serif",corners:"soft"}},
 {id:"festival",title:"Festival de sabores",summary:"Cartões e ofertas em evidência",theme:"playful",accent:"#ba3b37",presentation:{layout:"cards",hero:"cover",font:"modern",corners:"soft"}},
 {id:"forno-brasa",title:"Forno & Brasa",summary:"Fogo, cobre e destaque artesanal",theme:"dark",accent:"#b55c31",presentation:{layout:"poster",hero:"cover",font:"serif",corners:"square"}},
 {id:"napoli-rua",title:"Napoli de Rua",summary:"Azul italiano e vitrine alternada",theme:"classic",accent:"#1346a0",presentation:{layout:"list",hero:"split",font:"modern",corners:"square"}},
 {id:"fatia-pop",title:"Fatia Pop",summary:"Coral, berinjela e mosaico de sabores",theme:"playful",accent:"#a52a43",presentation:{layout:"cards",hero:"compact",font:"bold",corners:"soft"}},
 {id:"pizza-vinho",title:"Pizza & Vinho",summary:"Bordô e uma carta de bistrô",theme:"editorial",accent:"#701c32",presentation:{layout:"compact",hero:"split",font:"serif",corners:"square"}},
] as const satisfies readonly {id:string;title:string;summary:string;theme:ThemeId;accent:string;presentation:MenuPresentation}[];
export type GalleryStyleId=(typeof galleryStyles)[number]["id"];
/** Short example copy belongs to the visual direction, not to the owner's products. */
export const galleryVoices:Record<GalleryStyleId,{tagline:string;description:string}>={
 "forno-classico":{tagline:"O sabor começa no forno.",description:"Tradição que você sente em cada fatia."},
 "noite-premium":{tagline:"Sua noite merece mais.",description:"Pizzas marcantes. Uma experiência à altura."},
 essencial:{tagline:"Escolha. Peça. Aproveite.",description:"Seu pedido, direto ao ponto."},
 familia:{tagline:"Todo mundo à mesa.",description:"Sabores para reunir a família."},
 atelier:{tagline:"Pizza feita com intenção.",description:"Ingredientes, técnica e muito sabor."},
 urbano:{tagline:"Bateu a fome? Pede.",description:"Seu delivery favorito, em poucos toques."},
 trattoria:{tagline:"Buona pizza, bella vita.",description:"Da nossa cozinha para o seu momento."},
 festival:{tagline:"Hoje tem pizza!",description:"Combos, sabores e muita vontade de repetir."},
 "forno-brasa":{tagline:"Feita no fogo. Servida no capricho.",description:"Seu próximo sabor começa aqui."},
 "napoli-rua":{tagline:"Da massa ao primeiro pedaço.",description:"Escolha os sabores para o seu momento."},
 "fatia-pop":{tagline:"Sua próxima fatia favorita.",description:"Encontre seu sabor e faça seu pedido."},
 "pizza-vinho":{tagline:"Uma boa pizza. Uma boa companhia.",description:"Sabores para aproveitar com calma."},
};
export const galleryStyleId=menuIdentityId;
export function galleryReference(id:GalleryStyleId){return `/assets/style-references/${id}.webp`;}
const normalized=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const signals:Record<GalleryStyleId,RegExp>={
 "forno-classico":/artesanal|tradicional|italia|classico|lenha|rustic/,
 "noite-premium":/escuro|preto|premium|luxo|noturno|foto|impact/,
 essencial:/minimal|compact|simples|objetiv|rapido|limpo/,
 familia:/familia|acolhedor|colorid|crianc|caseir/,
 atelier:/claro|foto|elegant|moderno|natural|verde/,
 urbano:/delivery|noturno|urbano|venda|direto|preto/,
 trattoria:/sofistic|italia|serif|refinad|organizado/,
 festival:/promoc|oferta|combo|chamativ|alegre|festa/,
 "forno-brasa":/brasa|fogo|forno|cobre|rustic/,
 "napoli-rua":/napoli|italia|azul|rua|alternad/,
 "fatia-pop":/pop|coral|mosaico|berinjela|expressiv/,
 "pizza-vinho":/vinho|bistro|bordo|encontro|companhia/,
};
/** Indicates whether the free local style engine understands at least one explicit design instruction.
 * Unrecognized requests should be retained for the authenticated AI studio, never treated as applied. */
export function supportsLocalRefinement(message:string){
 const m=normalized(message);
 return /(?:#[a-f0-9]{6}\b|escuro|preto|noturno|claro|branco|vermelho|laranja|amarelo|verde|azul|dourado|queijo|oceano|marinho|cor de queijo|azul de mar|lista|uma coluna|duas colunas|cartoes|cards|grade|fotos? grandes?|fotos? em destaque|vitrine|sem capa|capa grande|capa inteira|foto de fundo|sem serifa|serifa|elegante|italia|artesanal|letras? (?:fortes?|grandes?)|fonte (?:forte|grossa)|arredond|cantos? (?:retos?|suaves?)|quadrad|compact|minimal|sem fotos?|premium|luxuos|sofistic|delivery (?:direto|rapido)|(?:slogan|frase|chamada)\s*[:=])/.test(m);
}
/** Three balanced rounds, four distinct compositions in each, zero provider calls. */
export function suggestedGalleryStyles(briefing:string,feedback=""){
 const prompt=normalized((briefing+" "+feedback).slice(0,2200));
 const weighted=galleryStyles.map((s,index)=>({s,index,weight:signals[s.id].test(prompt)?2:0}));
 weighted.sort((a,b)=>b.weight-a.weight||a.index-b.index);
 const ordered:GalleryStyleId[]=[],remaining=[...weighted];
 while(remaining.length){
  const layouts=new Set<string>();
  for(let i=0;i<remaining.length&&layouts.size<4;){
   const {s}=remaining[i];
   if(layouts.has(s.presentation.layout)){i++;continue;}
   layouts.add(s.presentation.layout);ordered.push(s.id);remaining.splice(i,1);
  }
 }
 return ordered;
}
export function galleryStyle(id:GalleryStyleId){return galleryStyles.find(s=>s.id===id)!;}
/** Preserves all pricing, product, Pix, and checkout data. */
export function galleryDesign(data:RestaurantData,id:GalleryStyleId,briefing:string,feedback=""):RestaurantData{
 const preset=galleryStyle(id);
 const requested=designFromMessage(briefing,data);
 const voice=galleryVoices[id];
 const palette=brandPaletteFromBriefing(briefing,feedback)||brandPaletteFromBriefing(briefing);
 const requestWords=normalized(briefing);
 // Only honor explicit geometry preferences; keep the preset layouts diverse.
 const geometry={
  ...(/fotos? grandes?|fotos? em destaque|capa grande|capa inteira|foto de fundo/.test(requestWords)?{hero:"cover" as const}:{}),
  ...(/\bserifa\b|elegant|artesanal|sofistic/.test(requestWords)?{font:"serif" as const}:{}),
  ...(/arredond|cantos? suaves?/.test(requestWords)?{corners:"soft" as const}:{}),
  ...(/\b(lista|compacto|cartoes|cards|grade)\b/.test(requestWords)&&requested.presentation?{layout:requested.presentation.layout}:{})
 };
 const seaCopy=palette?.motif==="sea-cheese"?{
  tagline:["O sabor do forno encontra o mar.","Uma onda de sabor na sua noite.","Queijo dourado, pizza do seu jeito.","O encontro do mar com o forno.","Do mar ao forno, feito para você.","Seu sabor favorito, com brisa de verão.","Queijo no ponto. Pedido no caminho.","Sabores que chegam como uma onda.","Uma maré de pizzas deliciosas.","Azul do mar. Queijo dourado.","Uma fatia cheia de verão.","Seu momento com sabor de mar."][galleryStyles.findIndex(p=>p.id===id)],
  description:"Pizza feita para aproveitar cada fatia."
 }:null;
 const base={...data,theme:preset.theme,accent:palette?.primary||requested.accent||preset.accent,
   tagline:seaCopy?.tagline||voice.tagline,description:seaCopy?.description||voice.description,
   presentation:{...preset.presentation,...geometry,identity:id,...(palette?{palette:palette.palette,motif:palette.motif}:{})}};
 let next:RestaurantData=base;
 // Each turn is applied to the previous result: a later colour must replace an earlier one.
 for(const turn of feedback.split(/\r?\n+|[.;]\s+/).filter(Boolean)){
  const extras=designFromMessage(turn,next),words=normalized(turn);
  const colours=[...turn.matchAll(/#[a-fA-F0-9]{6}\b|\b(?:vermelho|laranja|amarelo|verde|azul|dourado)\b/gi)];
  const last=colours.at(-1);if(last){if(/\b(?:sem|nao|não)\s*$/.test(turn.slice(0,last.index).toLowerCase()))delete extras.accent;else extras.accent=designFromMessage(last[0],next).accent;}
  const presentation=extras.presentation?{...next.presentation!,
   ...(/lista|colunas?|cartoes|cards|grade|fotos? grandes?|em destaque|vitrine|compact|sem fotos?|premium|luxuos|delivery (?:direto|rapido)/.test(words)?{layout:extras.presentation.layout}:{}),
   ...(/sem capa|cabecalho|capa grande|capa inteira|foto de fundo|compact|sem fotos?|premium|luxuos|delivery (?:direto|rapido)/.test(words)?{hero:extras.presentation.hero}:{}),
   ...(/serifa|elegant|italia|artesanal|sofistic|letras?|fonte|tipografia|moderno/.test(words)?{font:extras.presentation.font}:{}),
   ...(/cantos?|arredond|quadrad/.test(words)?{corners:extras.presentation.corners}:{})
  }:next.presentation;
  next={...next,...extras,presentation};
 }
 if(palette){
  // The two-tone colors have distinct roles, not twelve cards in one flat color.
  next={...next,accent:palette.primary,presentation:{...next.presentation!,palette:palette.palette,motif:palette.motif}};
 }
 const brand=nameFromBriefing(briefing);
 const tagline=[...(briefing+"\n"+feedback).matchAll(/(?:slogan|frase|chamada)\s*[:=]\s*["“]?([^\n"”]{2,120})/gi)].at(-1)?.[1]?.trim();
 if(brand)next.name=brand;
 if(tagline)next.tagline=tagline;
 return next;
}
export function chosenGalleryDraft(name:string,id:GalleryStyleId,briefing:string,feedback=""){
 const base=defaultRestaurant(name);
 const draft=galleryDesign(base,id,briefing,feedback);
 return {...draft,name}; // Explicit account form is authoritative for legal/display name.
}
