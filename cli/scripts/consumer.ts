/**
 * The consumer path, from the working tree, in one command.
 *
 *   node cli/scripts/consumer.ts [--adopt] [--create] [--update [--origins N]] [--update-all] [--verify]
 *                                [--created-release | --created-t2 | --created-report] [--keep]
 *
 * It builds the payload from the working tree, compiles the CLI, packs it into out/smoke-pack/, and runs
 * cli/scripts/smoke.ts against that tarball with the flags given. `pnpm test:t2` packs through this same file, so the
 * tarball a developer tries and the one the gate tries are made by one path. Exit code: 1 when a pack step fails
 * (before any smoke runs), else the smoke's own.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { bin } from '../../scripts/lib/bin.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PACK = path.join(ROOT, 'out', 'smoke-pack');

/** Runs one pack step with its output shown; a failure names the step and ends the run. */
function step(label: string, cmd: string, args: string[], cwd = ROOT): void {
  const t = Date.now();
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'inherit', 'inherit'] });
  const status = r.status ?? 1;
  console.log(`${status === 0 ? 'ok  ' : 'FAIL'} ${label} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
  if (status !== 0) {
    console.error(`consumer: ${label} failed, so no smoke ran`);
    process.exit(1);
  }
}

fs.rmSync(PACK, { recursive: true, force: true });
fs.mkdirSync(PACK, { recursive: true });
step('smoke: the template snapshot', process.execPath, ['cli/scripts/build-payload.ts', '--worktree']);
step('smoke: the CLI compiles', bin('tsc'), ['-p', 'cli/tsconfig.json']);
const packed = spawnSync('npm', ['pack', '--ignore-scripts', '--pack-destination', PACK], { cwd: path.join(ROOT, 'cli'), encoding: 'utf8' });
const tarball = (packed.stdout ?? '').trim().split('\n').filter(Boolean).at(-1);
if (packed.status !== 0 || !tarball) {
  process.stderr.write(packed.stderr ?? '');
  console.error('consumer: the CLI pack failed, so no smoke ran');
  process.exit(1);
}
console.log(`ok   smoke: the CLI packs (${tarball})`);

const smoke = spawnSync(process.execPath, ['cli/scripts/smoke.ts', '--tarball', path.join(PACK, tarball), ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, CI: 'true' },
});
process.exit(smoke.status ?? 1);
