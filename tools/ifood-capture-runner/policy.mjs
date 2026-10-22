import {parseIfoodStoreLink} from '../../lib/menu-source-links.ts';
import {makeMenuText, makeMenuJSON, selectedRows} from '../ifood-import-extension/format.js';

export function captureLink(value) {
  const link = typeof value === 'string' && parseIfoodStoreLink(value);
  if (!link) throw new Error('Informe o link HTTPS completo de uma loja iFood (/delivery/cidade/loja/identificador).');
  return link;
}

const providerHost = host => ['ifood.com.br', 'ifood.com', 'ifood-static.com.br']
  .some(root => host === root || host.endsWith('.' + root));

/** Fresh anonymous browser only. No arbitrary URL fetcher or business writes. */
export function captureRequestAllowed({url, method, mainNavigation = false}, store) {
  try {
    const target = new URL(url);
    if (target.protocol !== 'https:' || target.port || target.username || target.password) return false;
    if (mainNavigation) {
      const destination = parseIfoodStoreLink(url);
      return method === 'GET' && !!destination && destination.storeId === store.storeId;
    }
    const normalSecurity = target.hostname === 'challenges.cloudflare.com' ||
      target.origin === new URL(store.url).origin && target.pathname.startsWith('/cdn-cgi/challenge-platform/');
    if (normalSecurity) return ['GET', 'HEAD', 'POST'].includes(method);
    return providerHost(target.hostname) && ['GET', 'HEAD'].includes(method);
  } catch { return false; }
}

/** Self-contained: executed in the browser, without touching forms or cookies. */
export function inspectCapturePage() {
  const body = (document.body?.innerText || '').slice(0, 5000);
  const title = document.title || '';
  const challenge = /access denied|request blocked|captcha|just a moment|verify you are human|verifica[çc][aã]o de seguran[çc]a|verifique.{0,40}humano|error code: 10[12]\d/i.test(title + ' ' + body) ||
    !!document.querySelector('iframe[src*="challenges.cloudflare.com"], #challenge-running, #challenge-form');
  const login = !!document.querySelector('input[type="password"]') &&
    !document.querySelector('a.dish-card, [data-testid="menu-item"], [data-test-id="dish-card-test-id"]');
  return {challenge, login, title: title.slice(0, 160),
    atBottom: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4};
}

const key = item => `${item.category.toLocaleLowerCase('pt-BR')}\0${item.name.toLocaleLowerCase('pt-BR')}`;

/** Accumulate virtualized cards; a changing price remains pending, never guessed. */
export function mergeCapture(previous, incoming, sourceUrl) {
  const result = previous ? structuredClone(previous) : {
    status: 'captured', sourceUrl, storeName: '', capturedAt: new Date().toISOString(),
    categories: [], itemCount: 0, truncated: false,
    warning: 'Captura parcial de itens visíveis. Confira preços, tamanhos, opções e direitos das fotos antes de usar.'
  };
  if (incoming?.status !== 'captured') return result;
  if (incoming.storeName) result.storeName = incoming.storeName;
  result.truncated ||= !!incoming.truncated;
  const known = new Map(result.categories.flatMap(c => c.items).map(item => [key(item), item]));
  for (const category of incoming.categories) for (const original of category.items) {
    const item = {...original, category: category.name};
    const existing = known.get(key(item));
    if (existing) {
      if (existing.priceCents !== item.priceCents || existing.rawPrice !== item.rawPrice) {
        existing.priceCents = null;
        existing.needsReview = true;
        existing.rawPrice = 'Preço mudou durante a captura; conferir na origem.';
      }
      existing.needsReview ||= item.needsReview;
      existing.available &&= item.available;
      existing.imageUrl ||= item.imageUrl;
      continue;
    }
    if (known.size >= 200) { result.truncated = true; continue; }
    let group = result.categories.find(c => c.name === category.name);
    if (!group) result.categories.push(group = {name: category.name, items: []});
    item.id = `item-${known.size + 1}`;
    group.items.push(item);
    known.set(key(item), item);
  }
  result.itemCount = known.size;
  return result;
}

export function captureExports(capture) {
  const items = capture.categories.flatMap(c => c.items);
  const ids = new Set(items.map(item => item.id));
  const valid = selectedRows(capture, ids);
  return {text: makeMenuText(capture, ids), backup: makeMenuJSON(capture, ids),
    exportableCount: valid.length, pendingCount: items.length - valid.length,
    pizzaSizesPending: valid.filter(item => /pizza|sabor/i.test(item.category) &&
      !/combo|bebida|sobremesa|lanche/i.test(item.category)).length};
}
