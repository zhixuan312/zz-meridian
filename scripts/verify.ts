/**
 * Verify a Meridian project against the standard, in one command: the gate, a production build, the built app
 * started on a free port, the browser audit of every page and embed view against it, and a report.
 *
 *   pnpm verify [--quick] [--extra /requests/req_1,/customers/acme]
 *
 * Exit 0 only when everything passes. The report is written to out/verify.txt.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const pass = process.argv.slice(2);
const lines: string[] = [];
const log = (s: string) => { console.log(s); lines.push(s); };
const finish = (code: number) => {
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'out/verify.txt'), lines.join('\n') + '\n');
  process.exit(code);
};

function step(name: string, cmd: string, args: string[]) {
  const t = Date.now();
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const ok = r.status === 0;
  log(`${ok ? 'ok  ' : 'FAIL'} ${name} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
  if (!ok) { log((r.stdout + r.stderr).trim().split('\n').slice(-60).join('\n')); finish(1); }
  return r.stdout;
}

const freePort = () => new Promise<number>((res) => { const s = net.createServer(); s.listen(0, () => { const p = (s.address() as net.AddressInfo).port; s.close(() => res(p)); }); });

step('gate: tokens, registry, specifications, contrast, types, tests', 'node', ['scripts/gate.ts']);
step('production build', 'pnpm', ['exec', 'next', 'build']);

const port = await freePort();
const server = spawn('pnpm', ['exec', 'next', 'start', '-p', String(port)], { cwd: ROOT, stdio: 'ignore', detached: true });
const stop = () => { try { process.kill(-server.pid!, 'SIGTERM'); } catch { /* already gone */ } };
process.on('exit', stop);
let up = false;
for (let i = 0; i < 120 && !up; i++) {
  try { up = (await fetch(`http://127.0.0.1:${port}/`)).status < 500; } catch { await new Promise((r) => setTimeout(r, 500)); }
}
if (!up) { log('FAIL the built app did not start'); stop(); finish(1); }
log(`ok   the built app is serving on port ${port}`);

const audit = spawnSync('node', ['scripts/audit.ts', '--base', `http://127.0.0.1:${port}`, ...pass], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, DPR: process.env.DPR ?? '1' } });
stop();
const out = (audit.stdout + audit.stderr).trim();
log(audit.status === 0 ? 'ok   browser audit' : 'FAIL browser audit');
log(out.split('\n').slice(-80).join('\n'));
log(audit.status === 0 ? '\nverify: the project meets the Meridian standard' : '\nverify: fix the issues above and run pnpm verify again');
finish(audit.status === 0 ? 0 : 1);
