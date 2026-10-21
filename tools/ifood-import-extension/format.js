/** Strict formatter for Pizzaria.on text import; no implicit product creation. */
export const selectedRows = (capture, ids) => (capture?.categories || []).flatMap(category => (category.items || []).filter(item =>
  ids.has(item.id) && item.available && !item.needsReview && Number.isSafeInteger(item.priceCents) && item.priceCents > 0
).map(item => ({ ...item, category: category.name })));

export function makeMenuText(capture, ids, sizes = {}) {
  const rows = selectedRows(capture, ids), grouped = new Map();
  const clean = (s, max) => String(s || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  for (const item of rows) {
    const category = clean(item.category, 60), name = clean(item.name, 100);
    if (!category || !name) continue;
    const pizza = /pizza|sabor/i.test(category) && !/combo|bebida|sobremesa|lanche/i.test(category);
    const selectedSize = sizes[item.id];
    const type = /borda/i.test(category) ? "crust" : pizza && selectedSize !== "unico" ? "pizza" : "simple";
    const key = `${category}\u0000${type}`;
    if (!grouped.has(key)) grouped.set(key, []);
    const reais = Math.floor(item.priceCents / 100);
    const cents = String(item.priceCents % 100).padStart(2, "0");
    const suffix = pizza && ["p", "m", "g"].includes(selectedSize) ? ` ${selectedSize.toUpperCase()}` : "";
    grouped.get(key).push(`${name}${suffix} R$ ${reais},${cents}${item.description ? `\nDescrição: ${clean(item.description, 600)}` : ""}`);
  }
  return [...grouped].map(([key, items]) => {
    const [category, type] = key.split("\u0000");
    return `Categoria: ${category} [${type}]\n${items.join("\n")}`;
  }).join("\n\n");
}

export function makeMenuJSON(capture, ids, sizes = {}) {
  return JSON.stringify({format:"pizzaria-on-ifood-local-v1", sourceUrl:capture.sourceUrl, storeName:capture.storeName,
    capturedAt:capture.capturedAt, truncated:capture.truncated, products:selectedRows(capture, ids).map(({id,category,name,description,priceCents,imageUrl})=>
      ({id,category,name,description,priceCents,imageUrl,sizeChoice:sizes[id] || null}))}, null, 2);
}
