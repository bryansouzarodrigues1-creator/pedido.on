import {defaultRestaurant,type RestaurantData,type Product} from "./domain.ts";
import {applyReaderItems,normalizeMenuText,readerItemReady,type ReaderItem} from "./menu-reader-policy.ts";

/** Display confirmed local photos before upload. The returned view must never
 * be persisted: applyReaderItems still produces the validated draft patch. */
export function previewReviewedMenu(data:RestaurantData,items:ReaderItem[],photos:Record<string,string>,approved:Record<string,boolean>):RestaurantData{
 let index=0;const preview={...data,...applyReaderItems(data,items,()=>`import-preview-${++index}`)};
 const selected=new Map(items.filter(item=>item.selected&&item.kind!=="crust"&&approved[item.id]&&!item.image&&/^(?:data:image\/jpeg;base64,[A-Za-z0-9+/]+=*|\/media\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)$/.test(photos[item.id]||"")).map(item=>[item.kind+":"+normalizeMenuText(item.name),item]));
 const existingIds=new Set(data.products.map(product=>product.id));
 const categoryNames=new Map(preview.categories.map(category=>[category.id,normalizeMenuText(category.name)]));
 return {...preview,products:preview.products.map(product=>{
  const item=selected.get(product.kind+":"+normalizeMenuText(product.name));
  if(!item||categoryNames.get(product.categoryId)!==normalizeMenuText(item.category))return product;
  // A photo approved for one product must not be shown on another with a
  // similar name. Existing updates use their stable ID; new rows use new IDs.
  const isTarget=item.existingId?product.id===item.existingId
   :item.action==="update"?existingIds.has(product.id):!existingIds.has(product.id);
  return isTarget?{...product,image:photos[item.id]}:product;
 })};
}

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
 const categoryNames=new Map(categories.map(category=>[category.id,normalizeMenuText(category.name)]));
 const photoItems=[...ready,...items.filter(item=>item.selected&&!item.reviewRequired&&!readerItemReady(item)&&item.kind==="pizza"&&!!item.price)];
 for(const product of products){
  const matching=photoItems.find(item=>
   normalizeMenuText(item.name)===normalizeMenuText(product.name)&&
   normalizeMenuText(item.category)===categoryNames.get(product.categoryId)&&
   (item.kind===product.kind||item.kind==="pizza"&&product.kind==="simple"&&product.description.includes("tamanho a confirmar"))&&
   /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(photos[item.id]||""));
  if(matching)product.image=photos[matching.id];
 }
 return {...data,categories,products};
}
