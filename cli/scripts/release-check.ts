/**
 * The template's default verify, timed from a clean build, the way the release gates it (AC-4.8): every run starts
 * with no `.next`, and every run must pass within the limit.
 *
 *   node cli/scripts/release-check.ts [--runs 3] [--limit 120]
 *
 * It runs `node scripts/verify.ts` in the template (this repository) `--runs` times, writing each run's output to
 * out/release-check-<n>.txt, and prints the machine it ran on, then one line per run and the verdict:
 *
 *   machine: linux 6.11 · 4× AMD EPYC 7763 · 15.6 GiB · node v22.18.0 · Google Chrome 141.0.7390.54
 *   run 1: 97.4 s · coverage: default; browser ran; 3 routes; …
 *   release-check: 3 runs within 120 s (slowest 101.2 s)
 *
 * Exit 1 on the first run that fails, or after the last run when any was over the limit.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const opt = (k: string, fallback: number) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : fallback; };
const runs = opt('--runs', 3);
const limit = opt('--limit', 120);
if (!Number.isInteger(runs) || runs < 1 || !(limit > 0)) throw new Error('--runs takes a whole number of at least 1, --limit a number of seconds');

const chrome = process.env.CHROME ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome');
const browser = spawnSync(chrome, ['--version'], { encoding: 'utf8' }).stdout?.trim() || 'no Chrome';
const cpus = os.cpus();
console.log(`machine: ${os.platform()} ${os.release()} · ${cpus.length}× ${cpus[0]?.model.trim() ?? 'unknown CPU'} · ${(os.totalmem() / 2 ** 30).toFixed(1)} GiB · node ${process.version} · ${browser}`);

fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
const times: number[] = [];
for (let n = 1; n <= runs; n++) {
  fs.rmSync(path.join(ROOT, '.next'), { recursive: true, force: true });
  const t0 = performance.now();
  const r = spawnSync(process.execPath, ['scripts/verify.ts'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const s = (performance.now() - t0) / 1000;
  const log = `out/release-check-${n}.txt`;
  fs.writeFileSync(path.join(ROOT, log), r.stdout + r.stderr);
  const coverage = /^coverage: .*$/m.exec(r.stdout)?.[0] ?? 'no coverage line';
  console.log(`run ${n}: ${s.toFixed(1)} s${s > limit ? ` (over the ${limit} s limit)` : ''} · ${coverage}`);
  if (r.status !== 0) {
    console.log(`${r.stdout}${r.stderr}`.trim().split('\n').slice(-40).join('\n'));
    console.log(`release-check: run ${n} failed (exit ${r.status}); its output is in ${log}`);
    process.exit(1);
  }
  times.push(s);
}
const slowest = Math.max(...times);
const over = times.filter((s) => s > limit).length;
console.log(over ? `release-check: ${over} of ${runs} runs over ${limit} s (slowest ${slowest.toFixed(1)} s)` : `release-check: ${runs} runs within ${limit} s (slowest ${slowest.toFixed(1)} s)`);
process.exit(over ? 1 : 0);
