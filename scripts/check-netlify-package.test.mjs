import test from 'node:test';
import assert from 'node:assert/strict';
import {copyFile, mkdir, mkdtemp, readFile, rm} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

test('Netlify production package loads both handlers with no access to the original source tree', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'pizzaria-netlify-package-'));
  const secret = 'ef'.repeat(32);
  try {
    for (const filename of ['scripts/prepare-netlify.mjs', 'netlify.toml',
      'lib/hosting-proxy-policy.ts', 'lib/netlify-proxy.ts', 'deploy/netlify/package.json',
      'deploy/netlify/netlify/edge-functions/gateway.ts', 'deploy/netlify/netlify/functions/creation.ts']) {
      const target = join(fixture, filename);
      await mkdir(dirname(target), {recursive: true});
      await copyFile(new URL('../' + filename, import.meta.url), target);
    }
    const prepared = spawnSync(process.execPath, ['scripts/prepare-netlify.mjs'], {
      cwd: fixture, encoding: 'utf8', env: {...process.env, NETLIFY: 'true', CONTEXT: 'production',
        PEDIDO_PUBLIC_ORIGIN: 'https://pizzaria-test.netlify.app',
        PEDIDO_BACKEND_ORIGIN: 'https://backend.example', PEDIDO_PROXY_SECRET: secret},
    });
    assert.equal(prepared.status, 0, prepared.stderr + prepared.stdout);
    const base = join(fixture, 'deploy/netlify');
    assert.ok(!(await readFile(join(base, 'public/index.html'), 'utf8')).includes(secret));
    await rm(join(fixture, 'lib'), {recursive: true});
    await rm(join(fixture, 'scripts'), {recursive: true});
    await rm(join(base, 'netlify'), {recursive: true});
    const program = [
      "import assert from 'node:assert/strict';",
      "globalThis.Netlify = {env: {get: () => undefined}};",
      "const edge = await import('./generated/edge-functions/gateway.ts');",
      "const node = await import('./generated/functions/creation.ts');",
      "const request = new Request('https://pizzaria-test.netlify.app/');",
      "for (const handler of [edge.default, node.default]) {",
      "  const response = await handler(request, {ip: '203.0.113.10'});",
      "  assert.equal(response.status, 503);",
      "}",
    ].join('\n');
    const loaded = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', program],
      {cwd: base, encoding: 'utf8', env: {...process.env,
        PEDIDO_PUBLIC_ORIGIN: '', PEDIDO_BACKEND_ORIGIN: '', PEDIDO_PROXY_SECRET: ''}});
    assert.equal(loaded.status, 0, loaded.stderr + loaded.stdout);
  } finally {
    await rm(fixture, {recursive: true, force: true});
  }
});
