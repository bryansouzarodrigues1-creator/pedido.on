import {z} from "zod";
import {designFromMessage,type MenuPresentation} from "./menu-design.ts";
import {defaultRestaurant,type RestaurantData,type ThemeId} from "./domain.ts";
import {nameFromBriefing} from "./studio-policy.ts";

/** Eight real menu compositions built on the same sale, cart, and checkout components. */
export const galleryStyles=[
 {id:"forno-classico",title:"Forno clássico",summary:"Editorial e artesanal",theme:"editorial",accent:"#a7462e",presentation:{layout:"list",hero:"split",font:"serif",corners:"square"}},
 {id:"noite-premium",title:"Noite premium",summary:"Fotos grandes, fundo escuro",theme:"dark",accent:"#dd4b35",presentation:{layout:"poster",hero:"cover",font:"bold",corners:"square"}},
 {id:"essencial",title:"Essencial",summary:"Informações diretas, sem excesso",theme:"classic",accent:"#bb392b",presentation:{layout:"compact",hero:"compact",font:"modern",corners:"square"}},
 {id:"familia",title:"Casa da família",summary:"Cartões acolhedores",theme:"playful",accent:"#c06c2d",presentation:{layout:"cards",hero:"split",font:"bold",corners:"soft"}},
 {id:"atelier",title:"Ateliê da pizza",summary:"Vitrine clara e fotos em destaque",theme:"editorial",accent:"#52734e",presentation:{layout:"poster",hero:"split",font:"serif",corners:"soft"}},
 {id:"urbano",title:"Delivery urbano",summary:"Lista ágil e visual noturno",theme:"dark",accent:"#e86638",presentation:{layout:"list",hero:"compact",font:"bold",corners:"square"}},
 {id:"trattoria",title:"Trattoria",summary:"Organização compacta e sofisticada",theme:"classic",accent:"#3e6a54",presentation:{layout:"compact",hero:"split",font:"serif",corners:"soft"}},
 {id:"festival",title:"Festival de sabores",summary:"Cartões e ofertas em evidência",theme:"playful",accent:"#ba3b37",presentation:{layout:"cards",hero:"cover",font:"modern",corners:"soft"}},
] as const satisfies readonly {id:string;title:string;summary:string;theme:ThemeId;accent:string;presentation:MenuPresentation}[];
export type GalleryStyleId=(typeof galleryStyles)[number]["id"];
export const galleryStyleId=z.enum(["forno-classico","noite-premium","essencial","familia","atelier","urbano","trattoria","festival"]);
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
};
/** Indicates whether the free local style engine understands at least one explicit design instruction.
 * Unrecognized requests should be retained for the authenticated AI studio, never treated as applied. */
export function supportsLocalRefinement(message:string){
 const m=normalized(message);
 return /(?:#[a-f0-9]{6}\b|escuro|preto|noturno|claro|branco|vermelho|laranja|amarelo|verde|azul|dourado|lista|uma coluna|duas colunas|cartoes|cards|grade|fotos? grandes?|fotos? em destaque|vitrine|sem capa|capa grande|capa inteira|foto de fundo|sem serifa|serifa|elegante|italia|artesanal|letras? (?:fortes?|grandes?)|fonte (?:forte|grossa)|arredond|cantos? (?:retos?|suaves?)|quadrad|compact|minimal|sem fotos?|(?:slogan|frase|chamada)\s*[:=])/.test(m);
}
/** Stable ordering, four distinct geometries in each of two rounds, zero provider calls. */
export function suggestedGalleryStyles(briefing:string,feedback=""){
 const prompt=normalized((briefing+" "+feedback).slice(0,2200));
 const weighted=galleryStyles.map((s,index)=>({s,index,weight:signals[s.id].test(prompt)?2:0}));
 weighted.sort((a,b)=>b.weight-a.weight||a.index-b.index);
 const first:GalleryStyleId[]=[];
 for(const {s} of weighted)if(!first.some(id=>galleryStyles.find(row=>row.id===id)!.presentation.layout===s.presentation.layout))first.push(s.id);
 const remainder=weighted.map(row=>row.s.id).filter(id=>!first.includes(id));
 return [...first,...remainder];
}
export function galleryStyle(id:GalleryStyleId){return galleryStyles.find(s=>s.id===id)!;}
/** Preserves all pricing, product, Pix, and checkout data. */
export function galleryDesign(data:RestaurantData,id:GalleryStyleId,briefing:string,feedback=""):RestaurantData{
 const preset=galleryStyle(id);
 const requested=designFromMessage(briefing,data);
 const base={...data,theme:preset.theme,accent:requested.accent||preset.accent,presentation:{...preset.presentation}};
 let next:RestaurantData=base;
 // Each turn is applied to the previous result: a later colour must replace an earlier one.
 for(const turn of feedback.split(/\r?\n+|[.;]\s+/).filter(Boolean)){
  const extras=designFromMessage(turn,next),words=normalized(turn);
  const colours=[...turn.matchAll(/#[a-fA-F0-9]{6}\b|\b(?:vermelho|laranja|amarelo|verde|azul|dourado)\b/gi)];
  const last=colours.at(-1);if(last){if(/\b(?:sem|nao|não)\s*$/.test(turn.slice(0,last.index).toLowerCase()))delete extras.accent;else extras.accent=designFromMessage(last[0],next).accent;}
  const presentation=extras.presentation?{...next.presentation!,
   ...(/lista|colunas?|cartoes|cards|grade|fotos? grandes?|em destaque|vitrine|compact|sem fotos?/.test(words)?{layout:extras.presentation.layout}:{}),
   ...(/sem capa|cabecalho|capa grande|capa inteira|foto de fundo|compact|sem fotos?/.test(words)?{hero:extras.presentation.hero}:{}),
   ...(/serifa|elegant|italia|artesanal|letras?|fonte|tipografia|moderno/.test(words)?{font:extras.presentation.font}:{}),
   ...(/cantos?|arredond|quadrad/.test(words)?{corners:extras.presentation.corners}:{})
  }:next.presentation;
  next={...next,...extras,presentation};
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
