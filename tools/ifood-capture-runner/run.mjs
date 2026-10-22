import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {captureLink} from './policy.mjs';
import {captureStore} from './capture.mjs';

const {values} = parseArgs({options: {url: {type: 'string'}, out: {type: 'string'}, help: {type: 'boolean'}}, strict: true});
if (values.help) {
  console.log('node tools/ifood-capture-runner/run.mjs --url https://www.ifood.com.br/delivery/cidade/loja/id --out pasta-nova');
  process.exit(0);
}
let browser;
try {
  const store = captureLink(values.url);
  const require = createRequire(import.meta.url);
  const {chromium} = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright-core');
  const out = path.resolve(values.out || `.sites-runtime/ifood-capture/${Date.now()}`);
  await mkdir(path.dirname(out), {recursive: true});
  await mkdir(out); // Never mix a failed attempt with products from an older run.
  browser = await chromium.launch({headless: true, ...(process.env.QA_CHROME_PATH ? {executablePath: process.env.QA_CHROME_PATH} : {})});
  const result = await captureStore({browser, storeUrl: store.url});
  await writeFile(path.join(out, 'report.json'), JSON.stringify(result.report, null, 2) + '\n');
  if (result.capture) {
    await writeFile(path.join(out, 'capture-review.json'), JSON.stringify(result.capture, null, 2) + '\n');
    await writeFile(path.join(out, 'cardapio-origem.json'), result.exports.backup + '\n');
    if (result.exports.text) await writeFile(path.join(out, 'cardapio.txt'), result.exports.text + '\n');
  }
  console.log(JSON.stringify(result.report, null, 2));
  console.log(`Arquivos: ${out}`);
  // Blocked/empty is an observed outcome, not a software exception or import success.
} catch {
  console.error('Não foi possível executar a captura. Confira o link, a pasta de saída nova e a instalação do Chromium/Playwright.');
  process.exitCode = 1;
} finally { await browser?.close().catch(() => {}); }
