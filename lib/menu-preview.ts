import {defaultRestaurant,type RestaurantData,type Product} from "./domain.ts";
import {applyReaderItems,normalizeMenuText,readerItemReady,type ReaderItem} from "./menu-reader-policy.ts";

/** The guest preview is never saved as a sellable menu. In particular, a pizza
 * price without its size must not be silently assigned to P, M or G. */
export function previewMenuWithReaderItems(items:ReaderItem[],photos:Record<string,string>={}):RestaurantData{
 const base=defaultRestaurant("Sua pizzaria");
 if(!items.length)return base;
 const ready=items.filter(readerItemReady).slice(0,200).map(item=>({...item,selected:true}));
 const data:RestaurantData=ready.length?{...base,...applyReaderItems(base,ready,()=>crypto.randomUUID())}:base;
 const categories=data.categories.map(category=>({...category})),products=data.products.map(product=>({...product}));
 const seen=new Set(products.map(product=>normalizeMenuText(product.name)));
 for(const item of items){
  if(products.length>=200)break;
  if(item.kind!=="pizza"||item.reviewRequired||!item.price||readerItemReady(item)||seen.has(normalizeMenuText(item.name)))continue;
  // An explicitly printed price can be previewed, but only as an unassigned
  // amount. This display-only card is NOT carried into the owner's draft.
  let category=categories.find(entry=>normalizeMenuText(entry.name)===normalizeMenuText(item.category));
  if(!category){if(categories.length>=20)continue;category={id:crypto.randomUUID(),name:item.category};categories.push(category);}
  const preview:Product={id:crypto.randomUUID(),name:item.name,description:[item.description,"Preço do arquivo; tamanho a confirmar antes de publicar."].filter(Boolean).join(" ").slice(0,600),categoryId:category.id,kind:"simple",price:item.price,sizes:{p:0,m:0,g:0},image:"",enabled:true,featured:false};
  products.push(preview);seen.add(normalizeMenuText(item.name));
 }
 // Only local, client-side references may be used here. The persisted draft
 // stays restricted to owner-confirmed /media/ URLs.
 for(const product of products){
  const matching=items.find(item=>normalizeMenuText(item.name)===normalizeMenuText(product.name)&&photos[item.id]?.startsWith("data:image/jpeg;base64,"));
  if(matching)product.image=photos[matching.id];
 }
 return {...data,categories,products};
}
