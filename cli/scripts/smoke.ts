/**
 * The consumer's path, end to end, from the packed tarball: what CI runs before publishing.
 *
 *   node cli/scripts/smoke.ts [--tarball cli/zz-meridian-0.4.0.tgz] [--adopt] [--update] [--create] [--verify]
 *
 * With no section flag the adopt section runs. --adopt names it explicitly, so it can run beside --update.
 * adopt: into a copy of cli/test/fixture-next-app (a create-next-app project with its own button, utils and data
 * layer), committed to git as a team's would be. The team's files must come out unchanged, the gate must pass under
 * the team's own eslint config, and next build must succeed.
 * --create: a new dashboard from the tarball, gated and built. --verify adds pnpm verify --quick --no-vitals on it
 * (Chrome required).
 * Both sections also check the agent context: adopt keeps AGENTS.md's bytes and adds one managed block and the brief;
 * create writes the block and the brief and keeps the assistant's tracing of docs/brief.md.
 * --update: needs registry access for zz-meridian@0.3.0. A fixture project adopted with the published 0.3.0 package, one
 * committed team edit to src/components/ui/card/index.tsx (which Meridian also changed since 0.3.0), then `update --dry-run`
 * from the local tarball: the only conflict is that card, --verbose also lists the untouched and the added paths, a plain
 * `update` refuses, and the project's bytes outside .git, its HEAD and its git status are unchanged.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { BEGIN, BRIEF_TEMPLATE, END, managedBlock } from '../src/context.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');
const VERSION: string = JSON.parse(fs.readFileSync(path.join(ROOT, 'cli/package.json'), 'utf8')).version;
const HEADINGS = ['## Product', '## Users', '## Data', '## Decisions', '## Glossary'];
const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const tarball = path.resolve(opt('--tarball') ?? fs.readdirSync(path.join(ROOT, 'cli')).filter((f) => f.endsWith('.tgz')).map((f) => path.join(ROOT, 'cli', f)).at(-1) ?? '');
if (!fs.existsSync(tarball)) throw new Error('no tarball: run npm pack in cli/ first, or pass --tarball');

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-meridian-smoke-'));
let failures = 0;
const check = (ok: boolean, what: string, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) { failures++; if (detail) console.log(detail.trim().split('\n').slice(-40).join('\n')); } };
const sh = (cmd: string, a: string[], cwd: string, env: NodeJS.ProcessEnv = process.env) => spawnSync(cmd, a, { cwd, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
const hash = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const count = (text: string, needle: string) => text.split(needle).length - 1;
const git = (cwd: string, ...a: string[]) => execFileSync('git', a, { cwd, stdio: 'ignore' });

// ── adopt ──────────────────────────────────────────────────────────────────────────────────────────────
if (args.includes('--adopt') || !args.includes('--update')) {
  const app = path.join(work, 'acme');
  fs.cpSync(path.join(ROOT, 'cli/test/fixture-next-app'), app, { recursive: true });
  git(app, 'init', '-q');
  git(app, '-c', 'user.email=smoke@example.com', '-c', 'user.name=smoke', 'add', '-A');
  git(app, '-c', 'user.email=smoke@example.com', '-c', 'user.name=smoke', 'commit', '-qm', 'the team project');
  const TEAM = ['lib/orders.ts', 'lib/utils.ts', 'components/ui/button.tsx', 'app/orders/page.tsx', 'next.config.ts', 'eslint.config.mjs'];
  const before = Object.fromEntries(TEAM.map((f) => [f, hash(path.join(app, f))]));
  const agentsBefore = fs.readFileSync(path.join(app, 'AGENTS.md'), 'utf8');

  const adopt = sh('npx', ['--yes', '--package', tarball, 'zz-meridian', 'adopt', '--name', 'Acme Ops', '--hex', '#2E6BE4'], app);
  check(adopt.status === 0, 'adopt exits 0', adopt.stdout + adopt.stderr);
  check(/types: passes/.test(adopt.stdout), 'adopt reports that the project type checks', adopt.stdout);
  check(TEAM.every((f) => hash(path.join(app, f)) === before[f]), "the team's own files are unchanged");
  check(fs.existsSync(path.join(app, '.meridian/manifest.json')), 'the manifest is written');
  const agentsAfter = fs.readFileSync(path.join(app, 'AGENTS.md'), 'utf8');
  check(count(agentsAfter, BEGIN) === 1 && count(agentsAfter, END) === 1, "Meridian's managed block is in AGENTS.md, once");
  check(agentsAfter.startsWith(agentsBefore), "the team's original AGENTS.md bytes are a prefix of the result");
  const brief = fs.existsSync(path.join(app, 'docs/brief.md')) ? fs.readFileSync(path.join(app, 'docs/brief.md'), 'utf8') : '';
  check(HEADINGS.every((h) => brief.includes(`\n${h}\n`)), 'docs/brief.md has the five headings');
  const adoptManifest = fs.readFileSync(path.join(app, '.meridian/manifest.json'), 'utf8');
  check(!adoptManifest.includes('"AGENTS.md"') && !adoptManifest.includes('"docs/brief.md"'), 'AGENTS.md and docs/brief.md are not recorded as Meridian files');
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
}

// ── update ─────────────────────────────────────────────────────────────────────────────────────────────
if (args.includes('--update')) {
  const proj = path.join(work, 'acme-update');
  const commit = (m: string) => { git(proj, '-c', 'user.email=smoke@example.com', '-c', 'user.name=smoke', 'add', '-A'); git(proj, '-c', 'user.email=smoke@example.com', '-c', 'user.name=smoke', 'commit', '-qm', m); };
  fs.cpSync(path.join(ROOT, 'cli/test/fixture-next-app'), proj, { recursive: true });
  git(proj, 'init', '-q');
  commit('the team project');
  const pack = sh('npm', ['pack', 'zz-meridian@0.3.0', '--ignore-scripts'], work);
  const old = path.join(work, 'zz-meridian-0.3.0.tgz');
  check(pack.status === 0 && fs.existsSync(old), 'npm pack zz-meridian@0.3.0 fetches the published release', pack.stdout + pack.stderr);
  if (fs.existsSync(old)) {
    const adopted = sh('npx', ['--yes', '--package', old, 'zz-meridian', 'adopt', '--name', 'Acme Ops', '--hex', '#2E6BE4', '--no-install'], proj);
    check(adopted.status === 0, 'adopt with the published 0.3.0 exits 0', adopted.stdout + adopted.stderr);
    commit('adopt 0.3.0');
    const CARD = 'src/components/ui/card/index.tsx';
    fs.appendFileSync(path.join(proj, CARD), '// the team edit\n');
    commit('the team edits the card');

    const digest = () => {
      const h = createHash('sha256');
      const walk = (rel: string) => {
        for (const e of fs.readdirSync(path.join(proj, rel), { withFileTypes: true }).sort((x, y) => (x.name < y.name ? -1 : 1))) {
          if (!rel && e.name === '.git') continue;
          const p = rel ? `${rel}/${e.name}` : e.name;
          if (e.isDirectory()) { h.update(`d ${p}\n`); walk(p); }
          else if (e.isSymbolicLink()) h.update(`l ${p} ${fs.readlinkSync(path.join(proj, p))}\n`);
          else h.update(`f ${p} ${hash(path.join(proj, p))}\n`);
        }
      };
      walk('');
      return h.digest('hex');
    };
    const state = () => ({ status: sh('git', ['status', '--porcelain'], proj).stdout, head: sh('git', ['rev-parse', 'HEAD'], proj).stdout.trim(), tree: digest() });
    const before = state();

    const zz = (...a: string[]) => sh('npx', ['--yes', '--package', tarball, 'zz-meridian', ...a], proj);
    const dry = zz('update', '--dry-run');
    const verbose = zz('update', '--dry-run', '--verbose');
    const plain = zz('update');
    const after = state();

    const rows = dry.stdout.split('\n').filter((l) => l.trim() && !/^(migrations|summary|outcome|note):/.test(l));
    check(dry.status === 0, 'update --dry-run exits 0', dry.stdout + dry.stderr);
    check(rows.length === 1 && rows[0].includes(CARD) && /merge required\s*$/.test(rows[0]), `the only listed path is ${CARD}, merge required`, dry.stdout + dry.stderr);
    check(/^summary: 1 conflict\b/m.test(dry.stdout), 'the summary reads 1 conflict', dry.stdout);
    check(verbose.status === 0 && /src\/lib\/cn\.ts\b/.test(verbose.stdout) && /untouched\s+src\/lib\/cn\.ts/.test(verbose.stdout), '--verbose lists the untouched src/lib/cn.ts', verbose.stdout + verbose.stderr);
    check(/added\s+src\/components\/patterns\/assistant\/launcher\.tsx/.test(verbose.stdout), '--verbose lists the added src/components/patterns/assistant/launcher.tsx', verbose.stdout);
    check(plain.status === 1 && plain.stderr.includes('only --dry-run is available'), 'a plain update refuses', plain.stdout + plain.stderr);
    check(JSON.stringify(before) === JSON.stringify(after), "the project's bytes, HEAD and git status are unchanged", `${JSON.stringify(before)}\n${JSON.stringify(after)}`);
    console.log(`\n${dry.stdout.trim()}`);
  }
}

// ── create ─────────────────────────────────────────────────────────────────────────────────────────────
if (args.includes('--create')) {
  const dir = path.join(work, 'smoke-ops');
  const create = sh('npx', ['--yes', '--package', tarball, 'zz-meridian', 'create', dir, '--name', 'Smoke Ops'], work);
  check(create.status === 0, 'create exits 0', create.stdout + create.stderr);
  check(!fs.existsSync(path.join(dir, 'app/system')) && !fs.existsSync(path.join(dir, 'skills')), 'create leaves out the Atlas and the skill source');
  const pm = fs.existsSync(path.join(dir, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm';
  const read = (f: string) => (fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8') : '');
  check(read('AGENTS.md').includes(managedBlock(VERSION, pm)) && read('AGENTS.md').includes('# Built on ZZ Meridian'), `AGENTS.md holds the managed block, written for ${pm}`);
  check(read('docs/brief.md') === BRIEF_TEMPLATE, 'docs/brief.md is the template');
  check(read('next.config.ts').includes("'/api/assistant': ['./docs/brief.md']"), "next.config.ts still traces docs/brief.md for /api/assistant");
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
