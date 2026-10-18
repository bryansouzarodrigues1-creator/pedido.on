import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserQaTarget, guardPublicGuestContext} from './browser-qa-target.mjs';

const require = createRequire(import.meta.url);
const {chromium, devices} = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright-core');
const {base, publicReadOnly} = browserQaTarget();
const output = path.resolve(process.env.QA_BROWSER_OUTPUT || '.sites-runtime/browser-ci/ocr');
const checks = [], errors = [];
await mkdir(output, {recursive: true});
const browser = await chromium.launch({executablePath: process.env.QA_CHROME_PATH, headless: process.env.QA_HEADLESS === 'true'});
let context, page;
try {
    for (const layout of ['table', 'staggered-columns']) {
        context = await browser.newContext({...devices['Pixel 7'], locale: 'pt-BR', serviceWorkers: 'block'});
        await guardPublicGuestContext(context, errors);
        page = await context.newPage(); page.setDefaultTimeout(20_000);
        page.on('pageerror', error => errors.push(error.message));
        const session = await context.newCDPSession(page);
        await session.send('Emulation.setCPUThrottlingRate', {rate: 4});
        await page.goto(base + '/criar', {waitUntil: 'domcontentloaded', timeout: 90_000});
        const guided=await page.locator('#owner-intake-message').count()>0;
        if(guided){
            await page.waitForFunction(()=>document.querySelector('#owner-intake-message')?.disabled===false);
            for(const response of ['Pizzaria OCR no navegador','depois','depois','depois','depois']){
                await page.locator('#owner-intake-message').fill(response);
                await page.getByRole('button',{name:'Enviar',exact:true}).click();
            }
            await page.getByRole('button',{name:/Ver meus 12 modelos personalizados/}).waitFor();
        }else{
            await page.waitForFunction(() => document.querySelector('#pizzeria-idea')?.disabled === false);
            await page.locator('#pizzeria-idea').fill('Minha pizzaria se chama OCR no navegador. Preserve os preços do arquivo.');
        }
        await page.getByRole('button', {name: /Anexar (?:arquivos|cardápio)/}).click();
        const png = Buffer.from(await page.evaluate(layout => {
            const canvas = document.createElement('canvas'); canvas.width = 1700; canvas.height = 950;
            const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#171717';
            function text(value, x, y, heading = false) {ctx.font = (heading ? 'bold 38px ' : '34px ') + 'Arial'; ctx.fillText(value, x, y);}
            if (layout === 'table') {
                for (const [value, x, y, heading] of [['PIZZAS', 70, 90, true], ['P', 840, 160], ['M', 1090, 160], ['G', 1330, 160], ['Calabresa', 70, 240], ['29,90', 790, 240], ['39,90', 1040, 240], ['49,90', 1280, 240], ['Molho, queijo, calabresa e cebola', 70, 295], ['Frango', 70, 385], ['32,90', 790, 385], ['42,90', 1040, 385], ['52,90', 1280, 385], ['Molho, queijo, frango e catupiry', 70, 440], ['BEBIDAS', 70, 560, true], ['Refrigerante 2L', 70, 640], ['R$ 12,00', 1050, 640], ['BORDAS RECHEADAS', 70, 760, true], ['Catupiry', 70, 850], ['R$ 8,00', 1050, 850]]) text(value, x, y, heading);
            } else {
                for (const [value, x, y, heading] of [['PIZZAS', 60, 90, true], ['Calabresa G R$ 49,90', 60, 190], ['Molho, queijo e calabresa', 60, 255], ['Frango G R$ 52,90', 60, 370], ['Molho, queijo e frango', 60, 435], ['BEBIDAS', 1010, 140, true], ['Refrigerante 2L R$ 12,00', 1010, 220], ['Suco R$ 8,00', 1010, 370], ['BORDAS', 1010, 500, true], ['Catupiry R$ 8,00', 1010, 590]]) text(value, x, y, heading);
            }
            return canvas.toDataURL('image/png').split(',')[1];
        }, layout), 'base64');
        await page.locator('input[type=file]').first().setInputFiles({name: layout + '.png', mimeType: 'image/png', buffer: png});
        await page.locator('.idea-photos img').waitFor();
        await page.evaluate(() => {
            window.__ocrQa = {last: performance.now(), maxGapMs: 0};
            window.__ocrQa.timer = setInterval(() => {const now = performance.now(); window.__ocrQa.maxGapMs = Math.max(window.__ocrQa.maxGapMs, now - window.__ocrQa.last); window.__ocrQa.last = now;}, 25);
        });
        const started = performance.now();
        const current = await page.getByRole('button', {name: 'Criar 12 modelos', exact: true}).count() > 0;
        const legacy = publicReadOnly && await page.getByRole('button', {name: 'Criar opções', exact: true}).count() > 0;
        if(guided)await page.getByRole('button',{name:/Ver meus 12 modelos personalizados/}).click();
        else await page.getByRole('button', {name: legacy ? 'Criar opções' : current ? 'Criar 12 modelos' : 'Criar 8 modelos', exact: true}).click();
        await page.locator('.ai-style-card').first().waitFor({timeout: 120_000});
        if(guided)await page.getByRole('button',{name:/Ver meus 12 modelos personalizados/}).waitFor();
        else await page.waitForFunction(expected => Array.from(document.querySelectorAll('button')).some(button => button.textContent.includes(expected) && !button.disabled), legacy ? 'Atualizar prévias' : 'Atualizar modelos');
        const ms = Math.round(performance.now() - started);
        const result = await page.evaluate(() => new Promise((resolve, reject) => {
            const launch = JSON.parse(localStorage.getItem('pizzaria-menu-idea-v1'));
            const request = indexedDB.open('pedido-menu-readings'); request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result, tx = db.transaction('readings', 'readonly');
                const read = tx.objectStore('readings').get('pizzaria-menu-guest-v1-' + launch.id);
                read.onsuccess = () => {
                    clearInterval(window.__ocrQa.timer);
                    resolve({items: read.result.items, pages: read.result.pages.map(page => ({width: page.width, height: page.height, lines: page.lines})), maxGapMs: Math.round(window.__ocrQa.maxGapMs), jsHeapBytes: performance.memory?.usedJSHeapSize ?? null});
                };
                read.onerror = () => reject(read.error); tx.oncomplete = () => db.close();
            };
        }));
        const expected = layout === 'table'
            ? [['Calabresa', 'pizza', {p: 2990, m: 3990, g: 4990}], ['Frango', 'pizza', {p: 3290, m: 4290, g: 5290}], ['Refrigerante 2L', 'simple', 1200], ['Catupiry', 'crust', 800]]
            : [['Calabresa', 'pizza', {p: null, m: null, g: 4990}], ['Frango', 'pizza', {p: null, m: null, g: 5290}], ['Refrigerante 2L', 'simple', 1200], ['Suco', 'simple', 800], ['Catupiry', 'crust', 800]];
        // Persist the extraction even when an assertion fails, to diagnose real OCR behavior.
        await writeFile(path.join(output, layout + '.json'), JSON.stringify({ms, cpuSlowdown: 4, syntheticMenu: true, ...result}, null, 2));
        await writeFile(path.join(output, layout + '.png'), png);
        await page.screenshot({path: path.join(output, layout + '-preview.png'), fullPage: true});
        assert.equal(result.items.length, expected.length, layout + ': nenhum produto extra ou ausente');
        for (const [name, kind, price] of expected) {
            const item = result.items.find(item => item.name.toLowerCase() === name.toLowerCase());
            assert.ok(item, layout + ': nome ausente ' + name); assert.equal(item.kind, kind, layout + ': tipo de ' + name);
            assert.deepEqual(kind === 'pizza' ? item.sizes : item.price, price, layout + ': preço de ' + name);
        }
        assert.equal(await page.locator('.ai-style-card').count(), 4);
        checks.push({name: layout, ok: true, items: result.items.length, priceFields: layout === 'table' ? 8 : 5, ms, maxMainThreadGapMs: result.maxGapMs, jsHeapBytes: result.jsHeapBytes});
        await context.close(); context = null;
    }
    assert.deepEqual(errors, []);
} catch (error) {
    checks.push({name: 'OCR no navegador', ok: false, error: error.message});
    await page?.screenshot({path: path.join(output, 'ocr-failure.png'), fullPage: true}).catch(() => {});
    console.error(error.stack); process.exitCode = 1;
} finally {
    await context?.close().catch(() => {}); await browser.close();
    await writeFile(path.join(output, 'ocr-browser.json'), JSON.stringify({base, publicReadOnly, menus: 'sintéticos e reproduzíveis', device: 'Chrome / Pixel 7 emulado; CPU desacelerada 4x; não é Android físico', checks, errors}, null, 2));
    console.log('OCR_BROWSER ' + JSON.stringify(checks));
}
