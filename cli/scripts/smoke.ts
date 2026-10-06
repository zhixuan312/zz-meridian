/**
 * The consumer's path, end to end, from the packed tarball: what CI runs before publishing.
 *
 *   node cli/scripts/smoke.ts [--tarball cli/zz-meridian-0.5.0.tgz] [--adopt] [--create] [--update] [--update-all] [--verify] [--keep]
 *
 * With no section flag the adopt section runs. --adopt names it explicitly, so it can run beside the others.
 * adopt: into a copy of cli/test/fixture-next-app (a create-next-app project with its own button, utils and data
 * layer), committed to git as a team's would be. The team's files must come out unchanged, the gate must pass under
 * the team's own eslint config, and next build must succeed.
 * --create: a new dashboard from the tarball, then its default pnpm verify (the gate, one build, the bounded smoke).
 * --verify runs pnpm verify --full on it instead (Chrome required).
 * --keep leaves the fixture projects in the temporary folder for inspection; without it they are removed, pass or fail.
 * --verify also runs the default verify twice in scratch copies of the adopted project: once with `noLiveApi: true` as a
 * team edit and no mappings, and once with no safe backend. Each case prints its coverage line.
 * Both sections also check the agent context: adopt keeps AGENTS.md's bytes and adds one managed block and the brief;
 * create writes the block and the brief and keeps the assistant's tracing of docs/brief.md. Both fresh manifests hold
 * only the files Meridian manages.
 *
 * --update and --update-all need registry access for the published zz-meridian@0.3.0 and @0.4.0. The adopted fixture is
 * a project adopted with a published package, then given what a team's project carries (a card edit, a kept skill file
 * and token file, a brief, an extra doc, a team page fix) and committed. The running tarball is then its update target.
 * --update: every published origin a team can update from, adopted and created, from 0.3.0 and from 0.4.0. The 0.3.0
 * adopted project walks every stage: the dry-run, then a real update, the gate refusing the open session, a resolution
 * written as references/update.md tells an agent, finalize, and everything the team owns unchanged. The other three
 * commit their team's work, update, resolve every reported migration, finalize with the gate and the build, and keep
 * the team's bytes. This release's migrations are resolved the way that guide says: an adopted project's own files get
 * the smallest edit, a created project's get the release's versions of what changed.
 * --update-all: the remaining controlled cases, each on its own copy of the 0.3.0 adopted fixture: finalize with and
 * without --verify, an interruption and its resume, a failed install, a type error, a check that writes source, abort,
 * a dirty tree, a removal and an addition, and a rebrand followed by an update on both routes. The variant package and
 * the 0.5.1 package exist only in this script's scratch folder; they test the updater and are never releases.
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
const keep = args.includes('--keep');
let failures = 0;
const check = (ok: boolean, what: string, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) { failures++; if (detail) console.log(detail.trim().split('\n').slice(-40).join('\n')); } };
const sh = (cmd: string, a: string[], cwd: string, env: NodeJS.ProcessEnv = process.env) => spawnSync(cmd, a, { cwd, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
const hash = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const count = (text: string, needle: string) => text.split(needle).length - 1;
const git = (cwd: string, ...a: string[]) => execFileSync('git', a, { cwd, stdio: 'ignore' });
const commit = (cwd: string, m: string) => {
  git(cwd, '-c', 'user.email=smoke@example.com', '-c', 'user.name=smoke', 'add', '-A');
  // Nothing to commit is not an error: the case that follows reports what it finds.
  try { git(cwd, '-c', 'user.email=smoke@example.com', '-c', 'user.name=smoke', 'commit', '-qm', m); } catch { /* nothing changed */ }
};
const read = (dir: string, rel: string) => (fs.existsSync(path.join(dir, rel)) ? fs.readFileSync(path.join(dir, rel), 'utf8') : '');
const write = (dir: string, rel: string, text: string) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text); };
/** The coverage line verify ends with, which every case quotes: the depth that ran, and what did not. */
const coverageOf = (out: string) => /^coverage: .*$/m.exec(out)?.[0] ?? '';
const sections = ['--adopt', '--create', '--update', '--update-all'];

/** Files a fresh 0.5.0 manifest may hold: the managed folders, plus Meridian's own two loose files. */
const MANAGED = /^(tokens\/|src\/styles\/|src\/components\/|scripts\/|src\/lib\/|\.agents\/|\.claude\/)|^(src\/views\/console-chrome\.tsx|tests\/setup\.ts)$/;
const NEVER = (p: string) => p === 'src/app.config.ts' || p === 'scripts/verify.config.ts' || p.startsWith('app/') || p.startsWith('docs/') || (p.startsWith('src/views/') && p !== 'src/views/console-chrome.tsx');
const unmanaged = (manifest: { files: Record<string, string> }) => Object.keys(manifest.files).filter((p) => !MANAGED.test(p) || NEVER(p));

// ── adopt ──────────────────────────────────────────────────────────────────────────────────────────────
if (args.includes('--adopt') || !sections.some((s) => args.includes(s))) {
  const app = path.join(work, 'acme');
  fs.cpSync(path.join(ROOT, 'cli/test/fixture-next-app'), app, { recursive: true });
  git(app, 'init', '-q');
  commit(app, 'the team project');
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
  const adoptOffenders = unmanaged(JSON.parse(adoptManifest));
  check(JSON.parse(adoptManifest).version === VERSION && adoptOffenders.length === 0, 'the adopt manifest is the running version and holds only managed paths', adoptOffenders.join('\n'));
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
  const refused = sh('npm', ['run', 'verify', '--', '--full'], app);
  check(refused.status !== 0 && /kept its own data layer/.test(refused.stdout + refused.stderr), 'verify --full refuses an adopted project that has not said where its presses go', refused.stdout + refused.stderr);
  if (args.includes('--verify')) {
    // The default is the partial-coverage experience: it exits 0 for the checks it ran and says what it could not.
    const scratch = (name: string) => {
      const copy = path.join(work, name);
      const cp = sh('cp', ['-R', app, copy], work);
      check(cp.status === 0, `${name}: a scratch copy of the adopted project`, cp.stderr);
      fs.rmSync(path.join(copy, '.next'), { recursive: true, force: true });
      // The team's own work that makes a project ready for verify, as the skill's steps ask: the pages on the shell (the
      // rail, and the page frame that carries the phone's navigation button) with no link in the content, so a closed drawer
      // prefetches nothing, and the cache-components-config migration's edit, since the route policy fails a route that
      // renders per request.
      write(copy, 'app/layout.tsx', read(copy, 'app/layout.tsx')
        .replace('import "./globals.css";', 'import "./globals.css";\nimport { Providers } from "../src/components/base/providers";\nimport { AppShell } from "../src/components/base/shell";\nimport { ConsoleRail } from "../src/views/console-chrome";')
        .replace('{children}</body>', '<Providers>\n          <AppShell rail={<ConsoleRail />} assistant={Promise.resolve(false)}>{children}</AppShell>\n        </Providers></body>'));
      write(copy, 'app/page.tsx', `import { PageFrame } from '../src/components/base/shell';\n\nexport default function Home() {\n  return (\n    <PageFrame title="Acme console">\n      <p>Orders are in the rail.</p>\n    </PageFrame>\n  );\n}\n`);
      write(copy, 'app/orders/page.tsx', `import { Button } from '@/components/ui/button';\nimport { listOrders } from '@/lib/orders';\nimport { PageFrame } from '../../src/components/base/shell';\n\nexport default async function OrdersPage() {\n  const orders = await listOrders();\n  return (\n    <PageFrame title="Orders">\n      <ul>{orders.map((o) => <li key={o.id}>{o.customer}: {o.total}</li>)}</ul>\n      <Button>Export</Button>\n    </PageFrame>\n  );\n}\n`);
      write(copy, 'next.config.ts', read(copy, 'next.config.ts').replace('/* config options here */', 'cacheComponents: true,\n  partialPrefetching: true,'));
      return copy;
    };
    const unsafe = scratch('adopted-unsafe');
    const v1 = sh('npm', ['run', 'verify'], unsafe);
    const line1 = coverageOf(v1.stdout);
    console.log(`     coverage (adopted, no safe backend): ${line1}`);
    check(v1.status === 0 && /^coverage: default; browser not run \(no fakeApi or noLiveApi\); /.test(line1), 'the default verify on an adopted project without a safe backend exits 0 and reports the browser as not run', v1.stdout + v1.stderr);

    const safe = scratch('adopted-nolive');
    const config = read(safe, 'scripts/verify.config.ts');
    write(safe, 'scripts/verify.config.ts', config.replace('detailRoutes: [],', 'noLiveApi: true,\n  detailRoutes: [],'));
    check(/noLiveApi: true/.test(read(safe, 'scripts/verify.config.ts')), 'noLiveApi: true is written into the adopted verify.config.ts as a team edit');
    const v2 = sh('npm', ['run', 'verify'], safe);
    const line2 = coverageOf(v2.stdout);
    console.log(`     coverage (adopted, noLiveApi): ${line2}`);
    check(v2.status === 0 && /^coverage: default; browser ran; (\d+) routes; data configured 0\/\1; interaction configured 0\/\1; /.test(line2), 'the default verify on an adopted project with noLiveApi and no mappings exits 0 with data and interaction not configured', v2.stdout + v2.stderr);
  }
  const bad = sh('npx', ['--yes', '--package', tarball, 'zz-meridian', 'adopt', '--allow-dirty', '--name', 'a\\b'], app);
  check(bad.status !== 0 && /backslash/.test(bad.stderr), 'a brand value with a backslash is refused before anything is copied', bad.stderr);
  const again = sh('npx', ['--yes', '--package', tarball, 'zz-meridian', 'adopt'], app);
  check(again.status !== 0 && /uncommitted changes/.test(again.stderr), 'a second adopt on the dirty tree refuses', again.stderr);
}

// ── shared by --update and --update-all ────────────────────────────────────────────────────────────────

const CARD = 'src/components/ui/card/index.tsx';
const KEPT_SKILL = '.agents/skills/zz-meridian/SKILL.md';
const KEPT_TOKEN = 'tokens/density.compact.tokens.json';
const TEAM_PAGES = ['app/page.tsx', 'app/orders/page.tsx'];
const sha = (f: string) => (fs.existsSync(f) ? `sha256-${hash(f)}` : null);
const secs = (ms: number) => (ms / 1000).toFixed(1);

type Ran = { status: number | null; out: string; err: string; wall: number };

/** Runs one command of a package and prints its measured time, so a slow stage is visible whatever the verdict. */
function zz(pkg: string, cwd: string, a: string[], label: string, env: Record<string, string> = {}): Ran {
  const t0 = performance.now();
  const r = sh('npx', ['--yes', '--package', pkg, 'zz-meridian', ...a], cwd, { ...process.env, ...env });
  const wall = performance.now() - t0;
  const reported = /^time: (.*)$/m.exec(r.stdout)?.[1];
  console.log(`     time ${label}: wall ${secs(wall)}s${reported ? ` (${reported})` : ''}`);
  return { status: r.status, out: r.stdout, err: r.stderr, wall };
}

/** The migrations 0.5.0 declares in `cli/src/migrations.ts`: changes in the team's own files, resolved by editing them. */
const RELEASE_IDS = ['shell-assistant-promise', 'assistant-available-promise', 'clock-now-required', 'cache-components-config', 'connection-boundaries', 'authorized-read', 'scoped-invalidation', 'live-provider', 'authorized-endpoints'];

const filesUnder = (dir: string, rel = ''): string[] => {
  if (!fs.existsSync(path.join(dir, rel))) return [];
  return fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((e) => {
    const p = rel ? `${rel}/${e.name}` : e.name;
    return e.isDirectory() ? filesUnder(dir, p) : [p];
  });
};

/**
 * What `references/update.md` tells an agent to do for this release's migrations, on a project whose files are the
 * earlier release's.
 * A created project never changed the template's pages, so each affected file comes over from the release (the package's
 * template), with the files that arrived with it, and a file the release moved goes. An adopted project's pages are the
 * team's own: the smallest edit the instruction names, here the two flags in its Next config.
 */
function bringReleaseOver(proj: string, route: string) {
  if (route === 'adopt') {
    edit(proj, 'next.config.ts', (t) => t.replace(/\/\* config options here \*\//, 'cacheComponents: true,\n  partialPrefetching: true,'));
    return;
  }
  const payload = path.join(unpack(), 'payload');
  // The template's console, its data seam and the assistant's route-side code (which takes the guard). The Atlas
  // (app/system) is not in a created project, and a test is replaced only where the project already has it.
  const owned = (f: string) => (f.startsWith('app/') && !f.startsWith('app/system/')) || f.startsWith('src/views/') || f.startsWith('src/data/') || f.startsWith('src/system/fixtures/') || f === 'src/system/sample-cells.tsx' || (f.startsWith('src/lib/assistant/') && f !== 'src/lib/assistant/prompt.ts');
  const release = new Set(filesUnder(payload).filter(owned));
  for (const f of filesUnder(proj).filter(owned)) if (!release.has(f)) fs.rmSync(path.join(proj, f));
  for (const f of release) write(proj, f, fs.readFileSync(path.join(payload, f), 'utf8'));
  for (const f of filesUnder(path.join(proj, 'tests'))) {
    const rel = `tests/${f}`;
    if (rel !== 'tests/setup.ts' && fs.existsSync(path.join(payload, rel))) write(proj, rel, fs.readFileSync(path.join(payload, rel), 'utf8'));
  }
  edit(proj, 'next.config.ts', (t) => t.replace('reactStrictMode: true,', 'reactStrictMode: true,\n  cacheComponents: true,\n  partialPrefetching: true,'));
}

/** `references/update.md`: resolve in the project's own file, then one object per item with its reason and the files' current hashes. */
function resolveAll(proj: string, version: string, reason: string) {
  const dir = path.join(proj, '.meridian/update', version);
  const stubs = [...read(dir, 'MERGE.md').matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => JSON.parse(m[1]!)).filter((s) => typeof s.id === 'string' && /^(file|migration):/.test(s.id));
  const reported = RELEASE_IDS.filter((id) => stubs.some((s) => s.id === `migration:${id}`));
  if (reported.length > 0) bringReleaseOver(proj, finalManifest(proj).route);
  const resolutions = stubs.map((s) => ({
    id: s.id,
    status: s.id.startsWith('migration:') && !reported.includes(s.id.slice('migration:'.length)) ? 'not-applicable' : 'resolved',
    reason: reported.includes(s.id.slice('migration:'.length)) ? 'Made the change this release describes, in the project.' : reason,
    files: Object.fromEntries(Object.keys(s.files).map((f) => [f, sha(path.join(proj, f))])),
  }));
  fs.writeFileSync(path.join(dir, 'resolutions.json'), `${JSON.stringify(resolutions, null, 2)}\n`);
  return resolutions;
}

const edit = (dir: string, rel: string, fn: (text: string) => string) => write(dir, rel, fn(read(dir, rel)));
const fixPages = (dir: string) => { for (const p of TEAM_PAGES) edit(dir, p, (t) => t.replace(/font-bold/g, 'font-semibold')); };
const clone = (from: string, name: string) => { const to = path.join(work, name); fs.cpSync(from, to, { recursive: true, verbatimSymlinks: true }); return to; };
const finalManifest = (proj: string) => JSON.parse(read(proj, '.meridian/manifest.json')) as { version: string; route: string; brand: Record<string, string>; files: Record<string, string> };

/** The tarball, unpacked once, for the payload bytes and for building the scratch variants. */
let unpacked: string | undefined;
function unpack(): string {
  if (!unpacked) {
    unpacked = path.join(work, 'unpacked');
    fs.mkdirSync(unpacked);
    execFileSync('tar', ['-xzf', tarball, '-C', unpacked]);
  }
  return path.join(unpacked, 'package');
}

/** A copy of the running package with its payload changed and its version relabelled, packed in scratch. */
function variant(name: string, version: string, change: (payload: string) => void): string {
  const dir = path.join(work, `variant-${name}`);
  fs.cpSync(path.join(unpack(), '..'), dir, { recursive: true });
  const pkgFile = path.join(dir, 'package/package.json');
  fs.writeFileSync(pkgFile, `${JSON.stringify({ ...JSON.parse(fs.readFileSync(pkgFile, 'utf8')), version }, null, 2)}\n`);
  change(path.join(dir, 'package/payload'));
  const packed = sh('npm', ['pack', '--ignore-scripts', '--pack-destination', dir], path.join(dir, 'package'));
  const out = path.join(work, `variant-${name}.tgz`);
  fs.renameSync(path.join(dir, `zz-meridian-${version}.tgz`), out);
  if (packed.status !== 0) throw new Error(`npm pack of the ${name} variant failed: ${packed.stderr}`);
  return out;
}

const published: Record<string, string | null> = {};
/** A published release, packed from the registry once; null, with the failure named, when it cannot be fetched. */
function publishedRelease(version: string): string | null {
  if (!(version in published)) {
    const pack = sh('npm', ['pack', `zz-meridian@${version}`, '--ignore-scripts'], work);
    const file = path.join(work, `zz-meridian-${version}.tgz`);
    const ok = pack.status === 0 && fs.existsSync(file);
    check(ok, `npm pack zz-meridian@${version} fetches the published release`, pack.stdout + pack.stderr);
    published[version] = ok ? file : null;
  }
  return published[version]!;
}

/** The adopted fixture of a published release: adopted, then carrying the team's own work, committed. Built once and cloned per case. */
const adoptedBases: Record<string, string | null> = {};
function adoptedBase(version = '0.3.0'): string | null {
  if (version in adoptedBases) return adoptedBases[version]!;
  const pkg = publishedRelease(version);
  adoptedBases[version] = null;
  if (!pkg) return null;
  const proj = path.join(work, `base-adopted-${version}`);
  fs.cpSync(path.join(ROOT, 'cli/test/fixture-next-app'), proj, { recursive: true });
  git(proj, 'init', '-q');
  commit(proj, 'the team project');
  const adopted = sh('npx', ['--yes', '--package', pkg, 'zz-meridian', 'adopt', '--name', 'Acme Ops', '--hex', '#2E6BE4', '--no-install'], proj);
  check(adopted.status === 0, `adopt with the published ${version} exits 0`, adopted.stdout + adopted.stderr);
  if (adopted.status !== 0) return null;
  commit(proj, `adopt ${version}`);
  // What a team does after adopting: the restyle the gate asks for, a card edit, its own skill and token file kept on
  // purpose (a skill that names no paths, since the gate checks every path a skill names), a brief and another doc.
  fixPages(proj);
  edit(proj, CARD, (t) => `${t}// the team edit\n`);
  write(proj, KEPT_SKILL, '---\nname: zz-meridian\ndescription: Our own notes on how this dashboard is built.\n---\n\n# Our dashboard\n\nWe keep our own version of this skill.\n');
  edit(proj, KEPT_TOKEN, (t) => t.replace(/("\$description": ")/, '$1Our edit. '));
  writeTeamDocs(proj);
  write(proj, '.meridian/keep.json', `${JSON.stringify([{ path: KEPT_SKILL, reason: 'Our skill names our own workflow.' }, { path: KEPT_TOKEN, reason: 'Our density note.' }], null, 2)}\n`);
  commit(proj, 'the team work');
  adoptedBases[version] = proj;
  return proj;
}

/** The team's own documents, on either route: a filled-in brief and a doc Meridian never shipped. */
const TEAM_DOCS = ['docs/brief.md', 'docs/runbook.md'];
function writeTeamDocs(proj: string) {
  write(proj, 'docs/brief.md', `# Acme Ops\n\n${HEADINGS.map((h) => `${h}\nFilled in by the team.\n`).join('\n')}`);
  write(proj, 'docs/runbook.md', '# Runbook\n\nThe team keeps this next to the code.\n');
}

/** A finished case's project goes at once, unless --keep: each holds a full install. */
const done = (proj: string) => { if (!keep) fs.rmSync(proj, { recursive: true, force: true }); };

/** Everything the team owns that an update must leave byte for byte. */
const OWNED = [...TEAM_DOCS, 'README.md', 'src/app.config.ts', 'scripts/verify.config.ts', 'lib/orders.ts', 'lib/utils.ts', 'components/ui/button.tsx', 'app/page.tsx', 'app/orders/page.tsx', 'next.config.ts', 'eslint.config.mjs', KEPT_SKILL, KEPT_TOKEN, '.meridian/keep.json'];

type Upgraded = { manifest: string; packageJson: string; agents: string };
let upgraded: Upgraded | undefined;

/** The walking skeleton: the dry-run, a real update, the gate on an open session, the resolution, finalize. */
function mainUpgrade(): Upgraded {
  if (upgraded) return upgraded;
  console.log('\n── update: a published-0.3.0 adopted project');
  const proj = clone(adoptedBase()!, 'update-main');
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

  // The Phase 0 dry-run assertions that still hold, on the fixture as the team left it.
  const before = state();
  const dry = zz(tarball, proj, ['update', '--dry-run'], 'dry-run');
  const verbose = zz(tarball, proj, ['update', '--dry-run', '--verbose'], 'dry-run --verbose');
  const after = state();
  const rows = dry.out.split('\n').filter((l) => l.trim() && !/^(migration\s|summary:|outcome:|note:|time:|Next:)/.test(l));
  check(dry.status === 0, 'update --dry-run exits 0', dry.out + dry.err);
  check(rows.length === 1 && rows[0]!.includes(CARD) && /merge required\s*$/.test(rows[0]!), `the only listed path is ${CARD}, merge required`, dry.out + dry.err);
  check(/^summary: 1 conflict\b/m.test(dry.out), 'the summary reads 1 conflict', dry.out);
  check(/^outcome: dry-run/m.test(dry.out), 'the dry-run says nothing was written', dry.out);
  check(verbose.status === 0 && /untouched\s+src\/lib\/cn\.ts/.test(verbose.out), '--verbose lists the untouched src/lib/cn.ts', verbose.out + verbose.err);
  check(/added\s+src\/components\/patterns\/assistant\/launcher\.tsx/.test(verbose.out), '--verbose lists the added src/components/patterns/assistant/launcher.tsx', verbose.out);
  check(JSON.stringify(before) === JSON.stringify(after), "a dry-run leaves the project's bytes, HEAD and git status unchanged", `${JSON.stringify(before)}\n${JSON.stringify(after)}`);
  console.log(`\n${dry.out.trim()}\n`);

  // The real update.
  const owned = Object.fromEntries(OWNED.map((f) => [f, sha(path.join(proj, f))]));
  const agentsBefore = read(proj, 'AGENTS.md');
  const real = zz(tarball, proj, ['update'], 'update');
  const session = `.meridian/update/${VERSION}`;
  check(real.status === 2, 'a real update exits 2: applied, with work pending', real.out + real.err);
  check(fs.existsSync(path.join(proj, session, 'MERGE.md')) && /^migration\s+dependency:/m.test(real.out), 'it writes MERGE.md and reports the migrations', real.out + real.err);
  check(['base', 'ours', 'new'].every((d) => fs.existsSync(path.join(proj, session, d, CARD))), `it stages ${CARD} with base, ours and new copies`);
  check(/^migration\s+cache-components-config\b/m.test(real.out), "it reports cache-components-config, the one release migration an adopted project's own files still need", real.out);
  check(/^outcome: migration-required/m.test(real.out) && /^Next: .*update --finalize/m.test(real.out), 'it prints the outcome and the pinned next command', real.out);
  const installSecs = Number(/install (\d+(?:\.\d+)?)s/.exec(real.out)?.[1] ?? 0);
  const initial = real.wall / 1000 - installSecs;
  check(initial <= 60, `the initial report took ${initial.toFixed(1)}s excluding install (limit 60s)`);

  const stagedNew = sha(path.join(proj, session, 'new', CARD));
  const open = sh('node', ['scripts/gate.ts'], proj);
  check(open.status !== 0 && (open.stdout + open.stderr).includes(session), 'while the session is unresolved, the project gate fails and names it', open.stdout + open.stderr);
  const beforeFinalize = finalManifest(proj);
  check(beforeFinalize.version === '0.3.0', 'the manifest still records 0.3.0 until finalize');

  // Keep ours, as references/update.md says, then finalize.
  const resolutions = resolveAll(proj, VERSION, 'Kept our version; the project works as it is.');
  check(resolutions.some((r) => r.id === `file:${CARD}`), `the resolutions name file:${CARD}`);
  const fin = zz(tarball, proj, ['update', '--finalize'], 'finalize');
  check(fin.status === 0 && /^outcome: complete/m.test(fin.out), 'update --finalize exits 0 and completes', fin.out + fin.err);
  check(fin.wall / 1000 <= 90, `finalize took ${secs(fin.wall)}s (limit 90s)`);

  // The manifest.
  const manifest = finalManifest(proj);
  const offenders = unmanaged(manifest);
  check(manifest.version === VERSION, `the manifest is ${VERSION}`);
  check(offenders.length === 0, 'the manifest holds only managed paths', offenders.join('\n'));
  check(stagedNew !== null && manifest.files[CARD] === stagedNew, `the manifest holds the target hash (that of new/) for the staged ${CARD}`);
  check(fs.existsSync(path.join(proj, '.meridian/history', VERSION)) && !fs.existsSync(path.join(proj, session)), 'the session is archived under .meridian/history');

  // The team's bytes.
  // The one team file the release's migration edits is next.config.ts: the two flags, and nothing else.
  check(/cacheComponents: true/.test(read(proj, 'next.config.ts')) && /partialPrefetching: true/.test(read(proj, 'next.config.ts')), "the cache-components-config migration's edit is in the adopted project's next.config.ts");
  const changed = OWNED.filter((f) => f !== 'next.config.ts' && sha(path.join(proj, f)) !== owned[f]);
  check(changed.length === 0, "the brief, the extra doc, README, app config, verify config, the team's files and the kept files are unchanged", changed.join('\n'));
  const agentsAfter = read(proj, 'AGENTS.md');
  const begin = agentsAfter.indexOf(BEGIN);
  const end = agentsAfter.indexOf(END);
  check(count(agentsAfter, BEGIN) === 1 && end > begin && agentsAfter.slice(0, begin).trim() === agentsBefore.slice(0, agentsBefore.indexOf('# Built on ZZ Meridian')).trim() && agentsAfter.slice(end + END.length).trim() === '', 'AGENTS.md bytes outside the managed block are unchanged', agentsAfter);

  // The gate after finalize refuses a keep entry for a file Meridian never managed, and a logo that is not a local SVG.
  const keep = read(proj, '.meridian/keep.json');
  const config = read(proj, 'src/app.config.ts');
  write(proj, '.meridian/keep.json', `${JSON.stringify([...JSON.parse(keep), { path: 'src/app.config.ts', reason: 'We never let Meridian touch it.' }], null, 2)}\n`);
  const keepGate = sh('node', ['scripts/gate.ts'], proj);
  check(keepGate.status !== 0 && /keep\.json/.test(keepGate.stdout + keepGate.stderr) && /src\/app\.config\.ts/.test(keepGate.stdout + keepGate.stderr), 'a keep entry for a path Meridian never managed fails the gate', keepGate.stdout + keepGate.stderr);
  write(proj, '.meridian/keep.json', keep);
  write(proj, 'src/app.config.ts', config.replace("name: 'Acme Ops',", "name: 'Acme Ops',\n  logo: 'https://x.dev/logo.svg',"));
  const logoGate = sh('node', ['scripts/gate.ts'], proj);
  check(logoGate.status !== 0 && /app\.logo/.test(logoGate.stdout + logoGate.stderr), 'an app.logo of https://x.dev/logo.svg fails the gate', logoGate.stdout + logoGate.stderr);
  write(proj, 'src/app.config.ts', config);
  const restored = sh('node', ['scripts/gate.ts'], proj);
  check(restored.status === 0 && read(proj, '.meridian/keep.json') === keep && read(proj, 'src/app.config.ts') === config, 'with both restored, the gate passes again', restored.stdout + restored.stderr);

  upgraded = { manifest: read(proj, '.meridian/manifest.json'), packageJson: read(proj, 'package.json'), agents: agentsAfter };
  return upgraded;
}

/**
 * A published origin brought to this release as an agent following references/update.md would: the team's work
 * committed, the update, every reported migration resolved, finalize with the gate and the build, and the team's bytes
 * unchanged. The 0.3.0 adopted origin is mainUpgrade, which asserts each stage on the way.
 */
function originUpgrade(version: string, route: 'adopt' | 'create') {
  const label = `${version} ${route === 'adopt' ? 'adopted' : 'created'}`;
  console.log(`\n── update: a published-${label} project`);
  let proj: string;
  let teamOwned: string[];
  if (route === 'adopt') {
    const base = adoptedBase(version);
    if (!base) return;
    proj = clone(base, `update-adopt-${version}`);
    teamOwned = OWNED.filter((f) => f !== 'next.config.ts');
  } else {
    const pkg = publishedRelease(version);
    if (!pkg) return;
    proj = path.join(work, `update-create-${version}`);
    const made = sh('npx', ['--yes', '--package', pkg, 'zz-meridian', 'create', proj, '--name', 'Smoke Ops', '--no-install'], work);
    check(made.status === 0, `create with the published ${version} exits 0`, made.stdout + made.stderr);
    if (made.status !== 0) return;
    commit(proj, `created with ${version}`);
    // A created project's template files stay exactly as the release wrote them: the update alone must bring it to a
    // passing gate. The team's own documents sit beside them.
    writeTeamDocs(proj);
    commit(proj, 'the team work');
    teamOwned = TEAM_DOCS;
  }
  const owned = Object.fromEntries(teamOwned.map((f) => [f, sha(path.join(proj, f))]));
  const files = Object.keys(finalManifest(proj).files);
  const historical = ['src/app.config.ts', 'app/page.tsx'].filter((p) => p in finalManifest(proj).files);

  const up = zz(tarball, proj, ['update'], `${label} update`);
  const reported = RELEASE_IDS.filter((id) => new RegExp(`^migration\\s+${id}\\b`, 'm').test(up.out));
  check(up.status === 2 && /^outcome: migration-required/m.test(up.out) && reported.length > 0, `${label}: the update applies and stops on its pending migrations (${reported.join(', ')})`, up.out + up.err);
  if (route === 'create' && version === '0.3.0') {
    // 0.3.0's template already passed `now` everywhere, so only the clock migration has nothing to report.
    const missed = RELEASE_IDS.filter((id) => id !== 'clock-now-required' && !reported.includes(id));
    check(missed.length === 0 && !reported.includes('clock-now-required'), `${label}: the report names every release migration its template still has the old shape for`, `missing: ${missed.join(', ')}\n${up.out}`);
  }
  if (version === '0.4.0' && route === 'create') check(/^summary: 0 conflicts\b/m.test(up.out), `${label}: with no conflict, the migrations alone keep the update from complete`, up.out);
  if (up.status !== 2) { done(proj); return; }

  resolveAll(proj, VERSION, 'Kept ours; the project works as it is.');
  const fin = zz(tarball, proj, ['update', '--finalize'], `${label} finalize`);
  check(fin.status === 0 && /^outcome: complete/m.test(fin.out), `${label}: finalize passes the gate and the build and completes in ${secs(fin.wall)}s`, fin.out + fin.err);
  const manifest = finalManifest(proj);
  check(manifest.version === VERSION && manifest.route === route && unmanaged(manifest).length === 0, `${label}: the manifest is ${VERSION}, route ${route}, and holds only managed paths`, unmanaged(manifest).join('\n'));
  if (route === 'create' && (version === '0.3.0' || historical.length > 0)) {
    check(historical.every((p) => fs.existsSync(path.join(proj, p)) && !(p in manifest.files)) && files.length > Object.keys(manifest.files).length, `${label}: its historical page and config entries stay on disk and leave the manifest`, historical.join('\n'));
  }
  const changed = teamOwned.filter((f) => sha(path.join(proj, f)) !== owned[f]);
  check(changed.length === 0, `${label}: the team's own files are unchanged`, changed.join('\n'));
  done(proj);
}

if (args.includes('--update') && adoptedBase()) {
  mainUpgrade();
  originUpgrade('0.3.0', 'create');
  originUpgrade('0.4.0', 'adopt');
  originUpgrade('0.4.0', 'create');
}

// ── update-all ─────────────────────────────────────────────────────────────────────────────────────────
if (args.includes('--update-all') && adoptedBase()) {
  const session = `.meridian/update/${VERSION}`;
  /** An update that stops with items pending, resolved by keeping ours and finalized. */
  const finish = (proj: string, label: string, pkg = tarball, env: Record<string, string> = {}, version = VERSION) => {
    resolveAll(proj, version, 'Kept ours; the project works as it is.');
    const fin = zz(pkg, proj, ['update', '--finalize'], `${label} finalize`, env);
    check(fin.status === 0 && /^outcome: complete/m.test(fin.out), `${label}: finalize completes`, fin.out + fin.err);
    return fin;
  };

  // Finalize both ways.
  {
    console.log('\n── update-all: finalize and finalize --verify on the adopted origin');
    const timed = (flag: string[], name: string) => {
      const proj = clone(adoptedBase()!, name);
      const up = zz(tarball, proj, ['update'], `${name} update`);
      check(up.status === 2, `${name}: the update stops with work pending`, up.out + up.err);
      resolveAll(proj, VERSION, 'Kept ours; the project works as it is.');
      const fin = zz(tarball, proj, ['update', '--finalize', ...flag], `${name} finalize`);
      check(fin.status === 0 && /^outcome: complete/m.test(fin.out), `${name}: finalize completes`, fin.out + fin.err);
      return fin;
    };
    const plain = timed([], 'finalize-plain');
    const verified = timed(['--verify'], 'finalize-verify');
    const line = coverageOf(verified.out);
    check(line !== '' && !/browser: not run/.test(verified.out), 'update --finalize --verify prints the coverage line instead of `browser: not run`', verified.out);
    const extra = (verified.wall - plain.wall) / 1000;
    console.log(`     finalize ${secs(plain.wall)}s, finalize --verify ${secs(verified.wall)}s, difference ${extra.toFixed(1)}s`);
    check(extra <= 30, `--verify took ${extra.toFixed(1)}s more than plain finalize (limit 30s)`);
  }

  // Interruption.
  {
    console.log('\n── update-all: interruption');
    const proj = clone(adoptedBase()!, 'update-interrupt');
    const first = zz(tarball, proj, ['update'], 'update (interrupted)', { ZZ_MERIDIAN_TEST_INTERRUPT_AFTER: '3' });
    check(first.status === 1 && /interrupted after 3 applied operations/.test(first.out), 'ZZ_MERIDIAN_TEST_INTERRUPT_AFTER=3 exits 1 after three operations', first.out + first.err);
    check(!fs.existsSync(path.join(proj, '.meridian/update.lock')) && fs.existsSync(path.join(proj, session, 'state.json')), 'the session is kept and the lock released');
    const resumed = zz(tarball, proj, ['update', '--resume'], 'resume');
    check(resumed.status === 2, '--resume continues and exits 2 with the items to resolve', resumed.out + resumed.err);
    finish(proj, 'interrupted');
    const expected = mainUpgrade();
    check(read(proj, '.meridian/manifest.json') === expected.manifest && read(proj, 'package.json') === expected.packageJson && read(proj, 'AGENTS.md') === expected.agents, 'the resumed update reaches the same manifest, package.json and AGENTS.md as the uninterrupted one');
  }

  // Install failure.
  {
    console.log('\n── update-all: install failure');
    const proj = clone(adoptedBase()!, 'update-install');
    edit(proj, 'package.json', (t) => { const j = JSON.parse(t); j.dependencies['is-odd'] = '99.99.99'; return `${JSON.stringify(j, null, 2)}\n`; });
    commit(proj, 'a team dependency at a version that does not exist');
    const failed = zz(tarball, proj, ['update'], 'update');
    check(failed.status === 1 && /install/.test(failed.out + failed.err) && /^outcome: failed/m.test(failed.out), 'a team dependency at a nonexistent version fails the install: exit 1', failed.out + failed.err);
    check(fs.existsSync(path.join(proj, session, 'state.json')) && !fs.existsSync(path.join(proj, '.meridian/update.lock')), 'the session is kept');
    edit(proj, 'package.json', (t) => { const j = JSON.parse(t); delete j.dependencies['is-odd']; return `${JSON.stringify(j, null, 2)}\n`; });
    const resumed = zz(tarball, proj, ['update', '--resume'], 'resume');
    check(resumed.status === 2 && /install \d/.test(resumed.out), 'with it fixed, --resume installs and succeeds', resumed.out + resumed.err);
    finish(proj, 'install failure');
  }

  // Typecheck failure.
  {
    console.log('\n── update-all: type error');
    const proj = clone(adoptedBase()!, 'update-types');
    write(proj, 'lib/broken.ts', "export const total: number = 'not a number';\n");
    commit(proj, 'a team file with a type error');
    const up = zz(tarball, proj, ['update'], 'update');
    check(up.status === 2, 'update applies', up.out + up.err);
    resolveAll(proj, VERSION, 'Kept ours; the project works as it is.');
    const bad = zz(tarball, proj, ['update', '--finalize'], 'finalize (type error)');
    check(bad.status === 1 && /^outcome: failed/m.test(bad.out) && finalManifest(proj).version === '0.3.0', 'a type error in a team file fails finalize: exit 1, manifest not advanced', bad.out + bad.err);
    check(fs.existsSync(path.join(proj, session, 'state.json')), 'the session is kept');
    write(proj, 'lib/broken.ts', 'export const total: number = 1;\n');
    const fin = zz(tarball, proj, ['update', '--finalize'], 'finalize (fixed)');
    check(fin.status === 0 && /^outcome: complete/m.test(fin.out), 'with it fixed, finalize succeeds', fin.out + fin.err);
  }

  // A check that writes source.
  {
    console.log('\n── update-all: a check that writes source');
    const proj = clone(adoptedBase()!, 'update-writes');
    write(proj, 'scripts/check.local.ts', "import fs from 'node:fs';\nfs.appendFileSync('src/app.config.ts', '// written by a check\\n');\n");
    commit(proj, 'a team check that writes source');
    const up = zz(tarball, proj, ['update'], 'update');
    check(up.status === 2, 'update applies', up.out + up.err);
    resolveAll(proj, VERSION, 'Kept ours; the project works as it is.');
    const bad = zz(tarball, proj, ['update', '--finalize'], 'finalize');
    check(bad.status === 1 && (bad.out + bad.err).includes('src/app.config.ts'), 'a check that writes src/app.config.ts fails finalize, naming that path', bad.out + bad.err);
    check(read(proj, 'src/app.config.ts').endsWith('// written by a check\n'), 'the written bytes stay');
    check(finalManifest(proj).version === '0.3.0' && fs.existsSync(path.join(proj, session)), 'the manifest is not advanced and the session is kept');
  }

  // Abort.
  {
    console.log('\n── update-all: abort');
    const proj = clone(adoptedBase()!, 'update-abort');
    const up = zz(tarball, proj, ['update', '--no-install'], 'update');
    check(up.status === 2, 'update --no-install applies', up.out + up.err);
    const gateFile = read(proj, 'scripts/gate.ts');
    write(proj, 'scripts/gate.ts', `${gateFile}// a later edit\n`);
    const refused = zz(tarball, proj, ['update', '--abort'], 'abort after an edit');
    check(refused.status === 1 && (refused.out + refused.err).includes('scripts/gate.ts') && fs.existsSync(path.join(proj, session, 'backup')), 'an abort after a later edit refuses, names the path and keeps the backups', refused.out + refused.err);
    write(proj, 'scripts/gate.ts', gateFile);
    const aborted = zz(tarball, proj, ['update', '--abort'], 'abort');
    const diff = sh('git', ['diff', 'HEAD', '--stat'], proj).stdout.trim();
    const status = sh('git', ['status', '--porcelain'], proj).stdout.split('\n').filter((l) => l.trim() && !l.includes('.meridian/history/'));
    check(aborted.status === 0 && /^outcome: aborted/m.test(aborted.out), 'abort exits 0', aborted.out + aborted.err);
    check(diff === '' && status.length === 0, 'git diff HEAD is empty and nothing else changed outside .meridian/history/', `${diff}\n${status.join('\n')}`);
  }

  // Dirty tree.
  {
    console.log('\n── update-all: dirty tree');
    const proj = clone(adoptedBase()!, 'update-dirty');
    write(proj, 'notes.txt', 'unfinished work\n');
    const refused = zz(tarball, proj, ['update'], 'update');
    check(refused.status === 1 && /uncommitted/.test(refused.err) && !fs.existsSync(path.join(proj, '.meridian/update')), 'a dirty tree refuses and writes nothing', refused.out + refused.err);
    const allowed = zz(tarball, proj, ['update', '--allow-dirty', '--no-install'], 'update --allow-dirty');
    check(allowed.status === 2 && fs.existsSync(path.join(proj, session, 'state.json')) && read(proj, 'notes.txt') === 'unfinished work\n', '--allow-dirty proceeds and leaves the unfinished work alone', allowed.out + allowed.err);
  }

  // Removal and addition, with a variant of the package built in scratch.
  {
    console.log('\n── update-all: a removal and an addition');
    const REMOVED = 'scripts/vitals.ts';
    const ADDED = 'src/components/ui/smoke-added/index.tsx';
    const added = 'export const smokeAdded = true;\n';
    const pkg = variant('removal', VERSION, (payload) => { fs.rmSync(path.join(payload, REMOVED)); write(payload, ADDED, added); });
    const proj = clone(adoptedBase()!, 'update-variant');
    check(fs.existsSync(path.join(proj, REMOVED)), `the 0.3.0 project manages ${REMOVED}`);
    const up = zz(pkg, proj, ['update', '--no-install', '--verbose'], 'update');
    check(up.status === 2, 'the update from the variant applies', up.out + up.err);
    check(/removed\s+scripts\/vitals\.ts/.test(up.out) && !fs.existsSync(path.join(proj, REMOVED)), `the untouched ${REMOVED} is deleted`, up.out + up.err);
    check(/added\s+src\/components\/ui\/smoke-added\/index\.tsx/.test(up.out) && read(proj, ADDED) === added, `the added ${ADDED} is written`, up.out + up.err);
  }

  // Rebrand, then update, on both origins.
  {
    const releases = path.join(work, 'releases');
    fs.mkdirSync(releases);
    fs.copyFileSync(tarball, path.join(releases, `zz-meridian-${VERSION}.tgz`));
    const NEXT = '0.5.1';
    const test051 = variant('051', NEXT, (payload) => fs.appendFileSync(path.join(payload, CARD), '// meridian 0.5.1 test change\n'));
    const env = { ZZ_MERIDIAN_LOCAL_RELEASES: releases };
    const NEW_HEX = '#0E8A5F';
    for (const origin of ['adopt', 'create'] as const) {
      console.log(`\n── update-all: rebrand then update, ${origin} origin`);
      const label = `${origin} origin`;
      let proj: string;
      if (origin === 'adopt') {
        proj = path.join(work, 'rebrand-adopt');
        fs.cpSync(path.join(ROOT, 'cli/test/fixture-next-app'), proj, { recursive: true });
        git(proj, 'init', '-q');
        commit(proj, 'the team project');
        const a = sh('npx', ['--yes', '--package', tarball, 'zz-meridian', 'adopt', '--name', 'Acme Ops', '--hex', '#2E6BE4', '--no-install'], proj);
        check(a.status === 0, `${label}: adopt from the local tarball exits 0`, a.stdout + a.stderr);
        fixPages(proj);
      } else {
        proj = path.join(work, 'rebrand-create');
        const c = sh('npx', ['--yes', '--package', tarball, 'zz-meridian', 'create', proj, '--name', 'Smoke Ops', '--hex', '#2E6BE4', '--no-install'], work);
        check(c.status === 0, `${label}: create from the local tarball exits 0`, c.stdout + c.stderr);
      }
      commit(proj, 'origin');

      const rebranded = zz(tarball, proj, ['brand', '--hex', NEW_HEX], 'brand');
      check(rebranded.status === 0 && finalManifest(proj).brand.hex === NEW_HEX, `${label}: brand --hex exits 0 and the manifest records the new brand`, rebranded.out + rebranded.err);
      commit(proj, 'rebrand');

      edit(proj, CARD, (t) => `${t}// the team edit\n`);
      commit(proj, 'the team edits the card');
      const dry = zz(test051, proj, ['update', '--dry-run'], 'dry-run', env);
      const rows = dry.out.split('\n').filter((l) => l.includes(CARD));
      check(dry.status === 0 && rows.length === 1 && /merge required\s*$/.test(rows[0]!), `${label}: after the committed edit, the dry-run still reports ${CARD}`, dry.out + dry.err);

      const OUTPUT = 'tokens/accent.brand.tokens.json';
      const was = read(proj, OUTPUT);
      check(OUTPUT in finalManifest(proj).files, `${label}: ${OUTPUT} is a recorded brand output`);
      write(proj, OUTPUT, `${was}\n`);
      commit(proj, 'the team edits a brand output');
      const manifestBefore = read(proj, '.meridian/manifest.json');
      const treeBefore = sh('git', ['ls-files', '-s'], proj).stdout + read(proj, 'src/app.config.ts');
      const refused = zz(tarball, proj, ['brand', '--hex', '#8A2F0E'], 'brand (refused)');
      check(refused.status === 1 && refused.err.includes(OUTPUT) && read(proj, '.meridian/manifest.json') === manifestBefore && sh('git', ['status', '--porcelain'], proj).stdout === '' && treeBefore === sh('git', ['ls-files', '-s'], proj).stdout + read(proj, 'src/app.config.ts'), `${label}: an edited brand output makes the rebrand refuse with no change`, refused.out + refused.err);
      write(proj, OUTPUT, was);
      commit(proj, 'revert the brand output edit');

      const up = zz(test051, proj, ['update'], 'update', env);
      check(up.status === 2 && /ZZ_MERIDIAN_LOCAL_RELEASES/.test(up.out), `${label}: the update to the local ${NEXT} package applies, reading 0.5.0 through ZZ_MERIDIAN_LOCAL_RELEASES`, up.out + up.err);
      finish(proj, label, test051, env, NEXT);
      const manifest = finalManifest(proj);
      check(manifest.version === NEXT && manifest.brand.hex === NEW_HEX && unmanaged(manifest).length === 0, `${label}: the manifest is ${NEXT}, keeps the rebranded brand and holds only managed paths`, JSON.stringify(manifest.brand));
    }
  }
}

// ── create ─────────────────────────────────────────────────────────────────────────────────────────────
if (args.includes('--create')) {
  const dir = path.join(work, 'smoke-ops');
  const create = sh('npx', ['--yes', '--package', tarball, 'zz-meridian', 'create', dir, '--name', 'Smoke Ops'], work);
  check(create.status === 0, 'create exits 0', create.stdout + create.stderr);
  check(!fs.existsSync(path.join(dir, 'app/system')) && !fs.existsSync(path.join(dir, 'skills')), 'create leaves out the Atlas and the skill source');
  const pm = fs.existsSync(path.join(dir, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm';
  const text = (f: string) => read(dir, f);
  check(text('AGENTS.md').includes(managedBlock(VERSION, pm)) && text('AGENTS.md').includes('# Built on ZZ Meridian'), `AGENTS.md holds the managed block, written for ${pm}`);
  check(text('docs/brief.md') === BRIEF_TEMPLATE, 'docs/brief.md is the template');
  check(text('next.config.ts').includes("'/api/assistant': ['./docs/brief.md']"), "next.config.ts still traces docs/brief.md for /api/assistant");
  const createOffenders = unmanaged(JSON.parse(text('.meridian/manifest.json')));
  check(JSON.parse(text('.meridian/manifest.json')).version === VERSION && createOffenders.length === 0, 'the create manifest is the running version and holds only managed paths', createOffenders.join('\n'));
  // The default verify (the gate, one build, the bounded smoke) is what the team runs every day; --verify asks for --full.
  if (args.includes('--verify')) {
    const v = sh(pm, pm === 'npm' ? ['run', 'verify', '--', '--full'] : ['run', 'verify', '--full'], dir);
    const line = coverageOf(v.stdout);
    console.log(`     coverage (created, --full): ${line}`);
    check(v.status === 0 && /^coverage: full; browser ran; /.test(line) && /not run: none$/.test(line), `${pm} run verify --full passes in the new dashboard with nothing left unrun`, v.stdout + v.stderr);
  } else {
    const t0 = performance.now();
    const v = sh(pm, ['run', 'verify'], dir);
    const line = coverageOf(v.stdout);
    console.log(`     coverage (created, default, ${secs(performance.now() - t0)}s): ${line}`);
    check(v.status === 0 && /^coverage: default; /.test(line), `${pm} run verify passes in the new dashboard`, v.stdout + v.stderr);
  }
}

// The fixtures are whole installed projects, gigabytes each: they go whether the run passed or not, unless --keep asks to
// look inside them. The log above is the record of what failed.
console.log(failures ? `\nsmoke: ${failures} failed${keep ? ` (work kept in ${work})` : ''}` : '\nsmoke: the consumer path works');
if (!keep) fs.rmSync(work, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
