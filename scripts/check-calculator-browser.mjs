import { createRequire } from 'node:module';
import {browserQaTarget, guardPublicGuestContext} from './browser-qa-target.mjs';
const require = createRequire(import.meta.url);
const {base, publicReadOnly} = browserQaTarget();
if (!process.env.QA_CHROME_PATH)
    throw Error('Informe QA_CHROME_PATH para um Chrome já instalado.');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium, devices } = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright-core');
(async () => { const b = await chromium.launch({ executablePath: process.env.QA_CHROME_PATH, headless: process.env.QA_HEADLESS === 'true' }), checks = [], errors = [], dir = path.resolve(process.env.QA_BROWSER_OUTPUT || ('.sites-runtime/calculator-qa/' + Date.now())); await fs.mkdir(dir, { recursive: true }); try {
    for (const blocked of [false, true]) {
        const c = await b.newContext({ ...devices['Pixel 7'], locale: 'pt-BR', acceptDownloads: true, serviceWorkers: publicReadOnly ? 'block' : 'allow' });
        await guardPublicGuestContext(c, errors);
        if (blocked)
            await c.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('QA denied', 'SecurityError'); } }));
        const p = await c.newPage();
        p.on('pageerror', e => errors.push(e.message));
        await p.goto(base + '/calculadora', { waitUntil: 'networkidle' });
        if (await p.locator('.flavor-pricing').count()) {
            const flavors=p.getByRole('region',{name:'Calculadora de preços por sabor'});
            await flavors.getByRole('button',{name:/^(Usar exemplos da imagem|Ver exemplo preenchido)$/}).click();
            assert.equal(await flavors.locator('.flavor-price-card').count(),5);
            assert.match(await flavors.getByLabel('Preço sugerido do sabor 1',{exact:true}).textContent(),/65,03/);
            await flavors.getByRole('textbox',{name:'Custo total do sabor 1',exact:true}).fill('20,00');
            await flavors.getByRole('textbox',{name:'Lucro sobre o custo do sabor 1',exact:true}).fill('125');
            assert.match(await flavors.getByLabel('Preço sugerido do sabor 1',{exact:true}).textContent(),/48,00/);
            await flavors.getByRole('button',{name:'Duplicar sabor 1',exact:true}).click();assert.equal(await flavors.locator('.flavor-price-card').count(),6);
            await flavors.getByRole('button',{name:'Remover sabor 6',exact:true}).click();
            await flavors.getByRole('button',{name:'Salvar tabela',exact:true}).click();
            assert.match(await flavors.locator('.flavor-status').textContent(),blocked?/não permitiu guardar/:/Tabela salva neste navegador/);
            if(!blocked){await p.reload({waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('input[aria-label="Custo total do sabor 1"]')?.value==='20,00');assert.equal(await flavors.locator('.flavor-price-card').count(),5);assert.match(await flavors.getByLabel('Preço sugerido do sabor 1',{exact:true}).textContent(),/48,00/);}
            const [csv]=await Promise.all([p.waitForEvent('download'),flavors.getByRole('button',{name:'Baixar tabela CSV',exact:true}).click()]);const csvFile=path.join(dir,blocked?'sabores-sem-storage.csv':'sabores-qa.csv');await csv.saveAs(csvFile);assert.equal(await csv.failure(),null);const text=await fs.readFile(csvFile,'utf8');assert.match(text,/Calabresa com cebola/);assert.ok(text.includes('"20,00";"15";"125";"48,00"'));
            for(const width of [320,412,1280]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
            await p.setViewportSize({width:412,height:900});if(!blocked)await p.screenshot({path:path.join(dir,'sabores-mobile.png'),fullPage:true});
            checks.push({name:'tabela por sabor, percentuais, duplicação, CSV e '+(blocked?'cópia sem armazenamento':'salvamento imediato e recarga'),ok:true});
            await p.locator('.profit-monthly > summary').click();
        }
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
            if(await p.locator('.profit-monthly').count())await p.locator('.profit-monthly > summary').click();
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
    await fs.writeFile(path.join(dir, 'calculator-browser.json'), JSON.stringify({ base, host: process.platform, device: 'Chrome / Pixel 7 emulado', checks, errors, scope: 'somente navegação e dados neste navegador' }, null, 2));
    assert.deepEqual(errors, []);
    console.log('PASS ' + JSON.stringify(checks));
}
finally {
    await b.close();
} })().catch(e => { console.error(e.stack); process.exitCode = 1; });
