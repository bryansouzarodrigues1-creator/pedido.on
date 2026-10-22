import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {captureLink} from './policy.mjs';
import {captureStore} from './capture.mjs';
import {writeCaptureResult} from './review.mjs';

const {values} = parseArgs({options: {url: {type: 'string'}, out: {type: 'string'}, headed: {type: 'boolean'}, help: {type: 'boolean'}}, strict: true});
if (values.help) {
  console.log('node tools/ifood-capture-runner/run.mjs --url https://www.ifood.com.br/delivery/cidade/loja/id --out pasta-nova [--headed]');
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
  browser = await chromium.launch({headless: !values.headed, ...(process.env.QA_CHROME_PATH ? {executablePath: process.env.QA_CHROME_PATH} : {})});
  const result = await captureStore({browser, storeUrl: store.url});
  await writeCaptureResult(out, result);
  console.log(JSON.stringify(result.report, null, 2));
  console.log(`Arquivos: ${out}`);
  console.log(`Abra o resultado: ${path.join(out, 'resultado.html')}`);
  // Blocked/empty is an observed outcome, not a software exception or import success.
} catch {
  console.error('Não foi possível executar a captura. Confira o link, a pasta de saída nova e a instalação do Chromium/Playwright.');
  process.exitCode = 1;
} finally { await browser?.close().catch(() => {}); }
