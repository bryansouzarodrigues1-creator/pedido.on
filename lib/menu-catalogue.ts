import type {MenuPresentation} from "./menu-design.ts";
import type {ThemeId} from "./domain.ts";

export type CatalogueStyle={id:string;title:string;summary:string;family:string;keywords:readonly string[];theme:ThemeId;accent:string;texture:"wood"|"paper"|"linen"|"stone"|"none";density:"airy"|"balanced"|"dense";photo:"large"|"medium"|"small";baseId:string;presentation:MenuPresentation;voice:{tagline:string;description:string}};
const families=[
 {id:"madeira-nostalgica",name:"Madeira & memória",base:"forno-classico",theme:"editorial",texture:"wood",keywords:["madeira","nostalgia","nostalgico","rustico","antigo","casa de avo","acolhedor"],tagline:"O sabor das boas lembranças.",description:"Receitas que acolhem. Histórias à mesa."},
 {id:"jornal-vintage",name:"Jornal da casa",base:"pizza-vinho",theme:"editorial",texture:"paper",keywords:["vintage","retro","jornal","papel","antigamente","nostalgia"],tagline:"Um clássico que dá vontade de repetir.",description:"Boas receitas atravessam o tempo."},
 {id:"forno-cobre",name:"Fogo & cobre",base:"forno-brasa",theme:"dark",texture:"wood",keywords:["brasa","fogo","lenha","cobre","forno","artesanal"],tagline:"O capricho começa no forno.",description:"Massa, calor e tempo no ponto certo."},
 {id:"trattoria-casa",name:"Trattoria da casa",base:"trattoria",theme:"classic",texture:"linen",keywords:["italiano","italiana","trattoria","tradicional","cantina"],tagline:"Da nossa cozinha para sua mesa.",description:"Tradição italiana com o sabor da casa."},
 {id:"azul-mar",name:"Mar & queijo",base:"napoli-rua",theme:"classic",texture:"none",keywords:["azul","mar","praia","oceano","queijo","amarelo"],tagline:"Uma fatia com brisa de verão.",description:"Sabor que combina com bons encontros."},
 {id:"noite-elegante",name:"Noite elegante",base:"noite-premium",theme:"dark",texture:"none",keywords:["premium","luxo","elegante","escuro","preto","sofisticado"],tagline:"Sua noite merece esse sabor.",description:"Ingredientes marcantes, do primeiro ao último pedaço."},
 {id:"delivery-urbano",name:"Rua & forno",base:"urbano",theme:"dark",texture:"stone",keywords:["delivery","urbano","rapido","industrial","concreto","cidade"],tagline:"Bateu a fome? Escolha sua fatia.",description:"Seu sabor favorito, sem complicação."},
 {id:"jardim-natural",name:"Jardim de sabores",base:"atelier",theme:"editorial",texture:"linen",keywords:["verde","natural","jardim","organico","vegetariano","botanico"],tagline:"Feita com ingredientes e intenção.",description:"Frescor, cuidado e muito sabor."},
 {id:"familia-mesa",name:"Mesa de família",base:"familia",theme:"playful",texture:"linen",keywords:["familia","criancas","acolhedor","caseiro","juntos","aconchegante"],tagline:"Sempre cabe mais um à mesa.",description:"Pizzas para dividir e momentos para guardar."},
 {id:"festival-pop",name:"Festival de cores",base:"fatia-pop",theme:"playful",texture:"none",keywords:["pop","colorido","divertido","vibrante","jovem","criativo"],tagline:"Seu próximo sabor favorito está aqui.",description:"Cores, combinações e vontade de experimentar."},
 {id:"bistro-vinho",name:"Bistrô da noite",base:"pizza-vinho",theme:"editorial",texture:"paper",keywords:["vinho","bordo","bistro","romantico","encontro","refinado"],tagline:"Boa pizza. Boa companhia.",description:"Uma carta de sabores para aproveitar sem pressa."},
 {id:"minimal-claro",name:"Essência",base:"essencial",theme:"classic",texture:"none",keywords:["minimalista","simples","branco","limpo","claro","direto"],tagline:"O essencial é uma boa pizza.",description:"Escolha seu sabor. Aproveite seu momento."},
] as const;
const palettes=[
 {id:"mel",name:"Mel",accent:"#87472f",bg:"#eee0c7",surface:"#fff8e9",secondary:"#6a713e",text:"#30271e",muted:"#71634e",line:"#d1b997",keywords:["marrom","mel","madeira","bege","nostalgia"]},
 {id:"oliva",name:"Oliva",accent:"#3e6247",bg:"#eaece0",surface:"#fbfbf0",secondary:"#b58532",text:"#263c2b",muted:"#64705d",line:"#c6ceba",keywords:["verde","oliva","natural"]},
 {id:"azulejo",name:"Azulejo",accent:"#17498c",bg:"#edf2f4",surface:"#fffdf5",secondary:"#e9bc42",text:"#17314d",muted:"#5b7188",line:"#c2d1e0",keywords:["azul","amarelo","mar","queijo"]},
 {id:"terracota",name:"Terracota",accent:"#ab3b2d",bg:"#f4e4dc",surface:"#fff8f1",secondary:"#c58b38",text:"#41251f",muted:"#806253",line:"#dfbdb0",keywords:["vermelho","terracota","laranja","cobre"]},
 {id:"ameixa",name:"Ameixa",accent:"#743146",bg:"#ede4eb",surface:"#fff8fc",secondary:"#ab854b",text:"#382532",muted:"#78616e",line:"#d1b9c9",keywords:["bordo","vinho","rosa","roxo","romantico"]},
] as const;
const compositions=[
 {id:"editorial",name:"Editorial",layout:"list",hero:"split",font:"serif",corners:"square",density:"airy",photo:"medium",keywords:["editorial","letras grandes","serifa","espacoso"]},
 {id:"fotografico",name:"Fotográfico",layout:"poster",hero:"cover",font:"bold",corners:"soft",density:"balanced",photo:"large",keywords:["fotos grandes","foto grande","vitrine","fotografia","capa grande"]},
 {id:"mosaico",name:"Mosaico",layout:"cards",hero:"split",font:"modern",corners:"soft",density:"balanced",photo:"medium",keywords:["cartoes","cards","grade","duas colunas","mosaico"]},
 {id:"carta",name:"Carta",layout:"compact",hero:"compact",font:"serif",corners:"square",density:"dense",photo:"small",keywords:["compacto","lista","sem fotos","carta","pequeno"]},
] as const;
export const catalogueStyles:CatalogueStyle[]=families.flatMap(f=>palettes.flatMap(p=>compositions.map(c=>{
 const dark=f.theme==="dark",id=f.id+"-"+p.id+"-"+c.id;
 return {id,title:f.name+" · "+p.name+" · "+c.name,summary:c.name+" · "+(f.texture==="wood"?"textura de madeira":f.texture==="paper"?"papel vintage":f.texture==="linen"?"textura de linho":f.texture==="stone"?"concreto":"superfícies lisas"),family:f.name,keywords:[...f.keywords,...p.keywords,...c.keywords],baseId:f.base,theme:f.theme,accent:dark?({mel:"#e9b57f",oliva:"#a6cf9b",azulejo:"#86bef5",terracota:"#fb9c71",ameixa:"#efadcf"}[p.id]):p.accent,texture:f.texture,density:c.density,photo:c.photo,
 presentation:{layout:c.layout,hero:c.hero,font:c.font,corners:c.corners,identity:f.base,catalogueId:id,palette:{background:dark?"#191b20":p.bg,surface:dark?"#26282d":p.surface,secondary:p.secondary,text:dark?"#fff5e7":p.text,muted:dark?"#c8beb2":p.muted,line:dark?"#4a4543":p.line}},voice:{tagline:f.tagline,description:f.description}};
})));
const registry=new Map(catalogueStyles.map(s=>[s.id,s]));
export function catalogueStyle(id:string|undefined):CatalogueStyle|undefined{return id?registry.get(id):undefined;}
export function isCatalogueId(id:string):boolean{return registry.has(id);}
export function catalogueClass(id:string|undefined){const s=catalogueStyle(id);return s?" catalogue-template texture-"+s.texture+" density-"+s.density+" photo-"+s.photo:"";}
export function catalogueScore(style:CatalogueStyle,brief:string){
 const text=" "+brief.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()+" ";let score=0;
 for(const word of style.keywords){const at=text.indexOf(word);if(at<0||/\b(?:sem|nao quero|evitar)\s*$/.test(text.slice(Math.max(0,at-14),at)))continue;score+=word.length>8?5:3;}
 if(/madeira/.test(text)&&style.id.startsWith("madeira-nostalgica"))score+=15;
 if(/nostalgi|retro|vintage/.test(text)&&style.id.startsWith("madeira-nostalgica"))score+=8;
 return score;
}
