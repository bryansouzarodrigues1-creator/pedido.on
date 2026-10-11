import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {httpsOrigin, validProxySecret} from '../lib/hosting-proxy-policy.ts';

const root = new URL('../', import.meta.url);
// Production builds fail before publication when runtime setup is incomplete.
// No environment values are ever emitted into the public files.
if (process.env.NETLIFY === 'true' && process.env.CONTEXT === 'production') {
  const missing = ['PEDIDO_PUBLIC_ORIGIN', 'PEDIDO_BACKEND_ORIGIN'].filter(name => !httpsOrigin(process.env[name]));
  if (!validProxySecret(process.env.PEDIDO_PROXY_SECRET)) missing.push('PEDIDO_PROXY_SECRET');
  if (missing.length) throw new Error('Configure na Netlify (Builds, Functions e Runtime): ' + missing.join(', ') + '. Veja docs/NETLIFY.md.');
  if (httpsOrigin(process.env.PEDIDO_PUBLIC_ORIGIN) === httpsOrigin(process.env.PEDIDO_BACKEND_ORIGIN)) {
    throw new Error('O endereço público e o servidor precisam ser diferentes. Veja docs/NETLIFY.md.');
  }
}
for (const name of ['netlify.toml', 'deploy/netlify/netlify/edge-functions/gateway.ts',
  'deploy/netlify/netlify/functions/creation.ts', 'lib/hosting-proxy-policy.ts', 'lib/netlify-proxy.ts']) {
  await readFile(new URL(name, root), 'utf8');
}
const output = new URL('deploy/netlify/public/', root);
await mkdir(output, {recursive: true});
const maintenance = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>pedido.on</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#171713;color:#fff;font:18px system-ui}main{max-width:420px;padding:32px}b{color:#ee4a32}h1{font-size:32px}p{color:#bfc0b8;line-height:1.6}</style><main><b>pedido.on</b><h1>Estamos preparando este endereço.</h1><p>Volte em breve para acessar sua pizzaria.</p></main></html>';
await writeFile(new URL('index.html', output), maintenance);
await writeFile(new URL('404.html', output), maintenance);
console.log('Entrada Netlify preparada em ' + fileURLToPath(output));
console.log('Páginas, pedidos e imagens serão servidos pelo gateway; ativação e conferência: docs/NETLIFY.md.');
