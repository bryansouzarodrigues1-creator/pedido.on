// Public UI QA. The shared context guard denies application mutation methods;
// the site's normal same-origin Cloudflare security verification remains active.
import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const base = 'https://forno-cardapios.waves4845.chatgpt.site';
const output = path.resolve('.sites-runtime/browser-ci/public');
await mkdir(output, {recursive: true});
const checks = [];
const html=await (await fetch(base+'/criar')).text();
const documentsPublished=html.includes('Enviar PDF, foto ou TXT');
const suites=[['guest', 'scripts/check-guided-public-browser.mjs'], ['calculator', 'scripts/check-calculator-browser.mjs'], ['ocr', 'scripts/check-ocr-browser.mjs'], ['styles', 'scripts/check-style-gallery-browser.mjs'],...(documentsPublished?[['documents','scripts/check-menu-documents-browser.mjs']]:[])];
if(!documentsPublished)checks.push({name:'documents',skipped:true,reason:'A publicação ainda não contém o novo leitor PDF.'});
for (const [name, script] of suites) {
    const child = spawn(process.execPath, [script], {stdio: 'inherit', env: {...process.env, QA_BASE_URL: base, QA_PUBLIC_GUEST_QA: 'true', QA_BROWSER_OUTPUT: path.join(output, name), QA_HEADLESS: 'true'}});
    const result = await new Promise((resolve, reject) => {child.once('error', reject); child.once('close', (code, signal) => resolve({code, signal}));});
    checks.push({name, ...result});
}
await writeFile(path.join(output, 'summary.json'), JSON.stringify({base, commit: process.env.GITHUB_SHA, scope: 'UI pública; nenhum cadastro, pedido, upload remoto ou geração; armazenamento apenas no navegador', checks}, null, 2));
if (checks.some(check => !check.skipped&&check.code !== 0)) process.exitCode = 1;
