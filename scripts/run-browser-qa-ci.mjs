// GitHub-hosted QA only. Never starts a preview in the managed Sites container.
import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.CI !== 'true' || process.env.SITES_MANAGED_LINUX_CONTAINER === '1')
    throw Error('Este orquestrador é exclusivo do runner isolado do GitHub Actions.');
if (!process.env.QA_CHROME_PATH || !process.env.QA_PLAYWRIGHT_MODULE)
    throw Error('Configure o Chrome instalado e o módulo de ferramentas de QA.');

const root = fileURLToPath(new URL('..', import.meta.url));
const output = path.join(root, '.sites-runtime/browser-ci');
const base = 'http://127.0.0.1:5173';
await mkdir(output, {recursive: true});
// Fictitious local bindings only; no application or provider secrets are injected.
await writeFile(path.join(root, '.dev.vars'), [
    'AUTH_SESSION_KEY=' + randomBytes(32).toString('hex'),
    'PEDIDO_AUTH_MODE=open',
    'PLATFORM_ADMIN_ACCOUNT_ID=local_seedy',
    'PEDIDO_SUPPORT_WHATSAPP=5522999998888', // Synthetic support contact, local QA only.
    'PEDIDO_BILLING_ENABLED=false',
    'PEDIDO_BILLING_ENFORCED=false',
    'PEDIDO_TRIAL_ENFORCED=false',
    'PEDIDO_IMAGE_ENABLED=false',
    'PEDIDO_STUDIO_ENABLED=false',
    'PEDIDO_AI_ENABLED=false',
    'PEDIDO_EMAIL_DELIVERY_READY=false',
].join('\n') + '\n');
const config = path.join(output, 'wrangler.json');
await writeFile(config, JSON.stringify({
    name: 'pizzaria-browser-qa-local', compatibility_date: '2026-05-15',
    d1_databases: [{binding: 'DB', database_name: 'site-creator-d1', database_id: '00000000-0000-4000-8000-000000000000', migrations_dir: path.join(root, 'drizzle')}],
}));

const environment = {...process.env, PEDIDO_BROWSER_ASSISTANCE_QA: 'true', CLOUDFLARE_CF_FETCH_ENABLED: 'false', WRANGLER_SEND_METRICS: 'false', WRANGLER_WRITE_LOGS: 'false'};
async function run(args, logName, extraEnv = {}) {
    const log = createWriteStream(path.join(output, logName));
    const child = spawn(process.execPath, args, {cwd: root, env: {...environment, ...extraEnv}, stdio: ['pipe', 'pipe', 'pipe']});
    child.stdout.pipe(log); child.stderr.pipe(log);
    child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr);
    child.stdin.end('y\n');
    return await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', (code, signal) => {log.end(); resolve({code, signal});});
    });
}
const migration = await run(['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--local', '--config', config, '--persist-to', path.join(root, '.wrangler/state')], 'migrations.log');
if (migration.code !== 0) throw Error('Não foi possível preparar o D1 local.');
const pwaAssets=await run(['scripts/prepare-pwa.mjs'],'pwa-assets.log');
if(pwaAssets.code!==0)throw Error('Não foi possível preparar os arquivos públicos da PWA.');

const serverLog = createWriteStream(path.join(output, 'dev-server.log'));
const server = spawn(process.execPath, ['scripts/run-framework.mjs', 'dev', '--host', '127.0.0.1'], {cwd: root, env: environment, detached: true, stdio: ['ignore', 'pipe', 'pipe']});
server.stdout.pipe(serverLog); server.stderr.pipe(serverLog);
let serverError;
server.once('error', error => {serverError = error;});
const results = [];
try {
    const deadline = Date.now() + 120_000;
    while (true) {
        if (serverError) throw serverError;
        if (server.exitCode !== null) throw Error('O servidor de QA terminou antes dos testes.');
        try {
            const response = await fetch(base + '/criar', {signal: AbortSignal.timeout(8000)});
            await response.body?.cancel();
            if (response.ok) break;
        } catch {}
        if (Date.now() >= deadline) throw Error('O servidor de QA não ficou pronto em dois minutos.');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    const requestedSuite=process.env.QA_BROWSER_SUITE||'all';if(!['all','core','welcome-kit'].includes(requestedSuite))throw Error('Unknown isolated browser suite.');
    for (const [name, script] of [['auth-journey', 'scripts/check-auth-journey-browser.mjs'], ['creator', 'scripts/check-creator-flow-browser.mjs'], ['creator-recovery', 'scripts/check-creator-recovery-browser.mjs'], ['calculator', 'scripts/check-calculator-browser.mjs'], ['registration-card', 'scripts/check-registration-access-card-browser.mjs'], ['auth-mobile', 'scripts/check-auth-ui-browser.mjs'], ['owner', 'scripts/check-owner-workspace-browser.mjs'], ['pwa-recovery', 'scripts/check-pwa-recovery-browser.mjs'], ['ocr', 'scripts/check-ocr-browser.mjs'], ['styles', 'scripts/check-style-gallery-browser.mjs'], ['documents', 'scripts/check-menu-documents-browser.mjs'], ['store-safety', 'scripts/check-store-safety-browser.mjs'], ['customer-journey', 'scripts/check-customer-journey-browser.mjs'], ['assistance', 'scripts/check-menu-assistance-browser.mjs'], ['daily-campaigns', 'scripts/check-daily-campaigns-browser.mjs'], ['professional', 'scripts/check-professional-workspace-browser.mjs'], ['owner-hours', 'scripts/check-owner-hours-browser.mjs'], ['business-info', 'scripts/check-business-info-browser.mjs'], ['account-navigation', 'scripts/check-account-navigation-browser.mjs'], ['welcome-kit', 'scripts/check-welcome-kit-browser.mjs']]) {
        if(requestedSuite==='core'&&name==='welcome-kit'||requestedSuite==='welcome-kit'&&name!=='welcome-kit')continue;
        const result = await run([script], name + '.log', {QA_BASE_URL: base, QA_BROWSER_OUTPUT: path.join(output, name), QA_HEADLESS: 'true', QA_RECORD_INTAKE: 'true'});
        results.push({name, ...result});
    }
    if (results.some(result => result.code !== 0)) process.exitCode = 1;
} finally {
    if (server.pid) {try {process.kill(-server.pid, 'SIGTERM');} catch {}}
    serverLog.end();
    await writeFile(path.join(output, 'summary.json'), JSON.stringify({base, commit: process.env.GITHUB_SHA, runner: process.platform, browser: 'Chrome / Pixel 7 emulado; não é Android físico', identity: 'mock local oficial Sites; nenhum provedor financeiro ou IA', results}, null, 2));
}
