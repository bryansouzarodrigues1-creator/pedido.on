import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {forwardToBackend} from '../lib/netlify-proxy.ts';
import {HostingProxyError, normalizeHostingRequest, proxyHeaders, signProxyRequest, PROXY_BODY_LIMIT} from '../lib/hosting-proxy-policy.ts';
import {sameOrigin} from '../lib/http-policy.ts';
import {fixture, csrf} from './test-backend-fixture.mjs';

const config = {PEDIDO_PUBLIC_ORIGIN: 'https://pedido.netlify.app', PEDIDO_BACKEND_ORIGIN: 'https://backend.example', PEDIDO_PROXY_SECRET: 'cd'.repeat(32)};
const now = 1_791_715_200_000;
function inbound(path = '/api/auth/config', method = 'GET', body, patch = {}) {
  return new Request(config.PEDIDO_PUBLIC_ORIGIN + path, {method, headers: {
    origin: config.PEDIDO_PUBLIC_ORIGIN, cookie: '__Host-pedido-csrf=' + csrf,
    'x-pedido-csrf': csrf, ...(body ? {'content-type': 'application/json'} : {}), ...patch,
  }, body});
}
async function signed(body = 'hello', patch = {}) {
  const bytes = new TextEncoder().encode(body);
  const request = new Request(config.PEDIDO_BACKEND_ORIGIN + '/api/test?q=1', {method: 'POST', headers: {
    origin: config.PEDIDO_PUBLIC_ORIGIN, cookie: '__Host-pedido-csrf=' + csrf, 'x-pedido-csrf': csrf,
  }, body});
  const headers = new Headers(request.headers);
  for (const [name, value] of Object.entries(await signProxyRequest(request, bytes, config, '203.0.113.10', now))) headers.set(name, value);
  for (const [name, value] of Object.entries(patch)) headers.set(name, value);
  return new Request(request.url, {method: request.method, headers, body});
}

test('Netlify preserves the public origin, cookies, CSRF, client IP and private response', async () => {
  let calls = 0;
  const response = await forwardToBackend(inbound('/api/test?q=1', 'POST', '{"value":1}', {
    'oai-authenticated-user-id': 'forged-owner', 'oai-authenticated-user-email': 'forged@example.test',
    'x-forwarded-proto': 'http', 'cf-connecting-ip': 'forged-ip', 'x-pedido-proxy-verified': 'forged',
    'x-pedido-proxy-cookie': 'v1.Zm9yZ2Vk',
  }), config, '203.0.113.10', async (url, options) => {
    calls++;
    assert.equal(url.href, config.PEDIDO_BACKEND_ORIGIN + '/api/test?q=1');
    assert.equal(options.redirect, 'manual');
    const result = await normalizeHostingRequest(new Request(url, options), config);
    assert.equal(result.proxied, true);
    assert.equal(result.request.url, config.PEDIDO_PUBLIC_ORIGIN + '/api/test?q=1');
    assert.equal(result.request.headers.get('cf-connecting-ip'), '203.0.113.10');
    assert.equal(result.request.headers.get('x-forwarded-proto'), 'https');
    assert.equal(result.request.headers.get('cookie'), '__Host-pedido-csrf=' + csrf);
    assert.equal(result.request.headers.get('oai-authenticated-user-id'), null);
    assert.equal(result.request.headers.get('oai-authenticated-user-email'), null);
    sameOrigin(result.request);
    assert.deepEqual(await result.request.json(), {value: 1});
    const headers = new Headers({'cache-control': 'private, no-store'});
    headers.append('set-cookie', '__Host-pedido-session=one; Secure; HttpOnly; Path=/');
    headers.append('set-cookie', '__Host-pedido-oauth=two; Secure; HttpOnly; Path=/');
    return new Response('ok', {status: 201, headers});
  });
  assert.equal(calls, 1);
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.equal(await response.text(), 'ok');
});

test('forged public origins, cookies, CSRF, IP and request bodies fail signature verification', async () => {
  for (const [name, value] of [[proxyHeaders.origin, 'https://attacker.example'], [proxyHeaders.ip, '203.0.113.11'],
    [proxyHeaders.cookie, 'v1.' + btoa('__Host-pedido-session=forged').replace(/=+$/, '')], ['x-pedido-csrf', 'ef'.repeat(32)], ['origin', 'https://attacker.example']]) {
    await assert.rejects(normalizeHostingRequest(await signed('hello', {[name]: value}), config, now), error => error instanceof HostingProxyError && error.status === 403);
  }
  const request = await signed();
  await assert.rejects(normalizeHostingRequest(new Request(request.url, {method: 'POST', headers: request.headers, body: 'changed'}), config, now), {status: 403});
  await assert.rejects(normalizeHostingRequest(await signed(), config, now + 31_000), {status: 403});
  await assert.rejects(normalizeHostingRequest(await signed(), config, now - 6_000), {status: 403});
});

test('signed application cookies survive a dispatcher stripping Cookie and ignore hosting-provider credentials', async () => {
  const response = await forwardToBackend(inbound('/api/test', 'POST', '{}', {
    cookie: '__Host-pedido-csrf=' + csrf + '; __Host-pedido-session=valid-session; nf_sso=private-provider-session; unrelated=ignored',
  }), config, '203.0.113.10', async (url, options) => {
    assert.equal(options.headers.get('cookie'), '__Host-pedido-csrf=' + csrf + '; __Host-pedido-session=valid-session');
    const envelope = options.headers.get(proxyHeaders.cookie);
    assert.ok(envelope.startsWith('v1.'));
    assert.ok(!envelope.includes(csrf) && !envelope.includes('valid-session'));
    assert.ok(!atob(envelope.slice(3).replace(/-/g, '+').replace(/_/g, '/')).includes('valid-session'), 'transport must encrypt rather than only encode credentials');
    const headers = new Headers(options.headers);
    headers.delete('cookie');
    const normalized = await normalizeHostingRequest(new Request(url, {...options, headers}), config);
    assert.equal(normalized.request.headers.get('cookie'), '__Host-pedido-csrf=' + csrf + '; __Host-pedido-session=valid-session');
    assert.equal(normalized.request.headers.get(proxyHeaders.cookie), null);
    sameOrigin(normalized.request);
    return new Response('ok');
  });
  assert.equal(response.status, 200);
});

test('an empty signed cookie remains empty despite dispatcher cookies, and forged or removed envelopes fail closed', async () => {
  const empty = new Request(config.PEDIDO_BACKEND_ORIGIN + '/api/test');
  const proof = await signProxyRequest(empty, new Uint8Array(0), config, '203.0.113.10', now);
  const normalized = await normalizeHostingRequest(new Request(empty.url, {headers: {...proof, cookie: '__Host-pedido-session=forged'}}), config, now);
  assert.equal(normalized.request.headers.get('cookie'), null);
  const original = await signed();
  const stripped = new Headers(original.headers);
  stripped.delete('cookie'); stripped.delete(proxyHeaders.cookie);
  await assert.rejects(normalizeHostingRequest(new Request(original.url, {method: 'POST', headers: stripped, body: 'hello'}), config, now), {status: 403});
  for (const value of ['not-base64', 'v1.a', 'v1.' + 'A'.repeat(22_001)]) {
    await assert.rejects(normalizeHostingRequest(await signed('hello', {[proxyHeaders.cookie]: value}), config, now), {status: 403});
  }
});

test('legacy signatures still verify while gateways roll over, but never grant a forged transit session', async () => {
  const original = await signed();
  const headers = new Headers(original.headers);
  headers.delete(proxyHeaders.cookie);
  const legacy = await normalizeHostingRequest(new Request(original.url, {method: 'POST', headers, body: 'hello'}), config, now);
  assert.equal(legacy.request.headers.get('cookie'), '__Host-pedido-csrf=' + csrf);
  headers.set('cookie', '__Host-pedido-session=forged');
  await assert.rejects(normalizeHostingRequest(new Request(original.url, {method: 'POST', headers, body: 'hello'}), config, now), {status: 403});
});

test('direct Sites requests keep their URL and normal flow; fake proxy headers cannot activate the bridge', async () => {
  const direct = new Request(config.PEDIDO_BACKEND_ORIGIN + '/calculadora');
  assert.deepEqual(await normalizeHostingRequest(direct, {}), {request: direct, proxied: false});
  await assert.rejects(normalizeHostingRequest(new Request(direct, {headers: {[proxyHeaders.verified]: config.PEDIDO_PUBLIC_ORIGIN}}), {}), {status: 403});
  await assert.rejects(normalizeHostingRequest(await signed(), {}, now), {status: 403});
  await assert.rejects(normalizeHostingRequest(await signed(), {...config, PEDIDO_PROXY_SECRET: 'ab'.repeat(32)}, now), {status: 403});
});

test('a cross-site mutation stays blocked by the application even through a valid gateway', async () => {
  const request = await signed('hello', {'sec-fetch-site': 'cross-site'});
  // Sign this header too: it is a real browser request, not a tampered packet.
  const headers = new Headers(request.headers);
  for (const [name, value] of Object.entries(await signProxyRequest(request, new TextEncoder().encode('hello'), config, '203.0.113.10', now))) headers.set(name, value);
  const normalized = await normalizeHostingRequest(new Request(request.url, {method: 'POST', headers, body: 'hello'}), config, now);
  assert.throws(() => sameOrigin(normalized.request), {status: 403});
});

test('proxy builds a fixed upstream host and does not follow or leak tokens to redirects', async () => {
  let calls = 0;
  const response = await forwardToBackend(inbound('//attacker.example/path?token=one'), config, '203.0.113.10', async (url, options) => {
    calls++;
    assert.equal(url.origin, config.PEDIDO_BACKEND_ORIGIN);
    assert.equal(url.pathname, '//attacker.example/path');
    assert.equal(options.redirect, 'manual');
    return new Response(null, {status: 303, headers: {location: config.PEDIDO_BACKEND_ORIGIN + '/app'}});
  });
  assert.equal(calls, 1);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), config.PEDIDO_PUBLIC_ORIGIN + '/app');
  const oauth = await forwardToBackend(inbound(), config, '203.0.113.10', async () => new Response(null, {status: 302, headers: {location: 'https://provider.example/auth'}}));
  assert.equal(oauth.headers.get('location'), 'https://provider.example/auth');
});

test('missing configuration and deploy previews fail closed without touching the server', async () => {
  let calls = 0;
  const upstream = async () => {calls++; return new Response('unexpected');};
  assert.equal((await forwardToBackend(inbound(), {}, '203.0.113.10', upstream)).status, 503);
  assert.equal((await forwardToBackend(new Request('https://deploy-preview-1--pedido.netlify.app/app'), config, '203.0.113.10', upstream)).status, 503);
  assert.equal((await forwardToBackend(inbound('/signin-with-chatgpt'), config, '203.0.113.10', upstream)).headers.get('location'), config.PEDIDO_PUBLIC_ORIGIN + '/entrar');
  assert.equal(calls, 0);
});

test('a gateway timeout leaves the existing AI request pending and never retries it', async () => {
  let calls = 0;
  const response = await forwardToBackend(inbound('/api/restaurants/shop-a/ai/images', 'POST', '{"requestId":"same-job"}'), config, '203.0.113.10', async () => {calls++; throw new DOMException('timeout', 'TimeoutError');});
  assert.equal(calls, 1);
  assert.equal(response.status, 504);
  assert.equal((await response.json()).attempt, 'pending');
});

test('gateway accepts a 5 MB proof and rejects oversized streamed uploads', async () => {
  const proof = new Uint8Array(PROXY_BODY_LIMIT);
  let calls = 0;
  const response = await forwardToBackend(new Request(config.PEDIDO_PUBLIC_ORIGIN + '/api/orders/id/receipt', {method: 'POST', headers: {'content-type': 'application/pdf'}, body: proof}), config, '203.0.113.10', async (url, options) => {
    calls++;
    const normalized = await normalizeHostingRequest(new Request(url, options), config);
    assert.equal((await normalized.request.arrayBuffer()).byteLength, PROXY_BODY_LIMIT);
    return new Response('accepted');
  });
  assert.equal(response.status, 200);
  const oversized = new Request(config.PEDIDO_PUBLIC_ORIGIN + '/api/orders/id/receipt', {method: 'POST', body: new ReadableStream({start(controller) {controller.enqueue(new Uint8Array(PROXY_BODY_LIMIT + 1)); controller.close();}}), duplex: 'half'});
  assert.equal((await forwardToBackend(oversized, config, '203.0.113.10', async () => {calls++; return new Response();})).status, 413);
  assert.equal(calls, 1);
});

test('authenticated restaurant routes keep owner checks behind the Netlify gateway', async () => {
  const f = fixture();
  try {
    const response = await forwardToBackend(inbound('/api/restaurants/shop-b', 'PUT', JSON.stringify({revision: 1, data: f.data})), config, '203.0.113.10', async (url, options) => {
      const normalized = await normalizeHostingRequest(new Request(url, options), config);
      return f.dispatch('restaurant', 'PUT', normalized.request, {id: 'shop-b'});
    });
    assert.equal(response.status, 404);
    const owned = await forwardToBackend(inbound('/api/restaurants/shop-a', 'PUT', JSON.stringify({revision: 1, data: f.data})), config, '203.0.113.10', async (url, options) => {
      const normalized = await normalizeHostingRequest(new Request(url, options), config);
      return f.dispatch('restaurant', 'PUT', normalized.request, {id: 'shop-a'});
    });
    assert.equal(owned.status, 200, await owned.clone().text());
    assert.equal((await owned.json()).restaurant.revision, 2);
  } finally {f.close();}
});

test('signed requests verify in the real Workers runtime, including browser origin and identity filtering', async () => {
  const require = createRequire(import.meta.url), ts = require('typescript');
  const {Miniflare} = require(require.resolve('miniflare', {paths: [require.resolve('wrangler')]}));
  const policy = ts.transpileModule(readFileSync(new URL('../lib/hosting-proxy-policy.ts', import.meta.url), 'utf8'), {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText;
  const accountPolicy = ts.transpileModule(readFileSync(new URL('../lib/account-origin-policy.ts', import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace('./hosting-proxy-policy.ts','./policy.mjs');
  const entry = ts.transpileModule(readFileSync(new URL('../build/sites-worker.ts', import.meta.url), 'utf8'), {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText
    .replace('"vinext/server/fetch-handler"', '"./handler.mjs"')
    .replace('"../lib/connector-context"', '"./context.mjs"')
    .replace('"../lib/hosting-proxy-policy"', '"./policy.mjs"')
    .replace('"../lib/account-origin-policy"', '"./account-policy.mjs"')
    .replace('import.meta.env.DEV', 'false');
  const handler = 'export default {async fetch(request){return Response.json({url:request.url,ip:request.headers.get("cf-connecting-ip"),owner:request.headers.get("oai-authenticated-user-id"),cookie:request.headers.get("cookie"),body:await request.text()});}};';
  const mf = new Miniflare({modules: [
    {type: 'ESModule', path: 'entry.mjs', contents: entry},
    {type: 'ESModule', path: 'policy.mjs', contents: policy},
    {type: 'ESModule', path: 'account-policy.mjs', contents: accountPolicy},
    {type: 'ESModule', path: 'handler.mjs', contents: handler},
    {type: 'ESModule', path: 'context.mjs', contents: 'export function runWithConnectorBinding(binding,fn){return fn();}'},
  ], compatibilityDate: '2026-05-15', bindings: config});
  try {
    const response = await forwardToBackend(inbound('/api/test?q=1', 'POST', 'hello', {'oai-authenticated-user-id': 'forged-owner'}), config, '203.0.113.10', async (url, options) => {
      const headers = new Headers(options.headers); headers.delete('cookie');
      return mf.dispatchFetch(url, {...options, headers});
    });
    assert.equal(response.status, 200, await response.clone().text());
    assert.deepEqual(await response.json(), {url: config.PEDIDO_PUBLIC_ORIGIN + '/api/test?q=1', ip: '203.0.113.10', owner: null, cookie: '__Host-pedido-csrf=' + csrf, body: 'hello'});
    assert.equal((await mf.dispatchFetch(config.PEDIDO_BACKEND_ORIGIN + '/calculadora', {headers: {[proxyHeaders.verified]: config.PEDIDO_PUBLIC_ORIGIN}})).status, 403);
  } finally {await mf.dispose();}
});
