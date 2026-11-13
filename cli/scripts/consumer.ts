/**
 * The consumer path, from the working tree, in one command.
 *
 *   node cli/scripts/consumer.ts [--adopt] [--create] [--update [--origins N]] [--update-all] [--verify]
 *                                [--created-release | --created-t2 | --created-report | --created-rest] [--keep]
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

/** The next patch of an x.y.z version: the one a release would publish, so not on the registry yet. */
export function nextPatch(version: string): string {
  const [a, b, c] = version.split('.').map(Number);
  return `${a}.${b}.${c + 1}`;
}

/**
 * Packs the compiled CLI labelled as the next patch, as weekly.yml does: master usually carries a version already on
 * npm, and `update` refuses a running package whose bytes differ from the published one. `cli/package.json` is written
 * just before the pack and its original bytes are restored after, also on failure or an interrupt.
 */
function packCli(): { tarball: string | null; error: string } {
  const file = path.join(ROOT, 'cli', 'package.json');
  const original = fs.readFileSync(file);
  const restore = () => fs.writeFileSync(file, original);
  const onSignal = (signal: NodeJS.Signals) => { restore(); process.kill(process.pid, signal); };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  try {
    const manifest = JSON.parse(original.toString('utf8'));
    manifest.version = nextPatch(manifest.version);
    fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`packed as ${manifest.version}`);
    const packed = spawnSync('npm', ['pack', '--ignore-scripts', '--pack-destination', PACK], { cwd: path.join(ROOT, 'cli'), encoding: 'utf8' });
    const tarball = (packed.stdout ?? '').trim().split('\n').filter(Boolean).at(-1) ?? null;
    return { tarball: packed.status === 0 ? tarball : null, error: packed.stderr ?? '' };
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    restore();
  }
}

if (import.meta.main) {
  fs.rmSync(PACK, { recursive: true, force: true });
  fs.mkdirSync(PACK, { recursive: true });
  step('smoke: the template snapshot', process.execPath, ['cli/scripts/build-payload.ts', '--worktree']);
  step('smoke: the CLI compiles', bin('tsc'), ['-p', 'cli/tsconfig.json']);
  const { tarball, error } = packCli();
  if (!tarball) {
    process.stderr.write(error);
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
}
