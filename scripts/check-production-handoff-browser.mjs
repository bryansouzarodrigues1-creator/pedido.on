// Explicit one-time production QA, using normal UI signup. Never run by pnpm test.
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.CI !== 'true' || process.env.SITES_MANAGED_LINUX_CONTAINER === '1' || process.env.QA_PRODUCTION_HANDOFF_ONCE !== 'v45-20261016')
    throw Error('Teste de produção disponível somente no slot de QA explicitamente autorizado.');
const require = createRequire(import.meta.url);
const {chromium, devices} = require(process.env.QA_PLAYWRIGHT_MODULE);
const base = 'https://forno-cardapios.waves4845.chatgpt.site';
// Fixed reserved address prevents retries from creating more accounts.
const email = 'qa-v45-completo-20261016@example.test';
const password = randomBytes(28).toString('base64url') + 'aA1!'; // Memory only.
const root = path.resolve('.sites-runtime/production-handoff-once');
const output = path.join(root, 'evidence'), profile = path.join(root, 'guest/guest-profile');
await mkdir(output, {recursive: true});
const proof = {base, slot: 'v45-20261016', phase: 'start', registered: false, registrationSent: false, draftCreated: false, checks: [], errors: [], forbiddenRequests: [], applicationWrites: {register: 0, create: 0, media: 0, save: 0}};
let context, page, restaurantId;
async function save() {await writeFile(path.join(output, 'production-handoff.json'), JSON.stringify(proof, null, 2));}
async function phase(value) {proof.phase = value; await save();}
async function start() {
    context = await chromium.launchPersistentContext(profile, {executablePath: process.env.QA_CHROME_PATH, headless: true, ...devices['Pixel 7'], locale: 'pt-BR', serviceWorkers: 'block'});
    await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url()), method = request.method();
        if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return route.continue();
        if (url.origin === base && method === 'POST' && url.pathname.startsWith('/cdn-cgi/challenge-platform/')) return route.continue();
        let key;
        if (url.origin === base) {
            if (method === 'POST' && url.pathname === '/api/auth/register' && proof.applicationWrites.register === 0) key = 'register';
            else if (proof.registered && method === 'POST' && url.pathname === '/api/restaurants' && proof.applicationWrites.create === 0) key = 'create';
            else if (restaurantId && method === 'POST' && url.pathname === '/api/restaurants/' + restaurantId + '/media' && proof.applicationWrites.media < 2) key = 'media';
            else if (restaurantId && method === 'PUT' && url.pathname === '/api/restaurants/' + restaurantId && proof.applicationWrites.save === 0) key = 'save';
        }
        if (key) {proof.applicationWrites[key]++; await save(); return route.continue();}
        proof.forbiddenRequests.push(method + ' ' + url.pathname); await save(); await route.abort('blockedbyclient');
    });
    page = await context.newPage(); page.setDefaultTimeout(25_000);
    page.on('pageerror', error => proof.errors.push(error.message.replaceAll(password, '[redacted]')));
}
async function shops() {
    return await page.evaluate(async () => {
        const response = await fetch('/api/restaurants', {cache: 'no-store'});
        if (!response.ok) throw Error('Lista de rascunhos: HTTP ' + response.status);
        return (await response.json()).restaurants;
    });
}
async function tab(name) {
    const opener = page.getByRole('button', {name: 'Abrir menu do painel', exact: true});
    if (await opener.isVisible()) await opener.click();
    await page.getByRole('navigation', {name: 'Painel da pizzaria'}).getByRole('button', {name, exact: true}).click();
}
try {
    await start();
    await page.goto(base + '/cadastro?next=' + encodeURIComponent('/app?new=1&setup=1'), {waitUntil: 'networkidle', timeout: 90_000});
    const launch = await page.evaluate(() => JSON.parse(localStorage.getItem('pizzaria-menu-idea-v1')));
    assert.ok(launch?.styleId && launch.hasAssets && /3D/.test(launch.refinement));
    assert.match(launch.sourceText, /Suco natural/);
    const config = await page.evaluate(async () => (await fetch('/api/auth/config?registration=1', {cache: 'no-store'})).json());
    assert.equal(config.registrationEnabled, true); assert.equal(config.directSignup, true); assert.equal(config.inviteRequired, false);
    assert.equal(config.captchaSiteKey, '', 'Uma verificação interativa exige homologação manual, sem contorno.');
    proof.googleEnabled = config.googleEnabled;
    assert.equal(await page.getByRole('button', {name: 'Continuar com Google', exact: true}).count(), config.googleEnabled ? 1 : 0);
    proof.checks.push({name: 'projeto recuperado e cadastro direto disponível; Google condicional confere com a configuração', ok: true});
    await phase('registration');
    await page.getByRole('textbox', {name: 'Seu nome', exact: true}).fill('QA Pizzaria v45');
    await page.getByRole('textbox', {name: 'E-mail', exact: true}).fill(email);
    await page.locator('input[autocomplete=new-password]').nth(0).fill(password);
    await page.locator('input[autocomplete=new-password]').nth(1).fill(password);
    proof.registrationSent = true; await save();
    const registration = page.waitForResponse(response => response.url() === base + '/api/auth/register' && response.request().method() === 'POST');
    await page.getByRole('button', {name: 'Criar minha conta', exact: true}).click();
    const response = await registration;
    proof.registrationStatus = response.status(); await save();
    assert.equal(response.status(), 200, 'Cadastro real falhou. Não há repetição automática.');
    proof.registered = true; await phase('create-draft');
    await page.waitForURL(url => url.pathname === '/app', {timeout: 90_000});
    await page.locator('.create-shop input[autocomplete=organization]').waitFor();
    assert.equal(await page.locator('.create-shop input[autocomplete=organization]').inputValue(), 'Bella Massa QA');
    assert.equal(await page.locator('.create-idea-summary p').textContent(), launch.idea);
    assert.equal((await shops()).length, 0);
    proof.checks.push({name: 'cadastro Supabase por e-mail abre diretamente o rascunho com nome e briefing preservados', ok: true});
    await page.locator('.create-link-options summary').click();
    await page.getByRole('textbox', {name: 'Endereço do cardápio', exact: true}).fill('qa-v45-handoff-20261016');
    const creation = page.waitForResponse(response => response.url() === base + '/api/restaurants' && response.request().method() === 'POST');
    await page.getByRole('button', {name: 'Criar meu rascunho', exact: true}).click();
    const created = await creation;
    assert.equal(created.status(), 201, 'Falha na criação do único rascunho QA.');
    const row = (await created.json()).restaurant, input = created.request().postDataJSON();
    restaurantId = row.id; proof.restaurantId = row.id; proof.draftCreated = true; await save();
    assert.equal(input.vision, launch.idea); assert.equal(input.styleId, launch.styleId); assert.equal(input.refinement, launch.refinement);
    const data = JSON.parse(row.data);
    assert.equal(row.published, false); assert.deepEqual(data.products, []); assert.equal(data.pix.enabled, false); assert.equal(data.pix.key, '');
    assert.equal(data.presentation.layout, 'compact'); assert.equal(data.presentation.corners, 'soft'); assert.equal(data.accent, '#296bac');
    await page.waitForFunction(() => !document.querySelector('.create-shop') && !localStorage.getItem('pizzaria-menu-idea-v1'));
    proof.checks.push({name: 'um único rascunho privado preserva o visual e o refinamento, sem produtos de exemplo nem Pix configurado', ok: true});
    const source = await page.evaluate(id => new Promise((resolve, reject) => {
        const open = indexedDB.open('pedido-menu-readings'); open.onerror = () => reject(open.error);
        open.onsuccess = () => {const db = open.result, tx = db.transaction('readings', 'readonly'), read = tx.objectStore('readings').get(id); read.onsuccess = () => resolve(read.result?.text || ''); read.onerror = () => reject(read.error); tx.oncomplete = () => db.close();};
    }), row.id);
    assert.match(source, /Suco natural/);
    const close = page.getByRole('button', {name: 'Fechar janela', exact: true});
    if (await close.count()) await close.click();
    await phase('brand-upload'); await tab('Pizzaria');
    for (const kind of ['logo', 'capa']) {
        const media = page.waitForResponse(response => response.url() === base + '/api/restaurants/' + row.id + '/media' && response.request().method() === 'POST');
        await page.getByRole('button', {name: 'Aplicar ' + kind, exact: true}).click();
        assert.equal((await media).status(), 201);
        await page.locator('.guest-brand-status').filter({hasText: kind === 'logo' ? 'Logo adicionado' : 'Capa adicionada'}).waitFor();
    }
    const saved = page.waitForResponse(response => response.url() === base + '/api/restaurants/' + row.id && response.request().method() === 'PUT');
    await page.getByRole('button', {name: 'Guardar rascunho', exact: true}).click();
    assert.equal((await saved).status(), 200);
    const records = await shops(), savedData = JSON.parse(records[0].data);
    assert.equal(records.length, 1); assert.equal(records[0].published, false);
    assert.deepEqual(savedData.products, []); assert.deepEqual(savedData.pix, data.pix);
    for (const kind of ['logo', 'cover']) assert.ok(savedData[kind].startsWith('/media/' + row.id + '/'));
    proof.checks.push({name: 'texto, logo e capa transferidos; duas imagens próprias no R2 e rascunho guardado em produção', ok: true});
    await page.screenshot({path: path.join(output, 'brand-saved.png'), fullPage: true});
    await phase('studio-preservation'); await tab('Criar com IA');
    const studio = await page.locator('.creation-field textarea').inputValue();
    assert.ok(studio.includes(launch.idea)); assert.match(studio, /3D/);
    proof.checks.push({name: 'briefing longo e pedido fora do motor local chegam inteiros ao Estúdio sem geração', ok: true});
    await phase('reopen-session'); await context.close(); await start();
    await page.goto(base + '/app?loja=' + row.id, {waitUntil: 'networkidle', timeout: 90_000});
    const session = await page.evaluate(async () => (await fetch('/api/auth/session', {cache: 'no-store'})).json());
    assert.equal(session.user?.provider, 'supabase'); assert.equal(session.user?.loginMethod, 'email');
    const reopened = await shops();
    assert.equal(reopened.length, 1); assert.equal(reopened[0].id, row.id); assert.equal(reopened[0].published, false);
    assert.deepEqual(JSON.parse(reopened[0].data), savedData); assert.equal(await page.locator('.create-shop').count(), 0);
    proof.checks.push({name: 'fechar e reabrir Chrome preserva a sessão Supabase e o mesmo rascunho, sem novo login nem duplicação', ok: true});
    await page.screenshot({path: path.join(output, 'session-reopened.png'), fullPage: true});
    assert.deepEqual(proof.forbiddenRequests, []); assert.deepEqual(proof.errors, []);
    await phase('completed');
} catch (error) {
    const safe = String(error.message).replaceAll(password, '[redacted]');
    proof.checks.push({name: proof.phase, ok: false, error: safe});
    if (proof.registered) await page?.screenshot({path: path.join(output, 'handoff-failure.png'), fullPage: true}).catch(() => {});
    console.error('QA_HANDOFF_FAILED ' + proof.phase + ': ' + safe);
    process.exitCode = 1;
} finally {
    await context?.close().catch(() => {}); await save();
    console.log('PRODUCTION_HANDOFF ' + JSON.stringify({phase: proof.phase, registered: proof.registered, draftCreated: proof.draftCreated, passed: proof.checks.filter(check => check.ok).length, failed: proof.checks.filter(check => !check.ok).length, writes: proof.applicationWrites}));
}
