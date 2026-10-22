import {extractIfoodDOM} from '../ifood-import-extension/extractor.js';
import {captureLink, captureRequestAllowed, inspectCapturePage, mergeCapture, captureExports} from './policy.mjs';

/** One bounded task, one disposable context. Does not deliver or publish anything. */
export async function captureStore({browser, storeUrl, timeoutMs = 45000, maxScrolls = 24, settleMs = 700}) {
  const store = captureLink(storeUrl);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 500 || timeoutMs > 60000 ||
      !Number.isInteger(maxScrolls) || maxScrolls < 0 || maxScrolls > 40 ||
      !Number.isInteger(settleMs) || settleMs < 0 || settleMs > 2000) throw new Error('Limites de captura inválidos.');
  const started = Date.now(), deadline = started + timeoutMs;
  const report = {format: 'pizzaria-on-capture-report-v1', checkedAt: new Date().toISOString(),
    sourceUrl: store.url, storeId: store.storeId, outcome: 'unavailable', documentStatus: null,
    stopReason: 'navigation_failed', itemCount: 0, exportableCount: 0, pendingCount: 0,
    pizzaSizesPending: 0, scrolls: 0, blockedRequests: 0, truncated: false,
    completeness: 'unverified', partial: true};
  let capture = null, page, context, timedOut = false, timer;
  try {
    context = await browser.newContext({locale: 'pt-BR', viewport: {width: 1280, height: 900},
      serviceWorkers: 'block', acceptDownloads: false});
    await context.routeWebSocket('**/*', socket => { report.blockedRequests++; return socket.close(); });
    page = await context.newPage();
    timer = setTimeout(() => { timedOut = true; void context.close().catch(() => {}); }, timeoutMs);
    const main = request => request.isNavigationRequest() && request.frame() === page.mainFrame();
    await context.route('**/*', route => {
      const request = route.request();
      if (!captureRequestAllowed({url: request.url(), method: request.method(), mainNavigation: main(request)}, store)) {
        report.blockedRequests++;
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    page.on('response', response => {
      if (main(response.request())) report.documentStatus = response.status();
    });
    page.on('popup', popup => { void popup.close().catch(() => {}); });
    page.on('dialog', dialog => { void dialog.dismiss().catch(() => {}); });
    const response = await page.goto(store.url, {waitUntil: 'domcontentloaded', timeout: Math.min(25000, timeoutMs)});
    report.documentStatus = response?.status() ?? report.documentStatus;
    let stable = 0, previousFingerprint = '';
    while (Date.now() < deadline) {
      const http = report.documentStatus;
      if ([401, 403, 429].includes(http)) {
        report.outcome = 'blocked'; report.stopReason = `http_${http}`; break;
      }
      if (!http || http < 200 || http >= 300) {
        report.stopReason = 'http_unavailable'; break;
      }
      const state = await page.evaluate(inspectCapturePage);
      if (state.challenge || state.login) {
        report.outcome = 'blocked'; report.stopReason = state.challenge ? 'verification_required' : 'login_required'; break;
      }
      if (captureLink(page.url()).storeId !== store.storeId) {
        report.stopReason = 'different_store'; break;
      }
      const observed = await page.evaluate(extractIfoodDOM);
      capture = mergeCapture(capture, observed, store.url);
      const fingerprint = JSON.stringify(capture.categories);
      stable = fingerprint === previousFingerprint && state.atBottom ? stable + 1 : 0;
      previousFingerprint = fingerprint;
      if (capture.truncated) { report.stopReason = 'item_limit'; break; }
      // Several stable passes also give an initially empty page time to render.
      if (stable >= (capture.itemCount ? 3 : 6)) { report.stopReason = 'visible_items_stable'; break; }
      if (report.scrolls >= maxScrolls) { report.stopReason = 'scroll_limit'; break; }
      await page.evaluate(() => window.scrollBy(0, Math.max(600, Math.floor(innerHeight * .85))));
      report.scrolls++;
      await new Promise(resolve => setTimeout(resolve, Math.min(settleMs, Math.max(0, deadline - Date.now()))));
    }
    if (Date.now() >= deadline) { timedOut = true; report.stopReason = 'time_limit'; }
  } catch {
    report.stopReason = timedOut ? 'time_limit' : 'navigation_failed';
  } finally {
    clearTimeout(timer);
    await context?.close().catch(() => {});
  }
  // A later verification gate invalidates the run; no stale partial TXT is emitted.
  if (report.outcome === 'blocked') capture = null;
  let exports = null;
  if (capture?.itemCount) {
    exports = captureExports(capture);
    Object.assign(report, {itemCount: capture.itemCount, exportableCount: exports.exportableCount,
      pendingCount: exports.pendingCount, pizzaSizesPending: exports.pizzaSizesPending,
      truncated: capture.truncated, outcome: exports.exportableCount ? 'captured_for_review' : 'review_required'});
  } else if (report.outcome !== 'blocked' && report.stopReason === 'visible_items_stable') report.outcome = 'empty';
  report.elapsedMs = Date.now() - started;
  return {report, capture: capture?.itemCount ? capture : null, exports};
}
