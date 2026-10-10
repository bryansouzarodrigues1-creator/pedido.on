import {z} from "zod";
import {slugify,type ThemeId} from "./domain.ts";

export const brandStyles=[
  {id:"editorial",name:"Artesanal",note:"Terracota, tradição e acolhimento.",accent:"#BD391D",paper:"#F5E9D7",ink:"#352619",phrase:"Boa pizza. Bons momentos."},
  {id:"classic",name:"Essencial",note:"Claro, leve e fácil de reconhecer.",accent:"#C72C35",paper:"#FFF9F2",ink:"#282A26",phrase:"Seu sabor favorito está aqui."},
  {id:"dark",name:"Noturno",note:"Contraste e uma presença marcante.",accent:"#BDE46C",paper:"#1B221E",ink:"#F8F5E9",phrase:"Sua noite merece uma boa pizza."},
  {id:"playful",name:"Família",note:"Cores vivas e energia para compartilhar.",accent:"#DD3E2A",paper:"#FFF0CF",ink:"#3D251F",phrase:"Uma pizza. Muitos bons momentos."},
] as const;
const studioSchema=z.object({name:z.string().trim().min(2).max(100),tagline:z.string().trim().max(120),theme:z.enum(["editorial","classic","dark","playful"]),accent:z.string().regex(/^#[a-fA-F0-9]{6}$/)});
export type BrandInput=z.infer<typeof studioSchema>;
export type BrandAsset="logo"|"cover"|"profile";
function text(value:string){return value.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[c]!));}
function initials(name:string){return name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(word=>Array.from(word)[0]).join("").toLocaleUpperCase("pt-BR");}
function fit(value:string,maximum:number,width:number){return Math.min(maximum,width/Math.max(1,Array.from(value).length)*1.7);}
function emblem(color:string){return `<g fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"><path d="M80 109C111 91 147 91 178 109L128 194Z"/><path d="M83 121C109 105 148 105 175 121"/><circle cx="116" cy="136" r="7"/><circle cx="142" cy="150" r="6"/><path d="M116 76c-11-13 12-15 1-29m30 29c-11-13 12-15 1-29"/></g>`;}
function svg(width:number,height:number,body:string){return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;}
export function brandSvg(raw:BrandInput,asset:BrandAsset){
  const input=studioSchema.parse(raw),style=brandStyles.find(s=>s.id===input.theme)!,name=text(input.name),tagline=text(input.tagline),accent=input.accent;
  const mark=`<g transform="translate(128 76) scale(3)">${emblem(accent)}</g>`;
  if(asset==="logo")return svg(1024,1024,`${mark}<text x="512" y="772" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="${fit(input.name,78,850)}" fill="${style.ink}">${name}</text><path d="M402 824h220" stroke="${accent}" stroke-width="6"/>`);
  if(asset==="profile")return svg(1024,1024,`<rect width="1024" height="1024" rx="128" fill="${style.paper}"/><circle cx="512" cy="460" r="348" fill="none" stroke="${accent}" stroke-width="3"/>${mark}<text x="512" y="884" text-anchor="middle" font-family="Arial,sans-serif" font-size="74" letter-spacing="14" font-weight="700" fill="${style.ink}">${text(initials(input.name))}</text>`);
  return svg(1600,900,`<rect width="1600" height="900" fill="${style.paper}"/><circle cx="1480" cy="220" r="380" fill="${accent}" opacity=".10"/><circle cx="1300" cy="770" r="290" fill="${accent}" opacity=".07"/><path d="M950 0v900" stroke="${accent}" opacity=".18" stroke-width="2"/><g transform="translate(880 30) scale(4)">${emblem(accent)}</g><text x="100" y="180" font-family="Arial,sans-serif" font-size="22" letter-spacing="6" fill="${accent}">O SABOR É SEU.</text><text x="100" y="412" font-family="Georgia,serif" font-weight="700" font-size="${fit(input.name,98,790)}" fill="${style.ink}">${name}</text><text x="100" y="514" font-family="Arial,sans-serif" font-size="${fit(input.tagline,32,790)}" fill="${style.ink}" opacity=".80">${tagline}</text><path d="M100 610h100" stroke="${accent}" stroke-width="7"/><text x="100" y="775" font-family="Arial,sans-serif" font-size="21" letter-spacing="4" fill="${style.ink}">ESCOLHA. PEÇA. APROVEITE.</text>`);
}
export function brandPreview(input:BrandInput,asset:BrandAsset){return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(brandSvg(input,asset));}
export function brandFilename(name:string,asset:BrandAsset){return (slugify(name)||"minha-pizzaria")+"-"+({logo:"logo",cover:"capa",profile:"perfil"}[asset])+".png";}
export function styleFor(theme:ThemeId){return brandStyles.find(style=>style.id===theme)!;}
