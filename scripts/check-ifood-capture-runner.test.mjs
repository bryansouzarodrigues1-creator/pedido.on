import test from 'node:test';
import assert from 'node:assert/strict';
import {captureLink, captureRequestAllowed, mergeCapture, captureExports} from '../tools/ifood-capture-runner/policy.mjs';
import {readMenuPages, readerItemReady} from '../lib/menu-reader-policy.ts';

const url = 'https://www.ifood.com.br/delivery/teste-rj/pizzaria/123e4567-e89b-42d3-a456-426614174000';
const store = captureLink(url);
const item = (name, priceCents = 5590, extra = {}) => ({id: 'item-1', category: 'Pizzas', name,
  description: 'Muçarela', priceCents, rawPrice: `R$ ${(priceCents / 100).toFixed(2).replace('.', ',')}`,
  available: true, needsReview: false, imageUrl: null, ...extra});
const observed = items => ({status: 'captured', storeName: 'Teste', sourceUrl: url,
  categories: [{name: 'Pizzas', items}], truncated: false});

test('runner accepts an exact public store and strips tracking; refuses other destinations', () => {
  assert.equal(captureLink(url + '?token=private#info').url, url);
  for (const candidate of ['http://www.ifood.com.br/delivery/x', url.replace('www.ifood.com.br', '127.0.0.1'),
    url.replace('www.ifood.com.br', 'www.ifood.com.br.evil.test'), url.replace('https://', 'https://user:secret@'),
    url.replace('www.ifood.com.br', 'www.ifood.com.br:8443'), 'https://www.ifood.com.br/entrar']) {
    assert.throws(() => captureLink(candidate));
  }
});

test('runner permits normal resources and refuses writes, private networks and cross-store navigation', () => {
  const allowed = (target, method = 'GET', mainNavigation = false) => captureRequestAllowed({url: target, method, mainNavigation}, store);
  assert.equal(allowed(url, 'GET', true), true);
  assert.equal(allowed('https://static-images.ifood.com.br/a.png'), true);
  assert.equal(allowed('https://challenges.cloudflare.com/turnstile/v0/a', 'POST'), true);
  assert.equal(allowed('https://www.ifood.com.br/cdn-cgi/challenge-platform/a', 'POST'), true);
  for (const target of ['https://localhost/a', 'http://169.254.169.254/latest/meta-data', 'file:///etc/passwd',
    'https://evil.test/a', 'https://ifood.com.br.evil.test/a', 'https://www.ifood.com.br:8443/a']) assert.equal(allowed(target), false);
  assert.equal(allowed('https://www.ifood.com.br/order', 'POST'), false);
  assert.equal(allowed('https://www.ifood.com.br/order', 'DELETE'), false);
  assert.equal(allowed(url.replace('426614174000', '426614174001'), 'GET', true), false);
  assert.equal(allowed('https://www.ifood.com.br/entrar', 'GET', true), false);
  assert.equal(allowed('https://challenges.cloudflare.com/a', 'GET', true), false);
});

test('virtualized observations accumulate with stable IDs and never promote changed prices', () => {
  const first = mergeCapture(null, observed([item('Margherita')]), url);
  const second = mergeCapture(first, observed([item('Calabresa', 6000)]), url);
  const third = mergeCapture(second, observed([item('Margherita', 7000)]), url);
  assert.equal(first.itemCount, 1, 'merging must not mutate previous checkpoint');
  assert.equal(third.itemCount, 2);
  const products = third.categories[0].items;
  assert.deepEqual(products.map(p => p.id), ['item-1', 'item-2']);
  assert.equal(products[0].priceCents, null);
  assert.equal(products[0].needsReview, true);
  const exports = captureExports(third);
  assert.equal(exports.exportableCount, 1);
  assert.equal(exports.pendingCount, 1);
  assert.match(exports.text, /Calabresa R\$ 60,00/);
  assert.doesNotMatch(exports.text, /Margherita/);
});

test('runner never exports ambiguous/unavailable items or fabricates pizza sizes', () => {
  const capture = mergeCapture(null, observed([item('Margherita'), item('A partir de', null, {needsReview: true}),
    item('Indisponível', 2000, {available: false})]), url);
  const exports = captureExports(capture);
  assert.equal(exports.exportableCount, 1);
  assert.equal(exports.pendingCount, 2);
  assert.equal(exports.pizzaSizesPending, 1);
  const parsed = readMenuPages([{id: 'capture', lines: exports.text.split('\n').map(text => ({text}))}]);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].name, 'Margherita');
  assert.equal(readerItemReady(parsed.items[0]), false, 'owner must choose the missing size');
});

test('runner bounds a virtualized catalog to 200 and keeps the truncation warning', () => {
  let capture = null;
  for (let batch = 0; batch < 3; batch++) capture = mergeCapture(capture,
    observed(Array.from({length: 90}, (_, n) => item(`Produto ${batch * 90 + n}`))), url);
  assert.equal(capture.itemCount, 200);
  assert.equal(capture.truncated, true);
  assert.equal(new Set(capture.categories[0].items.map(p => p.id)).size, 200);
});
