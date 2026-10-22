// Real Chromium, synthetic public-store responses. No actual iFood calls here.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {captureStore} from '../tools/ifood-capture-runner/capture.mjs';
import {readMenuPages, readerItemReady} from '../lib/menu-reader-policy.ts';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({headless: true, executablePath: process.env.QA_CHROME_PATH});
const url = 'https://www.ifood.com.br/delivery/teste-rj/pizzaria/123e4567-e89b-42d3-a456-426614174000';
const out = path.resolve('.sites-runtime/ifood-capture-fixture');
await mkdir(out, {recursive: true});
const checks = [];
let fixtureResponse;
const fixtureServer = createServer((request, response) => {
  if (request.url !== '/document') { response.writeHead(404); response.end(); return; }
  response.writeHead(fixtureResponse.status, fixtureResponse.headers);
  response.end(fixtureResponse.body);
});
await new Promise(resolve => fixtureServer.listen(0, '127.0.0.1', resolve));
const fixtureBase = `http://127.0.0.1:${fixtureServer.address().port}`;
const card = (name, price) => `<a class="dish-card"><h3 class="dish-card__description">${name}</h3><span data-test-id="dish-card-price">${price}</span></a>`;
const group = content => `<section class="restaurant-menu-group"><h2>Bebidas</h2>${content}</section>`;
async function run(html, {status = 200, timeoutMs = 8000, settleMs = 50, maxScrolls = 24, redirect = null} = {}) {
  let externalRequests = 0;
  fixtureResponse = {status: redirect ? 302 : status, body: html,
    headers: redirect ? {location: redirect} : {'content-type': 'text/html; charset=utf-8'}};
  // The real routing policy still sees the requested iFood URL. Only its
  // network transport is mapped to our local HTTP fixture, including redirects.
  const isolated = {async newContext(options) {
    const context = await browser.newContext(options);
    const original = context.route.bind(context);
    context.route = (pattern, handler) => original(pattern, route => handler(new Proxy(route, {get(target, property) {
      if (property === 'fetch') return options => {
        externalRequests++;
        return target.fetch({...options, url: fixtureBase + (target.request().url() === url ? '/document' : '/empty')});
      };
      if (property === 'continue') throw new Error('Fixture cannot continue to an external host.');
      const value = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    }})));
    return context;
  }};
  const result = await captureStore({browser: isolated, storeUrl: url, timeoutMs, settleMs, maxScrolls});
  assert.equal(externalRequests >= 1, true);
  return result;
}
try {
  const lazy = await run(`<!doctype html><title>Teste de captura</title><h1>Loja sintética</h1>
    ${group(card('Água mineral', 'R$ 5,50'))}<div style="height:1400px"></div>
    <script>addEventListener('scroll', () => {
      if (!document.querySelector('[data-lazy]')) document.body.insertAdjacentHTML('beforeend',
        '<div data-lazy>${group(card('Guaraná', 'R$ 8,25'))}</div>');
    });</script>`);
  assert.equal(lazy.report.outcome, 'captured_for_review');
  assert.equal(lazy.report.itemCount, 2);
  assert.equal(lazy.report.completeness, 'unverified');
  assert.match(lazy.exports.text, /Água mineral R\$ 5,50/);
  assert.match(lazy.exports.text, /Guaraná R\$ 8,25/);
  const parsed = readMenuPages([{id: 'runner', lines: lazy.exports.text.split('\n').map(text => ({text}))}]);
  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items.every(readerItemReady), true);
  await writeFile(path.join(out, 'fixture-cardapio.txt'), lazy.exports.text);
  checks.push({name: 'Real DOM + lazy scroll + exact cents + actual text importer', report: lazy.report});

  const virtual = await run(`<!doctype html><title>Virtualizado</title><h1>Loja sintética</h1>
    ${group(card('Primeiro', 'R$ 4,00'))}<div style="height:1400px"></div>
    <script>addEventListener('scroll', () => {
      document.querySelector('.restaurant-menu-group').outerHTML = '${group(card('Segundo', 'R$ 6,00'))}';
    });</script>`);
  assert.equal(virtual.report.itemCount, 2);
  checks.push({name: 'Virtualized first card retained after removal from DOM', report: virtual.report});

  const changing = await run(`<!doctype html><title>Mudança de preço</title>
    ${group(card('Água', 'R$ 4,00'))}<div style="height:1400px"></div>
    <script>addEventListener('scroll', () => {
      document.querySelector('[data-test-id="dish-card-price"]').textContent = 'R$ 6,00';
    });</script>`);
  assert.equal(changing.report.outcome, 'review_required');
  assert.equal(changing.report.exportableCount, 0);
  assert.equal(changing.capture.categories[0].items[0].priceCents, null);
  assert.equal(changing.exports.text, '');
  checks.push({name: 'Price changes during rendering remain pending', report: changing.report});

  const laterGate = await run(`<!doctype html><title>Cardápio</title>
    ${group(card('Água', 'R$ 4,00'))}<div style="height:1400px"></div>
    <script>addEventListener('scroll', () => { document.title = 'Verify you are human'; });</script>`);
  assert.equal(laterGate.report.outcome, 'blocked');
  assert.equal(laterGate.capture, null);
  assert.equal(laterGate.exports, null);
  checks.push({name: 'A later verification gate invalidates the earlier partial capture', report: laterGate.report});

  for (const [label, html, status, reason] of [
    ['HTTP 403', '<title>Forbidden</title>', 403, 'http_403'],
    ['HTTP 429', '<title>Rate limit</title>', 429, 'http_429'],
    ['Challenge with misleading cards', '<title>Just a moment</title>' + group(card('Não exportar', 'R$ 2,00')), 200, 'verification_required'],
    ['Login', '<title>Entrar</title><input type="password">', 200, 'login_required']
  ]) {
    const result = await run(html, {status});
    assert.equal(result.report.outcome, 'blocked', label);
    assert.equal(result.report.stopReason, reason, label);
    assert.equal(result.report.scrolls, 0, label);
    assert.equal(result.capture, null, label);
    assert.equal(result.exports, null, label);
    checks.push({name: label + ' stops without a false export', report: result.report});
  }
  const empty = await run('<title>Vazio</title><h1>Loja sem produtos</h1>');
  assert.equal(empty.report.outcome, 'empty');
  assert.equal(empty.exports, null);
  checks.push({name: 'Empty page remains empty', report: empty.report});

  const limited = await run('<title>Longo</title>' + group(card('Água', 'R$ 5,00')) + '<div style="height:100000px"></div>', {maxScrolls: 2});
  assert.equal(limited.report.stopReason, 'scroll_limit');
  assert.equal(limited.report.scrolls, 2);
  checks.push({name: 'Scroll limit preserves explicitly partial review', report: limited.report});

  const redirect = await run('', {redirect: 'https://127.0.0.1/private'});
  assert.equal(redirect.report.blockedRequests, 1);
  assert.equal(redirect.report.stopReason, 'redirect_blocked');
  assert.equal(redirect.capture, null);
  checks.push({name: 'Redirect to private network blocked before request', report: redirect.report});

  const timeout = await run('<title>Longo</title><div style="height:100000px"></div>', {timeoutMs: 500, settleMs: 2000});
  assert.equal(timeout.report.stopReason, 'time_limit');
  assert.ok(timeout.report.elapsedMs < 4000);
  checks.push({name: 'Time budget closes the disposable context', report: timeout.report});
  console.log(JSON.stringify({simulated: true, checks: checks.length, passed: true}));
} finally {
  await writeFile(path.join(out, 'summary.json'), JSON.stringify({simulated: true, checks}, null, 2));
  await browser.close();
  await new Promise(resolve => fixtureServer.close(resolve));
}
