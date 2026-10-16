import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const base = (process.env.QA_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname))
    throw Error('Use somente um preview em loopback para este teste.');
if (!process.env.QA_CHROME_PATH)
    throw Error('Informe QA_CHROME_PATH para um Chrome já instalado.');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium, devices } = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright-core');
(async () => { const b = await chromium.launch({ executablePath: process.env.QA_CHROME_PATH, headless: process.env.QA_HEADLESS === 'true' }), checks = [], dir = path.resolve(process.env.QA_BROWSER_OUTPUT || ('.sites-runtime/calculator-qa/' + Date.now())); await fs.mkdir(dir, { recursive: true }); try {
    for (const blocked of [false, true]) {
        const c = await b.newContext({ ...devices['Pixel 7'], locale: 'pt-BR', acceptDownloads: true });
        if (blocked)
            await c.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('QA denied', 'SecurityError'); } }));
        const p = await c.newPage();
        await p.goto(base + '/calculadora', { waitUntil: 'networkidle' });
        await p.waitForFunction(() => document.querySelector('.profit-saved')?.textContent.includes('Salvo') || document.querySelector('.profit-status')?.textContent.includes('navegador não permitiu salvar'));
        for (const [label, value] of [['Preço da pizza', '50,00'], ['Custo de fazer a pizza', '20,00'], ['Embalagem e outros custos', '2,00'], ['Despesas do mês', '1000,00'], ['Pizzas ou pedidos por dia', '10'], ['Dias abertos no mês', '25']])
            await p.getByRole('textbox', { name: label, exact: true }).fill(value);
        await p.getByRole('textbox', { name: /Nome da pizza ou do cálculo/ }).fill('Cálculo QA');
        await p.getByRole('button', { name: 'Salvar cálculo', exact: true }).click();
        if (blocked) {
            const msg = await p.locator('.profit-status').textContent();
            assert.match(msg, /não permitiu guardar/);
            checks.push({ name: 'armazenamento bloqueado não informa sucesso falso', ok: true, message: msg });
        }
        else {
            assert.ok(await p.evaluate(() => JSON.parse(localStorage.getItem('pedido-on:calculator:scenarios:v1') || '[]').some(v => v.name === 'Cálculo QA')), 'O sucesso precisa corresponder a uma gravação já concluída.');
            await p.reload({ waitUntil: 'networkidle' });
            await p.waitForFunction(() => document.querySelector('input[aria-label="Preço da pizza"]')?.value === '50,00');
            assert.equal(await p.getByRole('textbox', { name: 'Preço da pizza', exact: true }).inputValue(), '50,00');
            assert.match(await p.locator('.profit-history').textContent(), /Cálculo QA/);
            assert.match(await p.locator('.profit-main-result').textContent(), /6\.000,00/);
            checks.push({ name: 'salvar e recarregar imediatamente preserva cálculo', ok: true, profit: 600000 });
        }
        const [download] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Baixar resultado', exact: true }).click()]);
        assert.equal(await download.failure(), null);
        await download.saveAs(path.join(dir, blocked ? 'calculo-sem-storage.txt' : 'calculo-qa.txt'));
        checks.push({ name: 'download de cópia ' + (blocked ? 'sem armazenamento' : 'com armazenamento'), ok: true });
        await c.close();
    }
    await fs.writeFile(path.join(dir, 'calculator-browser.json'), JSON.stringify({ base, host: process.platform, device: 'Chrome / Pixel 7 emulado', checks, scope: 'cópia local isolada; nenhum dado de produção' }, null, 2));
    console.log('PASS ' + JSON.stringify(checks));
}
finally {
    await b.close();
} })().catch(e => { console.error(e.stack); process.exitCode = 1; });
