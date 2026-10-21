import {z} from "zod";
import type {RestaurantData,ThemeId} from "./domain.ts";
import {isCatalogueId} from "./menu-catalogue.ts";
import {menuIdentityId} from "./menu-identity.ts";
import {brandPaletteFromBriefing} from "./brand-palette.ts";
export {brandPaletteFromBriefing};

export const presentationSchema=z.object({
  layout:z.enum(["cards","list","poster","compact"]),
  hero:z.enum(["split","cover","compact"]),
  font:z.enum(["modern","serif","bold"]),
  corners:z.enum(["soft","square"]),
  identity:menuIdentityId.optional(),
  catalogueId:z.string().max(100).refine(isCatalogueId,"Escolha um modelo do catálogo.").optional(),
  palette:z.object({background:z.string().regex(/^#[0-9a-fA-F]{6}$/),surface:z.string().regex(/^#[0-9a-fA-F]{6}$/),secondary:z.string().regex(/^#[0-9a-fA-F]{6}$/),text:z.string().regex(/^#[0-9a-fA-F]{6}$/),muted:z.string().regex(/^#[0-9a-fA-F]{6}$/),line:z.string().regex(/^#[0-9a-fA-F]{6}$/)}).strict().optional(),
  motif:z.enum(["sea-cheese","two-tone"]).optional(),
}).strict();
export type MenuPresentation=z.infer<typeof presentationSchema>;
export const layoutNames:Record<MenuPresentation["layout"],string>={cards:"Cartões",list:"Lista artesanal",poster:"Fotos em destaque",compact:"Lista compacta"};
export function presentationForTheme(theme:ThemeId):MenuPresentation{
  switch(theme){
    case "editorial":return {layout:"list",hero:"split",font:"serif",corners:"soft"};
    case "dark":return {layout:"poster",hero:"cover",font:"bold",corners:"square"};
    case "classic":return {layout:"compact",hero:"compact",font:"modern",corners:"square"};
    case "playful":return {layout:"cards",hero:"split",font:"bold",corners:"soft"};
  }
}
// Older published menus keep their composition until the owner chooses a new one.
export function menuPresentation(data:Pick<RestaurantData,"presentation">):MenuPresentation{
  return data.presentation||{layout:"cards",hero:"split",font:"modern",corners:"soft"};
}
export function designFromMessage(message:string,data:RestaurantData,theme?:ThemeId):Partial<RestaurantData>{
  const m=message.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const chosen=theme||(/escuro|noturno|preto|black|premium|luxo|luxuos|sofistic/.test(m)?"dark":/artesanal|rustic|lenha|tradicional|italia/.test(m)?"editorial":/familia|colorido|divertido/.test(m)?"playful":/claro|branco|minimal|limpo|essencial|compact/.test(m)?"classic":undefined);
  const designWords=/lista|colunas?|cartoes|cards|quadrad|compact|minimal|fotos? grandes?|fotos? em destaque|sem fotos?|capa|tipografia|letras?|fonte|arredond|cantos?|design|visual|estilo|layout|artesanal|rustic|lenha|tradicional|italia|escuro|noturno|preto|premium|luxo|luxuos|sofistic|delivery|chamativ|familia|colorido|claro|limpo/;
  const patch:Partial<RestaurantData>={};if(chosen)patch.theme=chosen;
  if(designWords.test(m)||theme){
    const p={...(chosen?presentationForTheme(chosen):menuPresentation(data))};
    if(/lista|uma coluna|sem (?:os )?(?:cartoes|quadrados)/.test(m))p.layout="list";
    if(/cartoes|cards|duas colunas|grade/.test(m))p.layout="cards";
    if(/fotos? grandes?|fotos? em destaque|foco nas fotos|vitrine|premium|luxuos/.test(m)){p.layout="poster";p.hero="cover";}
    if(/compact|sem fotos?|sem imagens?|so (?:os )?(?:nomes|textos)/.test(m)){p.layout="compact";p.hero="compact";}
    if(/delivery (?:direto|rapido)|pedido (?:rapido|facil)/.test(m)){p.layout="list";p.hero="compact";}
    if(/sem capa|cabecalho (?:pequeno|curto|compacto)/.test(m))p.hero="compact";
    else if(/capa (?:grande|inteira)|foto de fundo/.test(m))p.hero="cover";
    if(/serifa|elegante|italia|artesanal|sofistic/.test(m))p.font="serif";
    if(/letras? (?:fortes?|grandes?)|fonte (?:forte|grossa)|impacto/.test(m))p.font="bold";
    if(/moderno|sem serifa/.test(m))p.font="modern";
    if(/cantos? retos?|sem arredond|quadrad/.test(m))p.corners="square";
    else if(/arredond|cantos? suaves?/.test(m))p.corners="soft";
    patch.presentation=p;
  }
  const hex=message.match(/#[a-fA-F0-9]{6}\b/)?.[0];
  if(hex)patch.accent=hex;
  else for(const [word,color] of [["vermelho","#dc3828"],["laranja","#d55b28"],["amarelo","#dfae28"],["verde","#37634a"],["azul","#296bac"],["dourado","#b18c43"],["mussarela","#a77c36"],["mozzarella","#a77c36"],["creme","#a77c36"]])if(m.includes(word)){patch.accent=color;break;}
  if(!patch.accent&&/italia/.test(m))patch.accent="#37634a";
  return patch;
}
