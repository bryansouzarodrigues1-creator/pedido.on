import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {withBrowserbase, browserbaseSessionOptions, browserbaseConnectUrl} from '../tools/ifood-capture-runner/browserbase.mjs';

const key = 'secret-for-synthetic-test-only';
const connectUrl = 'wss://connect.browserbase.com?apiKey=' + key + '&sessionId=synthetic-session';
function fixture({createStatus = 201, session = {id: 'synthetic-session', connectUrl},
  connectError = null, releaseStatus = 200, runError = null} = {}) {
  const calls = [], closed = [];
  const browser = {async close() { closed.push(true); }};
  const fetchImpl = async (url, init) => {
    calls.push({url, ...init, body: JSON.parse(init.body)});
    return new Response(JSON.stringify(calls.length === 1 ? session : {status: 'COMPLETED'}),
      {status: calls.length === 1 ? createStatus : releaseStatus});
  };
  const chromium = {async connectOverCDP(url, options) {
    assert.equal(url, connectUrl); assert.equal(options.timeout, 15000);
    if (connectError) throw connectError;
    return browser;
  }};
  const options = {apiKey: key, freeBudgetConfirmed: true, fetchImpl, chromium,
    run: async value => { assert.equal(value, browser); if (runError) throw runError; return {synthetic: true}; }};
  return {options, calls, closed};
}

test('cloud session is short, anonymous and excludes paid add-ons and recordings', () => {
  const options = browserbaseSessionOptions('project-test');
  assert.equal(options.timeout, 90); assert.equal(options.keepAlive, false);
  assert.equal(options.proxies, false); assert.equal(options.projectId, 'project-test');
  assert.deepEqual(options.browserSettings, {solveCaptchas: false, advancedStealth: false,
    verified: false, recordSession: false, logSession: false, allowedDomains: ['www.ifood.com.br'],
    viewport: {width: 1280, height: 900}});
  assert.equal('context' in options.browserSettings, false);
  assert.equal('projectId' in browserbaseSessionOptions(), false);
});

test('CDP destination must be a credential-free secure Browserbase host', () => {
  assert.equal(browserbaseConnectUrl(connectUrl), connectUrl);
  assert.equal(browserbaseConnectUrl('wss://connect.us-west-2.browserbase.com/session'), 'wss://connect.us-west-2.browserbase.com/session');
  for (const url of ['ws://connect.browserbase.com', 'https://connect.browserbase.com',
    'wss://browserbase.com.evil.invalid', 'wss://127.0.0.1',
    'wss://user:password@connect.browserbase.com', 'wss://connect.browserbase.com:9443'])
    assert.throws(() => browserbaseConnectUrl(url), /conexão válida/);
});

test('free allowance confirmation is checked before any API call', async () => {
  const f = fixture();
  await assert.rejects(withBrowserbase({...f.options, freeBudgetConfirmed: false}), /franquia gratuita/);
  assert.equal(f.calls.length, 0);
});

test('missing credentials are rejected before any API call', async () => {
  for (const apiKey of [undefined, '', ' ', 'bad\nkey']) {
    const f = fixture();
    await assert.rejects(withBrowserbase({...f.options, apiKey}), /BROWSERBASE_API_KEY/);
    assert.equal(f.calls.length, 0);
  }
});

test('one API create, bounded connection, one execution, disconnect and explicit release', async () => {
  const f = fixture(); const output = await withBrowserbase(f.options);
  assert.deepEqual(output.result, {synthetic: true});
  assert.equal(output.session.releaseRequested, true);
  assert.equal(f.calls.length, 2); assert.equal(f.closed.length, 1);
  assert.deepEqual(f.calls.map(c => c.url), [
    'https://api.browserbase.com/v1/sessions', 'https://api.browserbase.com/v1/sessions/synthetic-session']);
  for (const call of f.calls) {
    assert.equal(call.method, 'POST'); assert.equal(call.redirect, 'error');
    assert.equal(call.headers['X-BB-API-Key'], key); assert.ok(call.signal instanceof AbortSignal);
  }
  assert.deepEqual(f.calls[1].body, {status: 'REQUEST_RELEASE'});
  assert.equal(JSON.stringify(output).includes(key), false);
  assert.equal(JSON.stringify(output).includes('wss:'), false);
});

test('provider refusal is not retried and does not disclose its response body', async () => {
  const f = fixture({createStatus: 401, session: {error: key}});
  await assert.rejects(withBrowserbase(f.options), error => /HTTP 401/.test(error.message) && !error.message.includes(key));
  assert.equal(f.calls.length, 1); assert.equal(f.closed.length, 0);
});

test('connection failure redacts the secret WSS URL and still releases its session', async () => {
  const f = fixture({connectError: new Error('Connection failed: ' + connectUrl)});
  await assert.rejects(withBrowserbase(f.options), error => /conectar/.test(error.message) && !error.message.includes(key));
  assert.equal(f.calls.length, 2); assert.equal(f.closed.length, 0);
});

test('capture failure still disconnects and releases without creating another session', async () => {
  const f = fixture({runError: new Error('synthetic disk failure')});
  await assert.rejects(withBrowserbase(f.options), /synthetic disk failure/);
  assert.equal(f.closed.length, 1); assert.equal(f.calls.length, 2);
});

test('invalid returned CDP endpoint is never contacted and owned session is released', async () => {
  const f = fixture({session: {id: 'synthetic-session', connectUrl: 'wss://127.0.0.1/private'}});
  let connected = false;
  f.options.chromium.connectOverCDP = async () => { connected = true; };
  await assert.rejects(withBrowserbase(f.options), /conexão válida/);
  assert.equal(connected, false); assert.equal(f.calls.length, 2);
});

test('unconfirmed release emits a safe warning and retains the provider timeout', async () => {
  const f = fixture({releaseStatus: 503});
  await assert.rejects(withBrowserbase(f.options), error => /90 segundos/.test(error.message) && !error.message.includes(key));
  assert.equal(f.calls[0].body.timeout, 90); assert.equal(f.calls.length, 2);
});

test('malformed project is rejected before a session is charged', async () => {
  const f = fixture();
  await assert.rejects(withBrowserbase({...f.options, projectId: '../../elsewhere'}), /identificador/);
  assert.equal(f.calls.length, 0);
});

test('CLI refuses an unauthorized store or missing free-budget confirmation before loading driver', () => {
  const url = 'https://www.ifood.com.br/delivery/teste-rj/pizzaria/123e4567-e89b-42d3-a456-426614174000';
  const script = 'tools/ifood-capture-runner/run-browserbase.mjs';
  for (const [args, message] of [
    [['--url', url], /autorização/],
    [['--url', url, '--authorized'], /franquia gratuita/]
  ]) {
    const run = spawnSync(process.execPath, [script, ...args], {encoding: 'utf8'});
    assert.equal(run.status, 1); assert.match(run.stderr, message);
  }
});
