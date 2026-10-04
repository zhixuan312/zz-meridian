/**
 * The consumer's path, end to end, from the packed tarball: what CI runs before publishing.
 *
 *   node cli/scripts/smoke.ts [--tarball cli/zz-meridian-0.2.0.tgz] [--create] [--verify]
 *
 * adopt: into a copy of cli/test/fixture-next-app (a create-next-app project with its own button, utils and data
 * layer), committed to git as a team's would be. The team's files must come out unchanged, the gate must pass under
 * the team's own eslint config, and next build must succeed.
 * --create: a new dashboard from the tarball, gated and built. --verify adds pnpm verify --quick --no-vitals on it
 * (Chrome required).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const tarball = path.resolve(opt('--tarball') ?? fs.readdirSync(path.join(ROOT, 'cli')).filter((f) => f.endsWith('.tgz')).map((f) => path.join(ROOT, 'cli', f)).at(-1) ?? '');
if (!fs.existsSync(tarball)) throw new Error('no tarball: run npm pack in cli/ first, or pass --tarball');

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-meridian-smoke-'));
let failures = 0;
const check = (ok: boolean, what: string, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) { failures++; if (detail) console.log(detail.trim().split('\n').slice(-40).join('\n')); } };
const sh = (cmd: string, a: string[], cwd: string, env: NodeJS.ProcessEnv = process.env) => spawnSync(cmd, a, { cwd, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
const hash = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const git = (cwd: string, ...a: string[]) => execFileSync('git', a, { cwd, stdio: 'ignore' });

// ── adopt ──────────────────────────────────────────────────────────────────────────────────────────────
const app = path.join(work, 'acme');
fs.cpSync(path.join(ROOT, 'cli/test/fixture-next-app'), app, { recursive: true });
git(app, 'init', '-q');
git(app, '-c', 'user.email=smoke@example.com', '-c', 'user.name=smoke', 'add', '-A');
git(app, '-c', 'user.email=smoke@example.com', '-c', 'user.name=smoke', 'commit', '-qm', 'the team project');
const TEAM = ['lib/orders.ts', 'lib/utils.ts', 'components/ui/button.tsx', 'app/orders/page.tsx', 'next.config.ts', 'eslint.config.mjs'];
const before = Object.fromEntries(TEAM.map((f) => [f, hash(path.join(app, f))]));

const adopt = sh('npx', ['--yes', '--package', tarball, 'zz-meridian', 'adopt', '--name', 'Acme Ops', '--hex', '#2E6BE4'], app);
check(adopt.status === 0, 'adopt exits 0', adopt.stdout + adopt.stderr);
check(/types: passes/.test(adopt.stdout), 'adopt reports that the project type checks', adopt.stdout);
check(TEAM.every((f) => hash(path.join(app, f)) === before[f]), "the team's own files are unchanged");
check(fs.existsSync(path.join(app, '.meridian/manifest.json')), 'the manifest is written');
check(fs.readFileSync(path.join(app, 'AGENTS.md'), 'utf8').includes('# Built on ZZ Meridian'), "Meridian's rules are appended to AGENTS.md");
check(fs.existsSync(path.join(app, '.agents/skills/zz-meridian/SKILL.md')) && fs.existsSync(path.join(app, '.claude/skills/zz-meridian/SKILL.md')), 'the skill is in .agents and .claude');
// Before the agent restyles, the only problems are the team's own Tailwind defaults, which Meridian's scales do not
// render; Meridian's own files are clean. Then the restyle, at its smallest, and the gate passes.
const TEAM_PAGES = ['app/page.tsx', 'app/orders/page.tsx'];
const first = sh('npm', ['run', 'gate'], app);
const problems = (first.stdout + first.stderr).split('\n').filter((l) => /^(app|src|scripts|tokens)\/\S+:/.test(l));
check(problems.every((l) => TEAM_PAGES.some((p) => l.startsWith(`${p}:`))), "before the restyle, the gate faults only the team's own pages", problems.join('\n'));
for (const p of TEAM_PAGES) fs.writeFileSync(path.join(app, p), fs.readFileSync(path.join(app, p), 'utf8').replace(/font-bold/g, 'font-semibold'));
const gate = sh('npm', ['run', 'gate'], app);
check(gate.status === 0, 'after the restyle, npm run gate passes in the adopted project', gate.stdout + gate.stderr);
const build = sh('npx', ['next', 'build'], app);
check(build.status === 0, 'next build passes in the adopted project', build.stdout + build.stderr);
const refused = sh('npm', ['run', 'verify'], app);
check(refused.status !== 0 && /presses every control/.test(refused.stdout + refused.stderr), 'verify refuses an adopted project that has not said where its presses go', refused.stdout + refused.stderr);
const bad = sh('npx', ['--yes', '--package', tarball, 'zz-meridian', 'adopt', '--allow-dirty', '--name', 'a\\b'], app);
check(bad.status !== 0 && /backslash/.test(bad.stderr), 'a brand value with a backslash is refused before anything is copied', bad.stderr);
const again = sh('npx', ['--yes', '--package', tarball, 'zz-meridian', 'adopt'], app);
check(again.status !== 0 && /uncommitted changes/.test(again.stderr), 'a second adopt on the dirty tree refuses', again.stderr);

// ── create ─────────────────────────────────────────────────────────────────────────────────────────────
if (args.includes('--create')) {
  const dir = path.join(work, 'smoke-ops');
  const create = sh('npx', ['--yes', '--package', tarball, 'zz-meridian', 'create', dir, '--name', 'Smoke Ops'], work);
  check(create.status === 0, 'create exits 0', create.stdout + create.stderr);
  check(!fs.existsSync(path.join(dir, 'app/system')) && !fs.existsSync(path.join(dir, 'skills')), 'create leaves out the Atlas and the skill source');
  const pm = fs.existsSync(path.join(dir, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm';
  const g = sh(pm, ['run', 'gate'], dir);
  check(g.status === 0, `${pm} run gate passes in the new dashboard`, g.stdout + g.stderr);
  if (args.includes('--verify')) {
    const v = sh(pm, ['run', 'verify', '--', '--quick', '--no-vitals'], dir);
    check(v.status === 0, `${pm} run verify --quick --no-vitals passes in the new dashboard`, v.stdout + v.stderr);
  }
}

console.log(failures ? `\nsmoke: ${failures} failed (work left in ${work})` : '\nsmoke: the consumer path works');
if (!failures) fs.rmSync(work, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
