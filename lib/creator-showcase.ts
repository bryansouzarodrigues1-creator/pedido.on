import {demoRestaurant,type RestaurantData} from "./domain.ts";
import {catalogueStyles,catalogueStyle} from "./menu-catalogue.ts";
import {galleryStyles,galleryStyle,suggestedGalleryStyles,type GalleryStyleId} from "./gallery-styles.ts";

// A smaller discovery collection; all old 252 IDs remain valid for saved menus.
const selected=new Set<string>(galleryStyles.map(style=>style.id));
for(const layout of ["list","poster","cards","compact"]){
 const pool=catalogueStyles.filter(style=>style.presentation.layout===layout);
 // Rotate families before offering another palette of the same composition.
 const ordered=[...pool].sort((a,b)=>{
  const palette=(s:typeof a)=>["mel","oliva","azulejo","terracota","ameixa"].findIndex(p=>s.id.includes("-"+p+"-"));
  return palette(a)-palette(b)||pool.indexOf(a)-pool.indexOf(b);
 });
 for(const style of ordered.slice(0,17))selected.add(style.id);
}
export const creatorGalleryIds=[...selected];
export function suggestedCreatorStyles(brief:string,feedback=""){
 return suggestedGalleryStyles(brief,feedback).filter(id=>selected.has(id));
}
export function showcasePhoto(id:GalleryStyleId){
 const base=catalogueStyle(id)?.baseId||id;
 const kind=["noite-premium","urbano","forno-brasa","pizza-vinho"].includes(base)?"noturna":["napoli-rua","atelier","essencial"].includes(base)?"praia":["familia","festival","fatia-pop"].includes(base)?"familia":"artesanal";
 return "/assets/pizza-demo-"+kind+".webp";
}
/** Display only: callers must save the original data, never these examples. */
export function creatorVisualPreview(data:RestaurantData,id:GalleryStyleId):RestaurantData{
 const cover=data.cover||showcasePhoto(id);
 if(data.products.length)return {...data,cover};
 const demo=demoRestaurant(galleryStyle(id).theme);
 const products=demo.products.filter(p=>["margherita","calabresa","quatro-queijos"].includes(p.id)).map((p,index)=>({...p,id:"showcase-"+p.id,image:["/assets/pizza-demo-artesanal.webp","/assets/pizza-demo-familia.webp","/assets/pizza-demo-praia.webp"][index]}));
 return {...data,cover,products};
}
