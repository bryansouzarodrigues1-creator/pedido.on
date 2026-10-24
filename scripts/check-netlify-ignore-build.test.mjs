import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';

test('Netlify detects shared gateway changes outside its base, skips only unrelated changes and builds on unknown cache state', () => {
  const root = mkdtempSync(join(tmpdir(), 'pedido-netlify-ignore-'));
  const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  const write = (path, text) => {const file = join(root, path); mkdirSync(dirname(file), {recursive: true}); writeFileSync(file, text);};
  const commit = () => {git('add', '.'); git('-c', 'user.name=QA', '-c', 'user.email=qa@example.test', 'commit', '-qm', 'fixture'); return git('rev-parse', 'HEAD');};
  const run = (before, after) => spawnSync(process.execPath, [join(root, 'scripts/ignore-netlify-build.mjs')], {
    cwd: join(root, 'deploy/netlify'), env: {...process.env, CACHED_COMMIT_REF: before, COMMIT_REF: after}, stdio: 'ignore',
  }).status;
  try {
    git('init', '-q');
    write('deploy/netlify/package.json', '{}');
    mkdirSync(join(root, 'scripts'), {recursive: true});
    copyFileSync(new URL('./ignore-netlify-build.mjs', import.meta.url), join(root, 'scripts/ignore-netlify-build.mjs'));
    let before = commit();
    write('README.md', 'documentation only');
    let after = commit();
    assert.equal(run(before, after), 0, 'documentation should not rebuild the gateway');
    for (const path of ['lib/hosting-proxy-policy.ts', 'lib/netlify-proxy.ts', 'scripts/prepare-netlify.mjs',
      'deploy/netlify/netlify/edge-functions/gateway.ts', 'deploy/netlify/netlify/functions/creation.ts', 'netlify.toml']) {
      before = after; write(path, '// changed'); after = commit();
      assert.equal(run(before, after), 1, path + ' must trigger deployment');
    }
    assert.equal(run('', after), 1, 'first build');
    assert.equal(run(after, after), 1, 'empty cache or explicit clean rebuild');
    assert.equal(run('missing-ref', after), 1, 'missing history');
  } finally {rmSync(root, {recursive: true, force: true});}
});
