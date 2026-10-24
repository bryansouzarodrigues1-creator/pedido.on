import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Netlify otherwise checks only deploy/netlify, excluding the canonical imports.
// Exit 0 skips a build; exit 1 builds. Unknown or fresh cache state must build.
const before = process.env.CACHED_COMMIT_REF, after = process.env.COMMIT_REF;
if (!before || !after || before === after) process.exit(1);
const root = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync('git', ['diff', '--quiet', before, after, '--',
  'deploy/netlify', 'lib/netlify-proxy.ts', 'lib/hosting-proxy-policy.ts',
  'scripts/prepare-netlify.mjs', 'scripts/ignore-netlify-build.mjs', 'netlify.toml',
], {cwd: root, stdio: 'ignore'});
process.exit(result.status === 0 ? 0 : 1);
