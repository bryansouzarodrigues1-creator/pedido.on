import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget} from './browser-qa-target.mjs';

const {base, publicReadOnly} = browserQaTarget();
if (publicReadOnly) throw Error('O handoff com gravações só pode usar o D1/R2 local.');
const require = createRequire(import.meta.url);
const {chromium, devices} = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright-core');
const output = path.resolve(process.env.QA_BROWSER_OUTPUT || '.sites-runtime/browser-ci/handoff');
const profile = path.resolve(process.env.QA_GUEST_PROFILE || '.sites-runtime/browser-ci/guest/guest-profile');
const checks = [], errors = [];
let context, page;
await mkdir(output, {recursive: true});

async function start() {
    context = await chromium.launchPersistentContext(profile, {executablePath: process.env.QA_CHROME_PATH, headless: process.env.QA_HEADLESS === 'true', ...devices['Pixel 7'], locale: 'pt-BR', serviceWorkers: 'block'});
    await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        const allowedWrite = request.method() === 'POST' && /^\/api\/restaurants(?:\/[a-f0-9-]+\/media)?$/.test(url.pathname)
            || request.method() === 'PUT' && /^\/api\/restaurants\/[a-f0-9-]+$/.test(url.pathname);
        if (url.origin === base && (['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || allowedWrite)) return route.continue();
        errors.push('Solicitação inesperada bloqueada: ' + request.method() + ' ' + url.pathname);
        await route.abort('blockedbyclient');
    });
    page = await context.newPage();
    page.setDefaultTimeout(20_000);
    page.on('pageerror', error => errors.push(error.message));
}
async function rows() {
    return await page.evaluate(async () => {
        const response = await fetch('/api/restaurants', {cache: 'no-store'});
        if (!response.ok) throw Error('Não foi possível ler as pizzarias locais: ' + response.status);
        return (await response.json()).restaurants;
    });
}
async function stored(database, store, key) {
    return await page.evaluate(({database, store, key}) => new Promise((resolve, reject) => {
        const request = indexedDB.open(database);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(store)) {db.close(); resolve(null); return;}
            const tx = db.transaction(store, 'readonly'), read = tx.objectStore(store).get(key);
            read.onsuccess = () => resolve(read.result || null);
            read.onerror = () => reject(read.error);
            tx.oncomplete = () => db.close();
        };
    }), {database, store, key});
}
async function navigateTab(name) {
    const opener = page.getByRole('button', {name: 'Abrir menu do painel', exact: true});
    if (await opener.isVisible()) await opener.click();
    await page.getByRole('navigation', {name: 'Painel da pizzaria'}).getByRole('button', {name, exact: true}).click();
}
try {
    await start();
    await page.goto(base + '/cadastro', {waitUntil: 'networkidle', timeout: 90_000});
    const launch = await page.evaluate(() => JSON.parse(localStorage.getItem('pizzaria-menu-idea-v1')));
    assert.ok(launch?.styleId && launch.hasAssets && /3D/.test(launch.refinement));
    assert.match(launch.sourceText, /Suco natural/);
    // Official Sites local identity. This does not simulate a Supabase signup form.
    await page.goto(base + '/signin-with-chatgpt?return_to=' + encodeURIComponent('/app?new=1&setup=1'), {waitUntil: 'networkidle', timeout: 90_000});
    await page.locator('.create-shop input[autocomplete=organization]').waitFor();
    assert.equal(await page.locator('.create-shop input[autocomplete=organization]').inputValue(), 'Bella Massa QA');
    assert.equal(await page.locator('.create-idea-summary p').textContent(), launch.idea);
    assert.equal((await rows()).length, 0);
    checks.push({name: 'login local recupera o nome e a ideia sem nova pergunta', ok: true});

    const createdResponse = page.waitForResponse(response => response.url() === base + '/api/restaurants' && response.request().method() === 'POST');
    await page.getByRole('button', {name: 'Criar meu rascunho', exact: true}).click();
    const response = await createdResponse;
    assert.equal(response.status(), 201, await response.text());
    const input = response.request().postDataJSON();
    assert.equal(input.vision, launch.idea); assert.equal(input.styleId, launch.styleId); assert.equal(input.refinement, launch.refinement);
    const row = (await response.json()).restaurant, data = JSON.parse(row.data);
    assert.equal(row.published, false); assert.deepEqual(data.products, []); assert.equal(data.pix.enabled, false); assert.equal(data.pix.key, '');
    assert.equal(data.name, 'Bella Massa QA'); assert.equal(data.accent, '#296bac');
    assert.equal(data.presentation.layout, 'compact'); assert.equal(data.presentation.corners, 'soft');
    await page.waitForFunction(() => !document.querySelector('.create-shop') && !localStorage.getItem('pizzaria-menu-idea-v1'));
    const source = await stored('pedido-menu-readings', 'readings', row.id);
    const assets = await stored('pedido-brand-assets', 'assets', row.id);
    assert.match(source.text, /Suco natural/); assert.ok(assets.logo && assets.cover);
    checks.push({name: 'um rascunho privado recebe estilo, refinamentos, texto e marca sem cadastrar produtos ilustrativos', ok: true, restaurantId: row.id, products: data.products.length});

    const close = page.getByRole('button', {name: 'Fechar janela', exact: true});
    if (await close.count()) await close.click();
    await navigateTab('Pizzaria');
    for (const kind of ['logo', 'capa']) {
        const media = page.waitForResponse(response => response.url() === base + '/api/restaurants/' + row.id + '/media' && response.request().method() === 'POST');
        await page.getByRole('button', {name: 'Aplicar ' + kind, exact: true}).click();
        assert.equal((await media).status(), 200);
        await page.locator('.guest-brand-status').filter({hasText: kind === 'logo' ? 'Logo adicionado' : 'Capa adicionada'}).waitFor();
    }
    const saved = page.waitForResponse(response => response.url() === base + '/api/restaurants/' + row.id && response.request().method() === 'PUT');
    await page.getByRole('button', {name: 'Guardar rascunho', exact: true}).click();
    assert.equal((await saved).status(), 200);
    const records = await rows(), savedData = JSON.parse(records[0].data);
    assert.equal(records.length, 1); assert.equal(records[0].published, false);
    for (const kind of ['logo', 'cover']) {
        assert.ok(savedData[kind].startsWith('/media/' + row.id + '/'));
        const media = await context.request.get(base + savedData[kind]);
        assert.equal(media.status(), 200); assert.match(media.headers()['content-type'], /^image\//);
    }
    await page.screenshot({path: path.join(output, 'handoff-brand-applied.png'), fullPage: true});
    checks.push({name: 'logo e capa são enviados ao R2 local e guardados no rascunho', ok: true});

    await context.close(); await start();
    await page.goto(base + '/app?loja=' + row.id, {waitUntil: 'networkidle', timeout: 90_000});
    const reopened = await rows();
    assert.equal(reopened.length, 1); assert.equal(reopened[0].id, row.id); assert.equal(reopened[0].published, false);
    assert.deepEqual(JSON.parse(reopened[0].data), savedData);
    assert.equal(await page.locator('.create-shop').count(), 0);
    await page.screenshot({path: path.join(output, 'handoff-reopened.png'), fullPage: true});
    checks.push({name: 'fechar e reabrir preserva sessão, dados e o mesmo rascunho sem duplicação', ok: true});
    assert.deepEqual(errors, []);
} catch (error) {
    checks.push({name: 'handoff local', ok: false, error: error.message});
    await page?.screenshot({path: path.join(output, 'handoff-failure.png'), fullPage: true}).catch(() => {});
    console.error(error.stack);
    process.exitCode = 1;
} finally {
    await context?.close().catch(() => {});
    await writeFile(path.join(output, 'handoff-browser.json'), JSON.stringify({base, identity: 'mock local oficial Sites; Supabase externo não exercitado', checks, errors}, null, 2));
    console.log('HANDOFF ' + JSON.stringify({passed: checks.filter(check => check.ok).length, failed: checks.filter(check => !check.ok).length, errors}));
}
