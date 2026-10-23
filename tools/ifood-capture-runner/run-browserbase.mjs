import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {captureLink} from './policy.mjs';
import {captureStore} from './capture.mjs';
import {writeCaptureResult} from './review.mjs';
import {withBrowserbase} from './browserbase.mjs';

const {values} = parseArgs({options: {url: {type: 'string'}, out: {type: 'string'},
  authorized: {type: 'boolean'}, 'free-budget-confirmed': {type: 'boolean'}, help: {type: 'boolean'}}, strict: true});
if (values.help) {
  console.log('node tools/ifood-capture-runner/run-browserbase.mjs --url LINK --out PASTA-NOVA --authorized --free-budget-confirmed');
  console.log('BROWSERBASE_API_KEY deve estar no segredo do ambiente. BROWSERBASE_PROJECT_ID é opcional. Uma sessão, até 90 s, captura até 45 s.');
  process.exit(0);
}
try {
  const store = captureLink(values.url);
  if (!values.authorized) throw new Error('Confirme a autorização da loja com --authorized.');
  if (!values['free-budget-confirmed']) throw new Error('Confira a franquia gratuita e use --free-budget-confirmed.');
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) throw new Error('Configure BROWSERBASE_API_KEY no segredo do ambiente de execução.');
  const require = createRequire(import.meta.url);
  const {chromium} = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright-core');
  const out = path.resolve(values.out || `.sites-runtime/ifood-capture-browserbase/${Date.now()}`);
  await mkdir(path.dirname(out), {recursive: true});
  await mkdir(out); // Never show products from an older attempt.
  const {result, session} = await withBrowserbase({apiKey, projectId: process.env.BROWSERBASE_PROJECT_ID,
    chromium, freeBudgetConfirmed: true,
    run: async browser => {
      const result = await captureStore({browser, storeUrl: store.url, networkTransport: 'browser'});
      await writeCaptureResult(out, result);
      return result;
    }});
  await writeFile(path.join(out, 'browserbase-session.json'), JSON.stringify(session, null, 2) + '\n');
  console.log(JSON.stringify(result.report, null, 2));
  console.log(`Arquivos: ${out}`);
} catch (error) {
  // Playwright connection errors can include its credential-bearing WSS URL.
  // Only our fixed safe diagnostics are emitted, never the original SDK error.
  const safe = error instanceof Error && /^(Confirme a autorização|Confira a franquia|Configure BROWSERBASE_|Confira o identificador|Browserbase recusou|O Browserbase|Não foi possível (contactar|conectar|confirmar))/.test(error.message);
  console.error(safe ? error.message : 'A captura Browserbase não terminou. Confira a pasta nova, o link e a conexão; nenhum segredo foi impresso.');
  process.exitCode = 1;
}
