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

const environment = {...process.env, CLOUDFLARE_CF_FETCH_ENABLED: 'false', WRANGLER_SEND_METRICS: 'false', WRANGLER_WRITE_LOGS: 'false'};
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
    for (const [name, script] of [['guest', 'scripts/check-guest-browser.mjs'], ['calculator', 'scripts/check-calculator-browser.mjs'], ['handoff', 'scripts/check-handoff-browser.mjs'], ['ocr', 'scripts/check-ocr-browser.mjs']]) {
        const result = await run([script], name + '.log', {QA_BASE_URL: base, QA_BROWSER_OUTPUT: path.join(output, name), QA_HEADLESS: 'true'});
        results.push({name, ...result});
    }
    if (results.some(result => result.code !== 0)) process.exitCode = 1;
} finally {
    if (server.pid) {try {process.kill(-server.pid, 'SIGTERM');} catch {}}
    serverLog.end();
    await writeFile(path.join(output, 'summary.json'), JSON.stringify({base, commit: process.env.GITHUB_SHA, runner: process.platform, browser: 'Chrome / Pixel 7 emulado; não é Android físico', identity: 'mock local oficial Sites; nenhum provedor financeiro ou IA', results}, null, 2));
}
