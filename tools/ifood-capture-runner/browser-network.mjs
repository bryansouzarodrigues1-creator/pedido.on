import {captureRequestAllowed} from './policy.mjs';

// Requests stay in Chromium, including when Chromium is on another machine.
// A response-stage gate stops Location before Chromium can follow a redirect.
// CSP prevents additional targets from escaping this page's CDP gate.
const captureCsp = "sandbox allow-scripts allow-same-origin; worker-src 'none'; child-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'";

export async function installBrowserNetwork({context, page, store, report, allowRequest = captureRequestAllowed}) {
  const cdp = await context.newCDPSession(page);
  const {frameTree} = await cdp.send('Page.getFrameTree');
  const mainFrame = frameTree.frame.id;
  let disposed = false;
  const paused = async event => {
    if (disposed) return;
    const main = event.resourceType === 'Document' && event.frameId === mainFrame;
    const fail = async () => {
      report.blockedRequests++;
      await cdp.send('Fetch.failRequest', {requestId: event.requestId, errorReason: 'BlockedByClient'});
    };
    try {
      if (event.resourceType === 'Document' && !main ||
          !allowRequest({url: event.request.url, method: event.request.method, mainNavigation: main}, store)) {
        await fail(); return;
      }
      if (event.responseStatusCode !== undefined || event.responseErrorReason !== undefined) {
        if (main && event.responseStatusCode) report.documentStatus = event.responseStatusCode;
        if (event.responseStatusCode >= 300 && event.responseStatusCode < 400) {
          if (main) { report.outcome = 'blocked'; report.stopReason = 'redirect_blocked'; }
          await fail(); return;
        }
        if (main && event.responseStatusCode >= 200 && event.responseStatusCode < 300) {
          // Fulfill the browser's own response with the restrictive document
          // policy before its parser starts. continueResponse header changes
          // did not prevent new worker targets in real Chrome regression QA.
          const received = await cdp.send('Fetch.getResponseBody', {requestId: event.requestId});
          const body = Buffer.from(received.body, received.base64Encoded ? 'base64' : 'utf8');
          if (body.byteLength > 4 * 1024 * 1024) throw new Error('Documento excedeu o limite de leitura.');
          const headers = (event.responseHeaders || []).filter(header =>
            !['content-encoding', 'content-length', 'transfer-encoding'].includes(header.name.toLowerCase()));
          headers.push({name: 'Content-Security-Policy', value: captureCsp});
          await cdp.send('Fetch.fulfillRequest', {requestId: event.requestId, body: body.toString('base64'),
            responseCode: event.responseStatusCode, responseHeaders: headers,
            ...(event.responseStatusText ? {responsePhrase: event.responseStatusText} : {})});
        } else await cdp.send('Fetch.continueRequest', {requestId: event.requestId});
      } else await cdp.send('Fetch.continueRequest', {requestId: event.requestId, interceptResponse: true});
    } catch {
      if (!disposed) {
        report.outcome = 'blocked'; report.stopReason = 'request_policy_failed';
        await cdp.send('Fetch.failRequest', {requestId: event.requestId, errorReason: 'BlockedByClient'}).catch(() => {});
        await page.close().catch(() => {});
      }
    }
  };
  cdp.on('Fetch.requestPaused', paused);
  try {
    await cdp.send('Fetch.enable', {patterns: [
      {urlPattern: '*', requestStage: 'Request'}, {urlPattern: '*', requestStage: 'Response'}
    ]});
  } catch {
    disposed = true;
    cdp.off('Fetch.requestPaused', paused);
    await cdp.detach().catch(() => {});
    throw new Error('O navegador não oferece a proteção de rede necessária.');
  }
  return async () => {
    disposed = true;
    cdp.off('Fetch.requestPaused', paused);
    // Close the owned context before detaching: no unguarded page is left alive.
    await context.close().catch(() => {});
    await cdp.detach().catch(() => {});
  };
}
