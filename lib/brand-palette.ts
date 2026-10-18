/** Deterministic visual language adapter. CSS/HTML carries copy and color;
 * no generated image, AI token, or remote model is used by preview cards.
 */
export type BrandPalette={
 background:string;surface:string;secondary:string;text:string;muted:string;line:string;
};
export type ResolvedBrandPalette={primary:string;palette:BrandPalette;motif:"sea-cheese"|"two-tone"};
const norm=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const colors=[
 {name:"azul",pattern:/\bazul(?:[- ](?:do?\s+)?mar|[- ]marinho|\s+oceano)?\b|\boceano\b|\bmarinho\b/g,hex:"#2169AC"},
 {name:"amarelo",pattern:/\bamarel[oa](?:[- ](?:de\s+)?queijo)?\b|\bcor\s+de\s+queijo\b|\bamanteigad[oa]\b/g,hex:"#F2BD38"},
 {name:"verde",pattern:/\bverde(?:[- ]escuro)?\b/g,hex:"#346F4D"},
 {name:"vermelho",pattern:/\bvermelh[oa]\b/g,hex:"#BD3935"},
 {name:"laranja",pattern:/\blaranja\b|\bcobre\b/g,hex:"#C57139"},
 {name:"roxo",pattern:/\brox[oa]\b|\bberinjela\b/g,hex:"#663B7D"},
 {name:"rosa",pattern:/\bros[ao]\b|\bcoral\b/g,hex:"#BA557C"},
 {name:"dourado",pattern:/\bdourad[oa]\b|\bouro\b/g,hex:"#C5A344"},
 {name:"preto",pattern:/\bpret[oa]\b|\bblack\b/g,hex:"#242733"},
 {name:"branco",pattern:/\bbranc[oa]\b/g,hex:"#F6F4EC"},
] as const;
const warm=new Set(["amarelo","laranja","dourado"]);
const dark=new Set(["preto"]);
export function brandPaletteFromBriefing(briefing:string,feedback=""):ResolvedBrandPalette|null{
 const input=norm((feedback.trim()||briefing).slice(0,2200));
 const found:{name:string;hex:string;position:number}[]=[];
 for(const spec of colors){
   for(const match of input.matchAll(spec.pattern)){
    const previous=input.slice(Math.max(0,(match.index||0)-17),match.index||0);
    if(/\b(?:sem|nao|evitar|tira|retira)\s+(?:o\s+|a\s+|cor\s+)?$/.test(previous))continue;
    found.push({name:spec.name,hex:spec.hex,position:match.index||0});
   }
 }
 found.sort((a,b)=>a.position-b.position);
 const ordered=[...new Map(found.map(v=>[v.name,v])).values()].sort((a,b)=>a.position-b.position);
 if(ordered.length<2)return null;
 const seaCheese=ordered.some(x=>x.name==="azul")&&ordered.some(x=>x.name==="amarelo")&&
  /queijo|mar|oceano/.test(input);
 const preferred=seaCheese?ordered.find(x=>x.name==="azul")!:ordered.at(-1)!;
 const others=ordered.filter(x=>x.name!==preferred.name);
 const secondary=seaCheese?ordered.find(x=>x.name==="amarelo")!:others.at(-1)!;
 const darkMode=dark.has(preferred.name)||(/escuro|dark|noturno/.test(input)&&!seaCheese);
 const cheese=warm.has(secondary.name);
 const palette:BrandPalette=darkMode
  ?{background:"#151B24",surface:"#252D37",secondary:secondary.hex,text:"#F6F5EC",muted:"#D4DAD7",line:"#4B5566"}
  :seaCheese?{background:"#FFF2B6",surface:"#FFFCED",secondary:"#F2BD38",text:"#153850",muted:"#4C6474",line:"#DAC879"}
  :cheese?{background:"#FFF1CB",surface:"#FFFCF1",secondary:secondary.hex,text:"#27383E",muted:"#536971",line:"#D8CAA5"}
  :{background:"#F1F5F6",surface:"#FFFFFF",secondary:secondary.hex,text:"#233340",muted:"#586A74",line:"#C7D5DC"};
 return {primary:preferred.hex,palette,motif:seaCheese?"sea-cheese":"two-tone"};
}

/** Keep multi-turn recolors distinct from a paired-color instruction.
 * "verde\nAgora azul" is a replacement, not a green/blue brand identity.
 */
export function resolveBrandPalette(briefing:string,feedback=""):ResolvedBrandPalette|null{
 if(!feedback.trim())return brandPaletteFromBriefing(briefing);
 const last=feedback.split(/\r?\n+|[.;]\s+/).map(x=>x.trim()).filter(Boolean).at(-1)||"";
 const latest=brandPaletteFromBriefing(last);
 if(latest)return latest;
 const normalized=norm(last);
 const hasColorChange=/\b(?:azul|amarel[oa]|verde|vermelh[oa]|laranja|cobre|marinho|roxo|rosa|dourad[oa]|preto|branco|#[a-f0-9]{6})\b/.test(normalized);
 return hasColorChange?null:brandPaletteFromBriefing(briefing);
}
