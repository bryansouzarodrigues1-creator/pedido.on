import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {captureLink} from './policy.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const labels = {
  captured_for_review: 'Produtos encontrados para conferir',
  review_required: 'Os produtos precisam de revisão',
  blocked: 'O iFood não liberou o acesso',
  empty: 'Nenhum produto foi encontrado',
  unavailable: 'Não foi possível concluir a leitura'
};
const reasons = {
  http_401: 'A página exige acesso autorizado.', http_403: 'A página recusou o acesso (HTTP 403).',
  http_429: 'A página pediu uma pausa (HTTP 429).', verification_required: 'A página pediu verificação humana.',
  login_required: 'A página pediu login.', redirect_blocked: 'A página redirecionou e a leitura foi interrompida.',
  navigation_failed: 'O navegador não conseguiu concluir a abertura da página.',
  http_unavailable: 'A página não respondeu com um cardápio disponível.',
  different_store: 'O endereço aberto deixou de corresponder à loja informada.',
  time_limit: 'A leitura chegou ao limite de tempo.', scroll_limit: 'A leitura chegou ao limite de rolagem.',
  item_limit: 'A leitura chegou ao limite de 200 produtos.',
  visible_items_stable: 'A lista visível parou de mudar.'
};

/** Offline document: source strings are text, never HTML, scripts or remote images. */
export function renderCaptureReview({report, capture, exports}) {
  const source = captureLink(report.sourceUrl).url;
  const hasCapture = ['captured_for_review', 'review_required'].includes(report.outcome) && !!capture?.itemCount;
  const items = hasCapture ? capture.categories.flatMap(group => group.items.map(item => ({...item, category: group.name}))) : [];
  const ready = item => item.available && !item.needsReview && Number.isSafeInteger(item.priceCents) && item.priceCents > 0;
  const count = items.filter(ready).length;
  const money = cents => `R$ ${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
  const rows = items.map(item => `<tr><td>${escape(item.category)}</td><td><strong>${escape(item.name)}</strong><small>${escape(item.description)}</small></td><td>${ready(item) ? money(item.priceCents) : 'Conferir na origem'}</td><td>${!item.available ? 'Indisponível' : ready(item) ? 'Conferir antes de usar' : escape(item.rawPrice || 'Preço não confirmado')}</td></tr>`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Resultado da leitura · Pizzaria.on</title><style>
*{box-sizing:border-box}body{font:16px/1.55 system-ui,sans-serif;background:#f4f6fa;color:#152039;margin:0}main{max-width:1060px;margin:auto;padding:36px 24px}header{background:#152b61;color:white;border-radius:20px;padding:28px}header p{margin:0;color:#d9e5ff}h1{font-size:30px;line-height:1.2;margin:10px 0}h2{font-size:21px}section{margin:24px 0;padding:24px;border-radius:16px;background:white;border:1px solid #dce2ed}a{color:#174ca6;overflow-wrap:anywhere}.stats{display:flex;gap:32px;flex-wrap:wrap}.stats strong{display:block;font-size:32px}.notice{background:#fff3c9;border-color:#e9cd69}small{display:block;color:#59667c;max-width:430px}table{width:100%;border-collapse:collapse}td,th{padding:12px;text-align:left;vertical-align:top;border-bottom:1px solid #dce2ed}th{background:#edf2fb}.scroll{overflow:auto}nav{display:flex;gap:16px;flex-wrap:wrap}nav a{font-weight:600}footer{color:#59667c;font-size:14px}@media(max-width:600px){main{padding:20px 12px}header,section{padding:20px}h1{font-size:25px}td,th{min-width:130px}}
</style></head><body><main><header><p>PIZZARIA.ON · LEITURA PARA REVISÃO</p><h1>${escape(labels[report.outcome] || labels.unavailable)}</h1><p>${escape(hasCapture ? capture.storeName : '')}</p></header>
<section><p>${escape(reasons[report.stopReason] || 'Consulte o relatório técnico para ver o resultado.')}</p><a href="${escape(source)}" target="_blank" rel="noopener noreferrer">Ver a loja de origem</a><p><small>Consulta: ${escape(new Date(report.checkedAt).toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'}))} · horário de Brasília</small></p><div class="stats"><div><strong>${items.length}</strong>produtos vistos</div><div><strong>${count}</strong>com preço para revisão</div><div><strong>${items.length - count}</strong>com pendências</div></div></section>
${hasCapture ? `<section class="notice"><strong>A captura pode estar incompleta.</strong><p>Confira os preços de venda direta, tamanhos e opções antes de usar. Fotos não foram transferidas. ${report.pizzaSizesPending ? 'Há pizzas com tamanho pendente.' : ''} ${report.truncated ? 'O limite de produtos foi atingido.' : ''}</p></section><section><h2>Produtos lidos</h2><div class="scroll"><table><thead><tr><th>Categoria</th><th>Produto</th><th>Preço</th><th>Conferência</th></tr></thead><tbody>${rows}</tbody></table></div></section>` : '<section class="notice"><p>Nenhum catálogo foi gerado. Você pode usar um PDF ou fotos do cardápio no criador.</p></section>'}
<section><h2>Arquivos desta tentativa</h2><nav>${hasCapture && count && exports?.text ? '<a href="cardapio.txt" download>Baixar TXT para conferir no criador</a>' : ''}${hasCapture ? '<a href="capture-review.json" download>Todos os itens e pendências</a>' : ''}<a href="report.json" download>Relatório técnico</a></nav></section><footer>Os arquivos ficam neste computador. Esta leitura não salva nem publica o cardápio da pizzaria.</footer></main></body></html>`;
}

/** Caller creates a new directory first; an old catalog must never survive a blocked run. */
export async function writeCaptureResult(out, result) {
  await writeFile(path.join(out, 'report.json'), JSON.stringify(result.report, null, 2) + '\n', {flag: 'wx'});
  await writeFile(path.join(out, 'resultado.html'), renderCaptureReview(result), {flag: 'wx'});
  if (result.capture && ['captured_for_review', 'review_required'].includes(result.report.outcome)) {
    await writeFile(path.join(out, 'capture-review.json'), JSON.stringify(result.capture, null, 2) + '\n', {flag: 'wx'});
    await writeFile(path.join(out, 'cardapio-origem.json'), result.exports.backup + '\n', {flag: 'wx'});
    if (result.exports.text) await writeFile(path.join(out, 'cardapio.txt'), result.exports.text + '\n', {flag: 'wx'});
  }
}
