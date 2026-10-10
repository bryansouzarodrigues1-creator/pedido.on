import type { RestaurantData, Product, LineInput } from "./domain";

export function availableProduct(product: Product) {
  return product.enabled && (product.kind === "pizza" ? Object.values(product.sizes).some(n => n > 0) : product.price > 0);
}

const normalized = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function drinkSuggestions(data: RestaurantData, cart: LineInput[]) {
  const ordered = new Set(cart.flatMap(line => line.productIds));
  const hasMeal = data.products.some(p => ordered.has(p.id) && p.kind === "pizza");
  if (!hasMeal) return [];
  const drinks = new Set(data.categories.filter(c => /\b(bebidas?|refrigerantes?|sucos?|drinks?|cervejas?)\b/.test(normalized(c.name))).map(c => c.id));
  return data.products.filter(p => p.kind === "simple" && drinks.has(p.categoryId) && availableProduct(p) && !ordered.has(p.id)).sort((a, b) => Number(b.featured) - Number(a.featured) || a.price - b.price).slice(0, 2);
}

export function addCartLine(cart: LineInput[], line: LineInput): LineInput[] {
  const same = cart.findIndex(row => row.size === line.size && row.crustId === line.crustId && row.note === line.note && row.productIds.length === line.productIds.length && row.productIds.every((id, index) => id === line.productIds[index]));
  if (same !== -1) {
    if (cart[same].quantity + line.quantity > 20) throw new Error("Você pode adicionar até 20 unidades do mesmo item.");
    return cart.map((row, index) => index === same ? { ...row, quantity: row.quantity + line.quantity } : row);
  }
  if (cart.length >= 30) throw new Error("Seu pedido pode ter até 30 itens diferentes.");
  return [...cart, line];
}
