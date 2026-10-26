import test from 'node:test';
import assert from 'node:assert/strict';
import {browserQaTarget, guardPublicGuestContext} from './browser-qa-target.mjs';

const publicOrigin = 'https://forno-cardapios.waves4845.chatgpt.site';
async function environment(base, publicQa, run) {
    const previous = {base: process.env.QA_BASE_URL, enabled: process.env.QA_PUBLIC_GUEST_QA};
    process.env.QA_BASE_URL = base;
    process.env.QA_PUBLIC_GUEST_QA = publicQa;
    try {await run();} finally {
        for (const [key, value] of [['QA_BASE_URL', previous.base], ['QA_PUBLIC_GUEST_QA', previous.enabled]]) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
    }
}

test('browser QA defaults to isolated loopback targets', async () => {
    for (const base of ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://[::1]:5173'])
        await environment(base, '', () => assert.deepEqual(browserQaTarget(), {base, publicReadOnly: false}));
});
test('public QA requires explicit opt-in to the exact existing site', async () => {
    await environment(publicOrigin, '', () => assert.throws(browserQaTarget));
    await environment(publicOrigin, 'true', () => assert.deepEqual(browserQaTarget(), {base: publicOrigin, publicReadOnly: true}));
    await environment('https://pizzaria-on.netlify.app','true',()=>assert.deepEqual(browserQaTarget(),{base:'https://pizzaria-on.netlify.app',publicReadOnly:true}));
    for (const base of [publicOrigin + '.example', publicOrigin + ':443', publicOrigin + '/app', publicOrigin + '?next=/app', 'https://example.test'])
        await environment(base, 'true', () => assert.throws(browserQaTarget));
});
test('credentials, alternative schemes and subpaths cannot loosen the loopback guard', async () => {
    for (const base of ['http://secret@localhost:5173', 'ftp://localhost', 'http://localhost:5173/criar', 'http://localhost:5173?url=https://example.test'])
        await environment(base, '', () => assert.throws(browserQaTarget));
});
test('public browser guard stops mutation methods before remote dispatch', async () => {
    await environment(publicOrigin, 'true', async () => {
        let handler;
        const violations = [];
        await guardPublicGuestContext({route: async (pattern, route) => {assert.equal(pattern, '**/*'); handler = route;}}, violations);
        for (const method of ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']) {
            let continued = false, aborted = false;
            await handler({request: () => ({method: () => method, url: () => publicOrigin + '/api/billing/checkout'}), continue: async () => {continued = true;}, abort: async () => {aborted = true;}});
            assert.equal(continued, ['GET', 'HEAD', 'OPTIONS'].includes(method));
            assert.equal(aborted, !continued);
        }
        assert.equal(violations.length, 4);
        for (const [url, expected] of [[publicOrigin + '/cdn-cgi/challenge-platform/h/b/jsd/oneshot/check', true], ['https://example.test/cdn-cgi/challenge-platform/check', false], [publicOrigin + '/api/auth/register', false], ['https://pizzaria-on.netlify.app/.netlify/submit-challenge', true], [publicOrigin + '/.netlify/submit-challenge', false], ['https://pizzaria-on.netlify.app/.netlify/submit-challenge/extra', false], ['https://pizzaria-on.netlify.app/api/auth/login', false]]) {
            let continued = false;
            await handler({request: () => ({method: () => 'POST', url: () => url}), continue: async () => {continued = true;}, abort: async () => {}});
            assert.equal(continued, expected, 'Somente a verificação normal de segurança na mesma origem é permitida.');
        }
    });
});
