import {access} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {captureLink} from './policy.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export async function findWindowsBrowser(env = process.env, exists = async file => {
  try { await access(file); return true; } catch { return false; }
}) {
  // Executables only; never inspect or reuse an installed browser's profile.
  for (const base of [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean)) {
    for (const relative of ['Google/Chrome/Application/chrome.exe', 'Microsoft/Edge/Application/msedge.exe', 'BraveSoftware/Brave-Browser/Application/brave.exe']) {
      const candidate = path.win32.join(base, relative);
      if (await exists(candidate)) return candidate;
    }
  }
  return null;
}

async function main() {
  const terminal = createInterface({input: process.stdin, output: process.stdout});
  try {
    console.log('Pizzaria.on — captura local para revisão. Nenhum cardápio será publicado.');
    const store = captureLink(await terminal.question('Cole o link completo da loja no iFood: '));
    console.log(`Loja: ${store.url}`);
    const authorized = await terminal.question('Você é responsável pela loja ou tem autorização para esta leitura? [s/N] ');
    if (!/^(s|sim)$/i.test(authorized.trim())) { console.log('Leitura cancelada.'); return; }
    const browser = await findWindowsBrowser();
    if (!browser) throw new Error('Chrome, Edge ou Brave não foi encontrado. Instale um desses navegadores e tente novamente.');
    console.log('Uma janela separada abrirá por até 45 segundos. Ao terminar, abra resultado.html na pasta indicada.');
    const child = spawn(process.execPath, [path.join(root, 'tools/ifood-capture-runner/run.mjs'), '--url', store.url, '--headed'], {
      cwd: root, stdio: 'inherit', shell: false, env: {...process.env, QA_CHROME_PATH: browser}
    });
    process.exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => resolve(code ?? 1)); });
  } finally { terminal.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
