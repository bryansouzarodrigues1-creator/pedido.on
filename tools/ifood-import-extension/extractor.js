/**
 * Invoked by chrome.scripting.executeScript from the extension popup.
 * All helpers are local to this function so Chrome can serialize it safely.
 * It only reads the DOM the signed-in user has already opened; it never
 * requests endpoints, bypasses challenges, or changes the source page.
 */
export function extractIfoodDOM() {
  const page = new URL(globalThis.location.href);
  if (page.protocol !== "https:" || !/^(www\.)?ifood\.com\.br$/i.test(page.hostname) || !page.pathname.startsWith("/delivery/")) {
    return { status: "unsupported", message: "Abra o cardápio de uma loja no iFood antes de iniciar a leitura." };
  }
  const normalize = value => (value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  const text = element => normalize(element?.innerText || element?.textContent || "");
  const query = (element, selectors) => { for (const s of selectors) { const found = element.querySelector(s); if (found) return found; } return null; };
  const pricePattern = /(?:R\s*\$|a partir de)\s*(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d{1,6},\d{2}|\d{1,6}\.\d{2}|\d{1,6})(?![.,\d])/gi;
  const toCents = value => {
    if (/^\d{1,3}\.\d{3}$/.test(value)) return null; // ambiguous thousands separator without decimal cents
    const number = value.includes(",") ? Number(value.replace(/\./g, "").replace(",", ".")) : Number(value);
    const cents = Math.round(number * 100);
    return Number.isSafeInteger(cents) && cents > 0 && cents <= 1000000 ? cents : null;
  };
  const nameNode = query(globalThis.document, ["[data-testid='merchant-name']", "[data-testid='restaurant-name']", "header h1", "main h1", "h1"]);
  const storeName = text(nameNode).slice(0, 100);
  let groups = Array.from(globalThis.document.querySelectorAll(".restaurant-menu-group"));
  if (!groups.length) groups = Array.from(globalThis.document.querySelectorAll("[data-test-id^='menu-group-']"));
  const seen = new Set(), categories = [];
  let discovered = 0, truncated = false;
  for (const group of groups) {
    const title = text(query(group, ["h2.restaurant-menu-group__title", "h2", "[data-testid='category-title']"])).slice(0, 60);
    if (title.length < 2) continue;
    const cards = Array.from(group.querySelectorAll("a.dish-card, [data-test-id='dish-card-test-id'], [data-testid='menu-item']"));
    const items = [];
    for (const card of cards) {
      if (card.matches?.("[data-test-id='dish-card-test-id']") && card.closest?.("a.dish-card") && card.closest("a.dish-card") !== card) continue;
      const titleEl = query(card, ["h3.dish-card__description", "[data-testid='menu-item-name']", "[data-testid='dish-name']", "h3", "h4"]);
      const product = text(titleEl).slice(0, 100);
      if (!product || product.length < 2) continue;
      const pnode = query(card, ["[data-test-id='dish-card-price']", ".dish-card__price", "[data-testid='menu-item-price']", "[data-testid='dish-price']"]);
      const rawPrice = text(pnode) || text(card);
      const matches = Array.from(rawPrice.matchAll(pricePattern));
      const unique = [...new Set(matches.map(m => toCents(m[1])).filter(v => v !== null))];
      const uncertain = matches.length !== 1 || unique.length !== 1 || /a partir de|sob consulta|consulte|escolha|a combinar/i.test(rawPrice);
      const priceCents = uncertain ? null : unique[0];
      const detail = text(query(card, [".dish-card__details", "span.dish-card__details", "[data-testid='menu-item-description']"])).slice(0, 600);
      const disabled = card.getAttribute?.("aria-disabled") === "true" ||
        card.getAttribute?.("data-disabled") === "true" ||
        /dish-card--unavailable|dish-card--disabled|unavailable|out-of-stock/.test(String(card.className || "").toLowerCase());
      const imageNode = query(card, ["img.dish-card__image", ".dish-card__container-image img", "[data-testid='menu-item-image'] img", "img"]);
      let imageUrl = null;
      if (imageNode) {
        const srcset = imageNode.getAttribute?.("srcset") || imageNode.getAttribute?.("data-srcset") || "";
        const candidate = imageNode.currentSrc || imageNode.getAttribute?.("data-src") || imageNode.src || imageNode.getAttribute?.("src") || srcset.split(",")[0]?.trim().split(/\s+/)[0];
        try { const url = new URL(candidate, page); if (url.protocol === "https:" && !url.username && !url.password) imageUrl = url.href; } catch { /* no visible image */ }
      }
      const key = `${title.toLocaleLowerCase("pt-BR")}\u0000${product.toLocaleLowerCase("pt-BR")}\u0000${priceCents ?? rawPrice}`;
      if (seen.has(key)) continue;
      seen.add(key); discovered++;
      if (discovered > 200) { truncated = true; continue; }
      items.push({ id: `item-${discovered}`, category: title, name: product, description: detail, priceCents,
        rawPrice: rawPrice.slice(0, 120), imageUrl, needsReview: uncertain || disabled, available: !disabled });
    }
    if (items.length) categories.push({ name: title, items });
  }
  if (!categories.length) return { status: "empty", storeName, sourceUrl: page.href,
    message: "Nenhum cartão de produto foi encontrado. O iFood pode ter mudado a página, não carregado o menu ou solicitado verificação. Experimente PDF ou fotos." };
  return { status: "captured", storeName, sourceUrl: page.href, capturedAt: new Date().toISOString(),
    categories, itemCount: Math.min(discovered, 200), truncated, 
    warning: "Os preços e as fotografias foram lidos da tela. Confira disponibilidade, opções e tamanhos antes de publicar." };
}
