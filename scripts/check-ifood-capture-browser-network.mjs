// Real Chrome / real browser HTTP transport, disposable loopback fixtures only.
// No iFood access, Browserbase account or cloud allowance is used here.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {mkdir, writeFile} from 'node:fs/promises';
import {installBrowserNetwork} from '../tools/ifood-capture-runner/browser-network.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright-core');
const seen = [];
let mode = 'normal';
const server = createServer((request, response) => {
  seen.push({path: request.url, method: request.method});
  if (request.url === '/menu' && mode === 'redirect') {
    response.writeHead(302, {location: '/private'}); response.end(); return;
  }
  if (request.url === '/resource-redirect') {
    response.writeHead(302, {location: '/private'}); response.end(); return;
  }
  if (request.url === '/menu') {
    response.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
    response.end(`<!doctype html><title>Captura sintética</title><h1>Bebidas</h1><p>Água R$ 5,50</p>
      <script>
      globalThis.fixtureReady=true;
      fetch('/read').catch(()=>{});
      fetch('/write',{method:'POST',body:'must not arrive'}).catch(()=>{});
      fetch('/resource-redirect').catch(()=>{});
      try { new Worker('/worker.js'); } catch {}
      try { new SharedWorker('/shared-worker.js'); } catch {}
      try { window.open('/popup'); } catch {}
      const f=document.createElement('iframe');f.src='/frame';document.body.append(f);
      const object=document.createElement('object');object.data='/object';document.body.append(object);
      try { new WebSocket('ws://'+location.host+'/socket'); } catch {}
      </script>`); return;
  }
  response.writeHead(200, {'content-type': 'text/plain'}); response.end('fixture response');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({headless: true, executablePath: process.env.QA_CHROME_PATH});
const checks = [];
try {
  const context = await browser.newContext({serviceWorkers: 'block', acceptDownloads: false});
  await context.routeWebSocket('**/*', route => route.close());
  const page = await context.newPage();
  const report = {blockedRequests: 0, outcome: 'unavailable'};
  const allowRequest = ({url, method, mainNavigation}) => {
    const target = new URL(url);
    return target.origin === base && method === 'GET' && (!mainNavigation || target.pathname === '/menu');
  };
  const dispose = await installBrowserNetwork({context, page, report, allowRequest});
  await page.goto(base + '/menu', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => globalThis.fixtureReady === true);
  await page.waitForTimeout(500);
  assert.equal(await page.locator('h1').innerText(), 'Bebidas');
  assert.match(await page.locator('body').innerText(), /R\$ 5,50/);
  assert.equal(seen.some(r => r.path === '/read' && r.method === 'GET'), true);
  assert.equal(report.documentStatus, 200);
  checks.push({name: 'Chromium itself receives HTML and executes allowed read requests', passed: true});
  for (const path of ['/write', '/worker.js', '/shared-worker.js', '/popup', '/frame', '/object', '/socket', '/private'])
    assert.equal(seen.some(r => r.path === path), false, path + ' must never reach the fixture server');
  assert.equal(context.pages().length, 1);
  checks.push({name: 'Writes, worker targets, frames, objects, popups and sockets do not contact the server', passed: true});
  assert.equal(seen.some(r => r.path === '/resource-redirect'), true);
  assert.equal(seen.some(r => r.path === '/private'), false);
  checks.push({name: 'Allowed resource redirect is stopped before Location is followed', passed: true});
  await dispose();
  assert.equal(page.isClosed(), true);

  mode = 'redirect';
  const redirectedContext = await browser.newContext({serviceWorkers: 'block'});
  const redirected = await redirectedContext.newPage();
  const redirectedReport = {blockedRequests: 0, outcome: 'unavailable'};
  const disposeRedirect = await installBrowserNetwork({context: redirectedContext, page: redirected,
    report: redirectedReport, allowRequest});
  await assert.rejects(redirected.goto(base + '/menu', {waitUntil: 'domcontentloaded'}));
  assert.equal(redirectedReport.outcome, 'blocked');
  assert.equal(redirectedReport.stopReason, 'redirect_blocked');
  assert.equal(seen.some(r => r.path === '/private'), false);
  await disposeRedirect();
  checks.push({name: 'Main-document redirect is blocked before navigation and its reason is preserved', passed: true});
  console.log(JSON.stringify({simulated: true, network: 'real Chromium to loopback only', checks: checks.length, passed: true}));
} finally {
  await mkdir('.sites-runtime/ifood-capture-browser-network', {recursive: true});
  await writeFile('.sites-runtime/ifood-capture-browser-network/summary.json', JSON.stringify({simulated: true, checks}, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
