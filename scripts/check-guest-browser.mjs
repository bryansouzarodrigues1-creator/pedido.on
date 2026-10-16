import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path');
const { chromium, devices } = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright-core');
const base = (process.env.QA_BASE_URL || 'http://localhost:5173').replace(/\/$/, ''), key = 'pizzaria-menu-idea-v1';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname))
    throw Error('Este teste grava dados locais: use um preview em loopback.');
if (!process.env.QA_CHROME_PATH)
    throw Error('Informe QA_CHROME_PATH para usar um Chrome já instalado.');
const runRoot = path.resolve(process.env.QA_BROWSER_OUTPUT || ('.sites-runtime/browser-qa/' + Date.now()));
const dir = path.join(runRoot, 'evidence'), results = [], errors = [];
const pause = ms => new Promise(r => setTimeout(r, ms));
let context, page;
async function record(name, run) { try {
    const detail = await run();
    results.push({ name, ok: true, detail });
    console.log('PASS ' + name + ' ' + JSON.stringify(detail ?? {}));
}
catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.log('FAIL ' + name + ' ' + e.message);
    await page?.screenshot({path: path.join(dir, 'failure-' + results.length + '.png'), fullPage: true}).catch(() => {});
} await fs.writeFile(path.join(dir, 'guest-browser.json'), JSON.stringify({ base, device: 'Chrome / Pixel 7 emulado', host: process.platform, checks: results, errors }, null, 2)); }
async function screenshot(name) { await page.screenshot({ path: path.join(dir, name + '.png'), fullPage: true }); }
async function start(profile = 'guest-profile') { context = await chromium.launchPersistentContext(path.join(runRoot, profile), { executablePath: process.env.QA_CHROME_PATH, headless: process.env.QA_HEADLESS === 'true', ...devices['Pixel 7'], locale: 'pt-BR' }); page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', e => errors.push(e.message)); }
async function load() { await page.goto(base + '/criar', { waitUntil: 'networkidle', timeout: 90000 }); await page.locator('#pizzeria-idea').waitFor({ state: 'visible' }); await page.waitForFunction(() => !document.querySelector('#pizzeria-idea').disabled); }
(async () => {
    await fs.mkdir(dir, { recursive: true });
    await start();
    const idea = 'Minha pizzaria se chama Bella Massa QA. Quero um cardápio artesanal e elegante. ' + ('A pizza é feita com ingredientes da casa. '.repeat(36)).slice(0, 1490);
    await record('entrada direta sem conta', async () => { await load(); assert.deepEqual(errors, [], 'A entrada não pode ter erro de hidratação.'); assert.equal(await page.locator('input[type=email],input[type=password]').count(), 0); await screenshot('candidate-entry'); return { url: page.url(), promptEnabled: await page.locator('#pizzeria-idea').isEnabled() }; });
    await record('prompt longo e controles em tela estreita', async () => { await page.locator('#pizzeria-idea').fill(idea); for (const width of [320, 360, 412]) {
        await page.setViewportSize({ width, height: 480 });
        await page.locator('#pizzeria-idea').focus();
        await page.getByRole('button', { name: 'Criar opções', exact: true }).scrollIntoViewIfNeeded();
        const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
        assert.ok(geometry.scroll <= geometry.width + 1, JSON.stringify(geometry));
    } await page.setViewportSize({ width: 412, height: 839 }); return { characters: idea.length, widths: [320, 360, 412], shortViewportHeight: 480 }; });
    const styles = [];
    await record('oito propostas com estruturas distintas e nome reconhecido', async () => {
        await page.getByRole('button', { name: 'Criar opções', exact: true }).click();
        await page.locator('.ai-style-card').first().waitFor();
        assert.equal(await page.locator('.ai-brand-name').count(), 0);
        assert.match(await page.locator('.ai-gallery-sample').textContent(), /ilustrativos/);
        for (let round = 0; round < 2; round++) {
            assert.equal(await page.locator('.ai-style-card').count(), 4);
            for (let i = 0; i < 4; i++) {
                const card = page.locator('.ai-style-card').nth(i);
                await page.locator('.ai-style-grid').evaluate((g, i) => { const cards = g.querySelectorAll('.ai-style-card'); g.scrollTo({ left: cards[i].getBoundingClientRect().left - cards[0].getBoundingClientRect().left, behavior: 'instant' }); }, i);
                await pause(200);
                await card.scrollIntoViewIfNeeded();
                const info = await card.evaluate(el => { const menu = el.querySelector('.mini-menu'), cover = el.querySelector('.mini-cover'), p = el.querySelector('.mini-product'); return { title: el.querySelector('.ai-style-footer strong').textContent, classes: menu.className, name: el.querySelector('.mini-top strong').textContent, cardWidth: el.getBoundingClientRect().width, cover: { height: cover.getBoundingClientRect().height, display: getComputedStyle(cover).display, columns: getComputedStyle(cover).gridTemplateColumns }, product: p ? { height: p.getBoundingClientRect().height, direction: getComputedStyle(p).flexDirection } : null }; });
                assert.equal(info.name, 'Bella Massa QA');
                styles.push(info);
                await card.screenshot({ path: path.join(dir, 'style-' + (round * 4 + i + 1) + '.png') });
            }
            if (!round)
                await page.getByRole('button', { name: 'Ver os outros quatro estilos', exact: true }).click();
        }
        assert.equal(new Set(styles.map(s => s.title)).size, 8);
        assert.equal(new Set(styles.map(s => s.classes)).size, 8);
        await screenshot('candidate-gallery-mobile');
        return styles;
    });
    await record('navegação horizontal até o último modelo', async () => { const grid = page.locator('.ai-style-grid'); const data = await grid.evaluate(el => { el.scrollLeft = el.scrollWidth; return { client: el.clientWidth, scroll: el.scrollWidth, left: el.scrollLeft }; }); assert.ok(data.scroll > data.client); await page.locator('.ai-style-card').last().getByRole('button').click(); await page.locator('.ai-selected').waitFor(); await screenshot('candidate-selected'); return data; });
    await record('refinamentos sequenciais gratuitos', async () => { for (const value of ['Quero verde com cantos arredondados', 'Agora azul e uma lista compacta']) {
        await page.getByRole('button', { name: 'Quero ajustar o design', exact: true }).click();
        await page.locator('#gallery-feedback').fill(value);
        await page.getByRole('button', { name: 'Aplicar meu pedido', exact: true }).click();
    } const design = await page.locator('.ai-selected .mini-menu').evaluate(el => ({ class: el.className, accent: el.style.getPropertyValue('--accent'), style: el.getAttribute('style') })); assert.match(design.class, /layout-compact/); assert.match(design.class, /corners-soft/); assert.match(design.style, /#296bac/i); return design; });
    await record('limite honesto para pedidos fora dos modelos', async () => { await page.getByRole('button', { name: 'Quero ajustar o design', exact: true }).click(); await page.locator('#gallery-feedback').fill('Crie uma animação 3D de uma lua girando'); await page.getByRole('button', { name: 'Aplicar meu pedido', exact: true }).click(); const notice = await page.locator('.ai-gallery-feedback').textContent(); assert.match(notice, /além das alterações gratuitas/); return notice; });
    await record('anexos TXT e CSV sem confusão com a marca', async () => { await page.getByRole('button', { name: /Anexar arquivos/ }).click(); const file = page.locator('input[type=file][accept*=".txt"]'); await file.setInputFiles({ name: 'cardapio.txt', mimeType: 'text/plain', buffer: Buffer.from('BEBIDAS\nRefrigerante lata R$ 6,00\nÁgua mineral R$ 4,00') }); await page.waitForFunction(() => document.querySelector('#idea-source-text').value.includes('Água mineral')); await file.setInputFiles({ name: 'cardapio.csv', mimeType: 'text/csv', buffer: Buffer.from('categoria;nome;preco\nBebidas;Suco natural;8,00') }); await page.waitForFunction(() => document.querySelector('#idea-source-text').value.includes('Suco natural')); return { sourceText: await page.locator('#idea-source-text').inputValue() }; });
    let png;
    await record('logo e capa separados; adicionar, remover e recuperar', async () => { png = Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 600; c.height = 400; const x = c.getContext('2d'); x.fillStyle = '#f3dec5'; x.fillRect(0, 0, 600, 400); x.fillStyle = '#a63823'; x.font = 'bold 42px sans-serif'; x.fillText('BELLA MASSA QA', 70, 190); return c.toDataURL('image/png').split(',')[1]; }), 'base64'); const files = page.locator('input[type=file]'); await files.nth(2).setInputFiles({ name: 'logo-qa.png', mimeType: 'image/png', buffer: png }); await page.getByRole('button', { name: 'Remover logo', exact: true }).waitFor(); await files.nth(3).setInputFiles({ name: 'capa-qa.png', mimeType: 'image/png', buffer: png }); await page.getByRole('button', { name: 'Remover capa', exact: true }).waitFor(); assert.equal(await page.locator('.idea-photos img').count(), 0); await page.getByRole('button', { name: 'Remover logo', exact: true }).click(); await page.waitForFunction(() => !document.querySelector('img[alt="Logo anexado"]')); assert.equal(await page.locator('img[alt="Capa ou referência anexada"]').count(), 1); await files.nth(2).setInputFiles({ name: 'logo-qa.png', mimeType: 'image/png', buffer: png }); await page.getByRole('button', { name: 'Remover logo', exact: true }).waitFor(); await page.reload({ waitUntil: 'networkidle' }); assert.equal(await page.locator('img[alt="Logo anexado"]').count(), 1); assert.equal(await page.locator('img[alt="Capa ou referência anexada"]').count(), 1); return { brand: 2, ocrPhotos: 0 }; });
    await record('foto do cardápio adicionada e removida separadamente', async () => { await page.locator('input[type=file]').nth(0).setInputFiles({ name: 'foto-cardapio-qa.png', mimeType: 'image/png', buffer: png }); await page.locator('.idea-photos img').waitFor(); await page.getByRole('button', { name: 'Remover foto-cardapio-qa.png', exact: true }).click(); assert.equal(await page.locator('.idea-photos img').count(), 0); assert.equal(await page.locator('.idea-brand-previews img').count(), 2); });
    await record('recuperação após fechar e reabrir o Chrome', async () => { await pause(800); await context.close(); await start(); await load(); assert.equal(await page.locator('#pizzeria-idea').inputValue(), idea); assert.match(await page.locator('#idea-source-text').inputValue(), /Suco natural/); assert.equal(await page.locator('.idea-brand-previews img').count(), 2); return { briefing: true, source: true, brand: true }; });
    await record('atualizar a leitura preserva o modelo e os pedidos escritos', async () => {
        const before = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
        assert.match(before.refinement, /3D/);
        await page.getByRole('button', { name: 'Criar opções', exact: true }).click();
        await page.getByRole('button', { name: 'Atualizar prévias', exact: true }).waitFor();
        assert.equal(await page.locator('.ai-selected').count(), 1, 'Atualizar os produtos não pode apagar o modelo escolhido.');
        const design = await page.locator('.ai-selected .mini-menu').getAttribute('class');
        assert.match(design, /layout-compact/);
        assert.match(design, /corners-soft/);
        await page.waitForFunction(({ key, before }) => {
            const saved = JSON.parse(localStorage.getItem(key));
            return saved.refinement === before.refinement && saved.styleId === before.styleId;
        }, { key, before });
        return { styleId: before.styleId, refinementPreserved: true, sourceUpdated: true };
    });
    await record('roteamento para cadastro preserva o projeto', async () => { if (!await page.locator('.ai-selected').count()) await page.locator('.ai-style-card').first().getByRole('button').click(); const title = await page.locator('.ai-selected-bar strong').textContent(); await page.getByRole('button', { name: 'Continuar com este cardápio', exact: true }).click(); await page.waitForURL('**/cadastro?next=*'); const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key); assert.equal(saved.idea, idea); assert.ok(saved.styleId); assert.ok(saved.hasAssets); return { url: page.url(), title, styleId: saved.styleId, characters: saved.idea.length, hasAssets: saved.hasAssets }; });
    await context.close();
    const browser = await chromium.launch({ executablePath: process.env.QA_CHROME_PATH, headless: process.env.QA_HEADLESS === 'true' });
    for (const type of ['local-only-blocked', 'both-blocked']) {
        context = await browser.newContext({ ...devices['Pixel 7'], locale: 'pt-BR' });
        page = await context.newPage();
        await context.addInitScript(({ both }) => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('QA storage denied', 'SecurityError'); } }); if (both)
            Object.defineProperty(window, 'indexedDB', { get() { throw new DOMException('QA storage denied', 'SecurityError'); } }); }, { both: type === 'both-blocked' });
        await record(type === 'local-only-blocked' ? 'IndexedDB recupera com localStorage bloqueado' : 'dois armazenamentos bloqueados impedem perda no cadastro', async () => { await load(); await page.locator('#pizzeria-idea').fill('Minha pizzaria se chama Persistência QA.'); await page.getByRole('button', { name: 'Criar opções', exact: true }).click(); await page.locator('.ai-style-card').first().getByRole('button').click(); await pause(600); if (type === 'local-only-blocked') {
            await page.reload({ waitUntil: 'networkidle' });
            assert.equal(await page.locator('#pizzeria-idea').inputValue(), 'Minha pizzaria se chama Persistência QA.');
            assert.equal(await page.locator('.ai-selected').count(), 1);
        }
        else {
            await page.getByRole('button', { name: 'Continuar com este cardápio', exact: true }).click();
            await page.getByRole('alert').waitFor();
            assert.equal(new URL(page.url()).pathname, '/criar');
            assert.match(await page.getByRole('alert').textContent(), /guardar sua ideia/);
        } return { scenario: type }; });
        await context.close();
    }
    await browser.close();
    if (results.some(x => !x.ok) || errors.length)
        process.exitCode = 1;
    console.log('RESULT ' + JSON.stringify({ passed: results.filter(x => x.ok).length, failed: results.filter(x => !x.ok).length, errors }));
})().catch(async (e) => { console.error(e.stack); if (context)
    await context.close().catch(() => { }); process.exitCode = 1; });
