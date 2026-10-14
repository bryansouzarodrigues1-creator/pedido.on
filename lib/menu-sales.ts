import {priceLine,cartLineSchema,type RestaurantData,type Product,type LineInput,type PricedLine} from "./domain.ts";

export function availableProduct(product: Product) {
  return product.enabled && (product.kind === "pizza" ? Object.values(product.sizes).some(n => n > 0) : product.price > 0);
}

const normalized = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function drinkSuggestions(data: RestaurantData, cart: LineInput[]) {
  const ordered = new Set(cart.flatMap(line => line.bundleId?data.promotions.filter(p=>p.kind==="bundle"&&p.id===line.bundleId).flatMap(p=>p.kind==="bundle"?p.items.map(item=>item.productId):[]):line.productIds));
  const hasMeal = data.products.some(p => ordered.has(p.id) && p.kind === "pizza");
  if (!hasMeal) return [];
  const drinks = new Set(data.categories.filter(c => /\b(bebidas?|refrigerantes?|sucos?|drinks?|cervejas?)\b/.test(normalized(c.name))).map(c => c.id));
  return data.products.filter(p => p.kind === "simple" && drinks.has(p.categoryId) && availableProduct(p) && !ordered.has(p.id)).sort((a, b) => Number(b.featured) - Number(a.featured) || a.price - b.price).slice(0, 2);
}

export function addCartLine(cart: LineInput[], line: LineInput): LineInput[] {
  const same = cart.findIndex(row => row.bundleId===line.bundleId&&row.bundleVersion===line.bundleVersion&&row.size === line.size && row.crustId === line.crustId && row.note === line.note && row.productIds.length === line.productIds.length && row.productIds.every((id, index) => id === line.productIds[index]));
  if (same !== -1) {
    if (cart[same].quantity + line.quantity > 20) throw new Error("Você pode adicionar até 20 unidades do mesmo item.");
    return cart.map((row, index) => index === same ? { ...row, quantity: row.quantity + line.quantity } : row);
  }
  if (cart.length >= 30) throw new Error("Seu pedido pode ter até 30 itens diferentes.");
  return [...cart, line];
}

export function restoreCart(data:RestaurantData,saved:unknown,availableOnly=false,now=Date.now()):LineInput[]{
 if(!Array.isArray(saved))return [];
 return saved.slice(0,30).flatMap(value=>{const checked=cartLineSchema.safeParse(value);if(!checked.success)return [];if(availableOnly)try{priceLine(data,checked.data,now);}catch{return [];}return [checked.data];});
}

export function reviewCart(data:RestaurantData,cart:LineInput[],now=Date.now()){
 const lines:(PricedLine&{index:number})[]=[],invalid:{index:number;label:string;error:string}[]=[];
 for(const [index,line] of cart.entries())try{const checked=cartLineSchema.safeParse(line);if(!checked.success)throw Error("Confira este item do pedido.");lines.push({...priceLine(data,checked.data,now),index});}catch(error){
  const p=line?.bundleId?data.promotions.find(p=>p.id===line.bundleId):undefined;
  const label=p?.kind==="bundle"?p.name:Array.isArray(line?.productIds)?line.productIds.map(id=>data.products.find(p=>p.id===id)?.name).filter(Boolean).join(" + "):"";
  invalid.push({index,label:label||"Item indisponível",error:error instanceof Error?error.message:"Confira este item."});
 }
 return {lines,invalid};
}
