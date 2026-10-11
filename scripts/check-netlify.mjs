import {access, readFile} from 'node:fs/promises';
import {httpsOrigin} from '../lib/hosting-proxy-policy.ts';

const root = new URL('../', import.meta.url);
const required = ['netlify.toml', 'deploy/netlify/package.json', 'deploy/netlify/pnpm-lock.yaml',
  'deploy/netlify/netlify/edge-functions/gateway.ts', 'deploy/netlify/netlify/functions/creation.ts',
  'lib/hosting-proxy-policy.ts', 'lib/netlify-proxy.ts', 'app/api/hosting/route.ts', 'docs/NETLIFY.md'];
for (const filename of required) await access(new URL(filename, root));
const packageData = JSON.parse(await readFile(new URL('deploy/netlify/package.json', root), 'utf8'));
if (packageData.dependencies?.next || packageData.dependencies?.vinext) throw new Error('O gateway Netlify deve usar seu pacote separado.');
console.log('Configuração, funções e guia Netlify presentes.');
const [flag, value, ...extra] = process.argv.slice(2);
if (flag === undefined) {
  console.log('Para conferir depois da implantação: pnpm check:netlify --live https://seu-endereco.netlify.app');
} else {
  const origin = httpsOrigin(value);
  if (flag !== '--live' || !origin || extra.length) throw new Error('Use --live seguido do endereço HTTPS, sem caminho.');
  // Read-only: no account creation, email, order, claim or model call.
  async function get(path) {
    const response = await fetch(origin + path, {redirect: 'manual', signal: AbortSignal.timeout(15_000)});
    if (response.status !== 200) throw new Error(path + ': HTTP ' + response.status);
    return response;
  }
  const health = await (await get('/api/hosting')).json();
  if (health.service !== 'pedido.on' || health.origin !== origin || health.viaNetlify !== true || health.dataReady !== true) {
    throw new Error('A conexão assinada com o aplicativo e os dados ainda não está pronta.');
  }
  const calculator = await (await get('/calculadora')).text();
  if (!calculator.includes('Preço certo.')) throw new Error('A calculadora pública não retornou a página esperada.');
  await get('/');
  const ai = await (await get('/api/platform?check=ai')).json();
  if (!ai.studio?.enabled || !ai.studio?.connected || !ai.images?.enabled || !ai.images?.connected) {
    throw new Error('Confira a conexão de textos e imagens no servidor atual.');
  }
  console.log('Gateway assinado, dados, página inicial, calculadora anônima e saúde da IA: OK.');
  console.log('Ainda conferir no navegador: login, pedido, comprovante, criação/aplicação e publicação. Nenhuma IA foi gerada por esta verificação.');
}
