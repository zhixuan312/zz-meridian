/**
 * `zz-meridian adopt`: bring Meridian into an existing Next.js App Router project, in place, keeping its routes and
 * its data layer. Everything here is the settled part of the skill's Route A; rebuilding each page on Meridian's
 * components is the agent's work, and the printed next step hands it over.
 *
 * Nothing is written until every check has passed: a project already on Meridian (its manifest: update is the command),
 * a dirty tree, a project that is not Next.js with the App Router, or a file of the same name with other content stops
 * it before the first write.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  VERSION, brandArgs, effectiveBrand, inside, installArgs, installSkill, jsoncExtras, packageManager, payloadBytes, payloadFiles, readJsonc, readPayload, relativeImports, skillPaths,
  run, runTool, sha256, writeIn, writeManifest,
} from './files.js';
import { BRIEF_TEMPLATE, managedBlock, upsertManagedBlock } from './context.js';
import { FIXED, adoptSetOf, managedPaths, parseManifest } from './ownership.js';
import { MERIDIAN_SCRIPTS, TOOLCHAIN, needOf } from './reconcile.js';

export type AdoptOptions = { root: string; brand: Record<string, string>; allowDirty: boolean; install: boolean };

const major = (spec: string) => Number(/(\d+)/.exec(spec)?.[1] ?? NaN);
const TS = /\.(ts|tsx)$/;

/** A specifier inside a copied file, pinned to the exact module so a team file of a similar name can never win. */
function exactImports(rel: string, source: string, known: Set<string>): string {
  const pin = (spec: string) => {
    if (!spec.startsWith('.')) return spec;
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
    if (['.ts', '.tsx'].some((x) => known.has(base + x)) || /\.(ts|tsx|css|json)$/.test(spec)) return spec;
    if (['.ts', '.tsx'].some((x) => known.has(`${base}/index${x}`))) return spec === '.' ? './index' : `${spec.replace(/\/$/, '')}/index`;
    return spec;
  };
  return relativeImports(rel, source).replace(/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])([\w@./()[\]-]+)\2/g, (_m, lead: string, q: string, spec: string) => `${lead}${q}${pin(spec)}${q}`);
}

/** Every file under one folder of the project, as posix paths; none when the folder is absent. */
function listFiles(root: string, dir: string): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    if (!fs.existsSync(path.join(root, rel))) return;
    for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${rel}/${e.name}`);
      else if (e.isFile()) out.push(`${rel}/${e.name}`);
    }
  };
  walk(dir);
  return out;
}

function appDir(root: string): string | null {
  for (const d of ['app', 'src/app']) if (['tsx', 'jsx', 'ts', 'js'].some((x) => fs.existsSync(path.join(root, d, `layout.${x}`)))) return d;
  return null;
}

/** The static pages under the app folder, as routes: the first navigation, which the agent then edits. */
function routes(root: string, dir: string): string[] {
  const out: string[] = [];
  const walk = (abs: string, route: string[]) => {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name.startsWith('[') || e.name.startsWith('_') || e.name.startsWith('@') || e.name === 'api' || e.name === 'node_modules') continue;
        walk(path.join(abs, e.name), /^\(.*\)$/.test(e.name) ? route : [...route, e.name]);
      } else if (/^page\.(tsx|jsx|ts|js)$/.test(e.name)) out.push('/' + route.join('/'));
    }
  };
  walk(path.join(root, dir), []);
  // Only a plain path goes into generated code; anything else is left for the agent to add by hand.
  return [...new Set(out)].filter((r) => /^\/[\w/.-]*$/.test(r)).sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
}

const label = (route: string) => (route === '/' ? 'Home' : route.split('/').pop()!.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase()));

/**
 * The configuration `adopt` writes: the template's own file with the project's pages as its navigation. Everything that
 * belongs to the sample is left out, because the project does not have it: the feature table (so every item is `public`,
 * the honest default, until the fourth step of "Decide who may do what" in the Start guide points each at a feature of its own), every icon but the one the
 * items use, and the sample's workspaces with the field that names one. It throws when the template has no navigation
 * block to replace, since a configuration that still listed the sample's pages would be wrong without saying so.
 */
export function projectConfig(template: string, pages: string[]): string {
  if (!/export const nav: NavGroup\[\] = \[[\s\S]*?\n\];/.test(template)) throw new Error('the template\'s src/app.config.ts has no `export const nav: NavGroup[] = [ … ];` block to replace');
  const items = pages.map((r) => `      { href: ${JSON.stringify(r)}, label: ${JSON.stringify(label(r))}, icon: LayoutGrid, needs: 'public' },`).join('\n');
  return template
    .replace(/^import \{[\s\S]*?\} from 'lucide-react';/m, "import { LayoutGrid, type LucideIcon } from 'lucide-react';")
    // The template's own `FEATURES` import would name a file this project's `src/data/` need not have, and a nav item
    // without a `needs` is a type error since 0.13.0.
    .replace(/^import \{ FEATURES \} from '\.\/data\/features\.ts';\n/m, '')
    .replace(/\/\*\*(?:(?!\*\/)[\s\S])*\*\/\nexport const workspaces = \{[\s\S]*?\n\} as const;\nexport type WorkspaceId = [^\n]*\n\n/, '')
    .replace(' workspace?: WorkspaceId;', '')
    .replace(/export const nav: NavGroup\[\] = \[[\s\S]*?\n\];/, `/** Written by zz-meridian adopt from the project's pages: give each its own icon and group them. */\nexport const nav: NavGroup[] = [\n  {\n    items: [\n${items}\n    ],\n  },\n];`);
}

/**
 * `scripts/verify.config.ts` as a project gets it. The sample's persona rows are what used `EVERY_ROUTE` and `ROLE_ROUTES`,
 * so replacing the config object leaves them declared and never read — which the gate's own lint fails, in the project
 * adopt just wrote, 0.7 s after the other steps passed — and names the sample's routes in the team's file. Each goes
 * with its doc line. Exported so a test can hold the rewrite to that.
 */
export function verifyConfig(): string {
  return readPayload('scripts/verify.config.ts')
    .replace(/^\/\*\*[^\n]*\*\/\nconst (?:EVERY_ROUTE|ROLE_ROUTES) = \[[^\n]*\n\n?/gm, '')
    .replace(/const config: VerifyConfig = \{[\s\S]*?\n\};/, `const config: VerifyConfig = {
  // One detail page per state worth seeing (a normal record, a failed one, a missing one), with ids from your data.
  detailRoutes: [],
  // What a route a persona may not open draws: the product's choice in src/app.config.ts.
  refusal,
};`);
}

/** The template's stylesheet, with its paths made relative to where the project keeps its own. */
function globals(cssRel: string, dir: string): string {
  const from = path.posix.dirname(cssRel);
  const rel = (to: string) => { const r = path.posix.relative(from, to) || '.'; return r.startsWith('.') ? r : `./${r}`; };
  return readPayload('app/globals.css')
    .replace(/"\.\.\/src\/styles\/([^"]+)"/g, (_m, f: string) => `"${rel(`src/styles/${f}`)}"`)
    .replace(/@source "\.\.\/app";/, `@source "${rel(dir)}";`)
    .replace(/@source "\.\.\/src";/, `@source "${rel('src')}";`);
}

function vitestConfig(alias: string | null): string {
  const aliases = [`'@meridian': path.resolve(import.meta.dirname, 'src')`, ...(alias !== null ? [`'@': path.resolve(import.meta.dirname, ${JSON.stringify(alias)})`] : [])];
  return `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Written by zz-meridian adopt: the gate runs these tests; tests/setup.ts stands in for what jsdom lacks.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { ${aliases.join(', ')} } },
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], include: ['tests/**/*.test.{ts,tsx}'], passWithNoTests: true },
});
`;
}

/**
 * The ESLint configuration a project already has, or `null`. A flat `eslint.config.*` is what ESLint 9 reads; an
 * `.eslintrc.*` is the legacy form it no longer loads. A function rather than a block inside `adopt` because the
 * question is the project's alone — does it have one, and is it the form the installed ESLint reads — and a test can put
 * a file in a folder and ask it, where running the whole `adopt` would need the payload a checkout has only after a build.
 */
export function eslintConfigOf(root: string): { file: string; legacy: boolean } | null {
  const found = ['eslint.config.ts', 'eslint.config.mts', 'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs',
    '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc', '.eslintrc.yml', '.eslintrc.yaml']
    .find((f) => fs.existsSync(path.join(root, f)));
  return found ? { file: found, legacy: /^\.eslintrc/.test(found) } : null;
}

/**
 * What `adopt` writes for a team's `tsconfig.json`, and what it must say about it: the file Meridian's code needs (its
 * scripts import with `.ts` extensions, its code is ES2022, `@meridian/*` reaches its files), the team's own kept beside
 * it when it carries what `JSON.stringify` cannot hold, and what their `@/*` alias stands for. A function rather than a
 * block inside `adopt` so a test can hold it to those three: a test that ran the whole `adopt` would need the template
 * the payload carries, which a checkout has only after a build, and it would be testing the copy, not this decision.
 */
export function tsconfigWrites(tsPath: string): { writes: Map<string, string>; notes: string[]; atAlias: string | null } {
  const writes = new Map<string, string>();
  const notes: string[] = [];
  const ts = readJsonc(tsPath);
  ts.compilerOptions ??= {};
  ts.compilerOptions.allowImportingTsExtensions = true;
  ts.compilerOptions.noEmit = true;
  if (!/^es20(2[2-9]|[3-9]\d)|^esnext$/i.test(ts.compilerOptions.target ?? '')) {
    notes.push(`raised tsconfig target from ${ts.compilerOptions.target ?? 'its default'} to ES2022`);
    ts.compilerOptions.target = 'ES2022';
  }
  ts.compilerOptions.paths ??= {};
  ts.compilerOptions.paths['@meridian/*'] = ['./src/*'];
  const at = ts.compilerOptions.paths['@/*']?.[0];
  const atAlias = typeof at === 'string' ? at.replace(/\/\*$/, '').replace(/^\.\//, '') || '.' : null;
  // A tsconfig may carry comments and trailing commas, which `next dev` keeps (`comment-json`) and `JSON.stringify`
  // cannot hold. What the team wrote is kept beside the rewritten file, as the stylesheet and the postcss config are,
  // rather than dropped in silence — the note says so, and there is no backup to explain when there was nothing to lose.
  const was = fs.readFileSync(tsPath, 'utf8');
  writes.set('tsconfig.json', JSON.stringify(ts, null, 2) + '\n');
  if (jsoncExtras(was)) {
    writes.set('tsconfig.before.json', was);
    notes.push('tsconfig.json carried comments or trailing commas, which the rewritten file cannot: yours is tsconfig.before.json');
  }
  return { writes, notes, atAlias };
}

export function adopt(o: AdoptOptions): number {
  const { root } = o;
  const say = (s: string) => console.log(s);
  const pkgPath = path.join(root, 'package.json');

  // ── Checks: nothing is written until all of them pass ─────────────────────────────────────────────────
  if (!fs.existsSync(pkgPath)) return fail(`no package.json in ${root}: run adopt in the project's folder`);
  // A project adopt or create already set up holds Meridian's files as its manifest records them, and whatever the team
  // changed since; adopted again, every edited one would be listed as a conflict. Moving it to this release is update's.
  const manifestPath = path.join(root, '.meridian/manifest.json');
  if (fs.existsSync(manifestPath)) {
    let at = '';
    try { at = ` ${parseManifest(fs.readFileSync(manifestPath, 'utf8')).version}`; } catch { /* the version is only named */ }
    return fail(`this project is already on Meridian${at} (.meridian/manifest.json): run npx zz-meridian@latest update to move it to this release`);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const dir = appDir(root);
  if (!deps.next || !dir) {
    return fail(`this is not a Next.js App Router project (no "next" dependency, or no app/layout or src/app/layout).
Meridian's components are React; for another stack, read Route B or C in
https://github.com/zhixuan312/zz-meridian/blob/master/skills/zz-meridian/references/existing-project.md`);
  }
  if (!o.allowDirty) {
    const git = run('git', ['status', '--porcelain'], root, true);
    if (git.status !== 0) return fail('this folder is not a git repository, so the change could not be reviewed or undone as one diff. Commit it to git first, or pass --allow-dirty.');
    if (git.stdout.trim()) return fail('the git tree has uncommitted changes. Commit or stash them first, so adopt\'s change is one reviewable diff (or pass --allow-dirty).');
  }

  let brand: Record<string, string>;
  try { brand = effectiveBrand(o.brand); } catch (e) { return fail((e as Error).message); }

  const all = payloadFiles();
  const missing = FIXED.filter((f) => !all.includes(f));
  if (missing.length) return fail(`this package's template is missing files adopt needs, so nothing was written:\n${missing.map((m) => `  ${m}`).join('\n')}\nReinstall zz-meridian, or report this if it persists.`);
  const set = adoptSetOf(all);
  const known = new Set(set);
  const writes = new Map<string, string | Buffer>();
  const owned: string[] = [];
  const conflicts: string[] = [];
  const notes: string[] = [];
  const own = (rel: string, content: string | Buffer) => {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) {
      if (fs.readFileSync(abs).equals(Buffer.from(content))) { owned.push(rel); return; }
      conflicts.push(rel);
      return;
    }
    writes.set(rel, content);
    owned.push(rel);
  };

  for (const rel of set) {
    const raw = payloadBytes(rel);
    own(rel, TS.test(rel) ? exactImports(rel, raw.toString('utf8'), known) : raw);
  }
  let config: string;
  try { config = projectConfig(readPayload('src/app.config.ts'), routes(root, dir)); } catch (e) { return fail((e as Error).message); }
  own('src/app.config.ts', exactImports('src/app.config.ts', config, known));
  own('scripts/verify.config.ts', verifyConfig());
  // Meridian's scripts are ES modules; a project whose package.json is not "type": "module" gets that for scripts/ only.
  if (pkg.type !== 'module') own('scripts/package.json', '{\n  "type": "module"\n}\n');

  // The agent skill is copied in at the end, after every other write. Checking it here is what stops `adopt` replacing a
  // team's own edited copy of it: the skill was written unconditionally, so an edited `SKILL.md` in the project was lost
  // without a word and the command still exited 0. It is checked against the same rule as every other file.
  for (const { rel, payload } of skillPaths()) {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs) && !fs.readFileSync(abs).equals(Buffer.from(payloadBytes(payload)))) conflicts.push(rel);
  }

  if (conflicts.length) {
    return fail(`these files already exist with other content, so nothing was written:\n${conflicts.map((c) => `  ${c}`).join('\n')}
Rename or move them, then run adopt again.`);
  }

  // ── Merged files: the project's own, changed only where Meridian needs it ────────────────────────────
  const tpl = JSON.parse(readPayload('package.json'));
  const merge = (field: 'dependencies' | 'devDependencies', names: string[]) => {
    pkg[field] ??= {};
    for (const n of names) {
      const want = tpl.dependencies?.[n] ?? tpl.devDependencies?.[n];
      if (!want) continue;
      const have = pkg.dependencies?.[n] ?? pkg.devDependencies?.[n];
      if (!have) { pkg[field][n] = want; continue; }
      if (major(have) < major(want)) {
        const at = pkg.dependencies?.[n] ? 'dependencies' : 'devDependencies';
        pkg[at][n] = want;
        notes.push(`raised ${n} from ${have} to ${want} (Meridian needs the newer major; read its upgrade guide)`);
      }
    }
  };
  // The packages the adopted modules import, and the framework: the rule `update` applies to a created project.
  const sources = new Map(set.filter((rel) => TS.test(rel)).map((rel) => [rel, payloadBytes(rel).toString('utf8')]));
  sources.set('src/app.config.ts', config);
  merge('dependencies', needOf(tpl, sources).runtime);
  merge('devDependencies', TOOLCHAIN);
  pkg.scripts ??= {};
  for (const s of MERIDIAN_SCRIPTS) {
    const want = tpl.scripts[s];
    if (!pkg.scripts[s]) pkg.scripts[s] = want;
    else if (pkg.scripts[s] !== want) notes.push(`kept your "${s}" script; Meridian's is "${want}"`);
  }
  writes.set('package.json', JSON.stringify(pkg, null, 2) + '\n');

  // tsconfig: Meridian's scripts import with .ts extensions, and its code needs ES2022; @meridian/* reaches its files.
  const tsPath = path.join(root, 'tsconfig.json');
  let atAlias: string | null = null;
  if (fs.existsSync(tsPath)) {
    const ts = tsconfigWrites(tsPath);
    for (const [f, text] of ts.writes) writes.set(f, text);
    notes.push(...ts.notes);
    atAlias = ts.atAlias;
  } else {
    return fail('no tsconfig.json: Meridian is TypeScript. Add one (next dev writes it), then run adopt again.');
  }

  // The global stylesheet: Meridian's, at the place the root layout already imports; theirs kept beside it to port from.
  const layout = ['tsx', 'jsx', 'ts', 'js'].map((x) => `${dir}/layout.${x}`).find((f) => fs.existsSync(path.join(root, f)))!;
  const layoutSrc = fs.readFileSync(path.join(root, layout), 'utf8');
  const cssImport = /import\s+['"](\.{1,2}\/[^'"]+\.css)['"]/.exec(layoutSrc)?.[1];
  const cssRel = cssImport ? path.posix.normalize(path.posix.join(path.posix.dirname(layout), cssImport)) : `${dir}/globals.css`;
  const cssAbs = path.join(root, cssRel);
  if (fs.existsSync(cssAbs)) {
    const before = cssRel.replace(/\.css$/, '.before.css');
    writes.set(before, fs.readFileSync(cssAbs));
    notes.push(`your stylesheet is now Meridian's; the old one is ${before}, to port anything still needed from it as tokens`);
  }
  writes.set(cssRel, globals(cssRel, dir));
  if (!cssImport) {
    writes.set(layout, `import './globals.css';\n${layoutSrc}`);
    notes.push(`${layout} now imports ./globals.css`);
  }

  const postcss = ['postcss.config.mjs', 'postcss.config.js', 'postcss.config.cjs'].find((f) => fs.existsSync(path.join(root, f)));
  if (!postcss) writes.set('postcss.config.mjs', readPayload('postcss.config.mjs'));
  else if (!fs.readFileSync(path.join(root, postcss), 'utf8').includes('@tailwindcss/postcss')) {
    writes.set(postcss.replace(/(\.[cm]?js)$/, '.before$1'), fs.readFileSync(path.join(root, postcss)));
    writes.set(postcss, readPayload('postcss.config.mjs'));
    notes.push(`${postcss} now runs Tailwind v4; the old one is kept beside it`);
  }

  if (!['ts', 'mts', 'js', 'mjs'].some((x) => fs.existsSync(path.join(root, `vitest.config.${x}`)))) writes.set('vitest.config.ts', vitestConfig(atAlias));
  else notes.push('kept your vitest config: add tests/setup.ts to its setupFiles and passWithNoTests for the gate');

  // The gate's lint step runs `eslint .`, and a project with no configuration fails it 0.7 s in with ESLint's own message
  // about a missing file — which says nothing about Meridian. Measured on a project created by create-next-app with
  // --no-eslint and then adopted: every other gate step passed and the lint was the only red.
  const eslint = eslintConfigOf(root);
  if (!eslint) {
    writes.set('eslint.config.ts', readPayload('eslint.config.ts'));
    notes.push('added eslint.config.ts: the gate runs the lint, and this project had no ESLint configuration');
  } else if (eslint.legacy) {
    notes.push(`kept ${eslint.file}, which ESLint 9 no longer reads: the gate's lint fails until it becomes an eslint.config.mjs`);
  }

  if (!fs.readdirSync(path.join(root, dir)).some((f) => /^(icon|favicon)\./.test(f))) writes.set(`${dir}/icon.ts`, exactImports(`${dir}/icon.ts`, readPayload('app/icon.ts'), known));

  const ignore = path.join(root, '.gitignore');
  const ignored = fs.existsSync(ignore) ? fs.readFileSync(ignore, 'utf8') : '';
  // verify's report and screenshots, and an update in progress: Meridian's own, never the team's to commit. The manifest,
  // keep.json and history/ are committed, since the next update reads them.
  const bare = (l: string) => l.trim().replace(/^\//, '').replace(/\/$/, '');
  const unignored = ['/out/', '/.meridian/update/', '/.meridian/update.lock'].filter((l) => !ignored.split('\n').some((x) => bare(x) === bare(l)));
  if (unignored.length) writes.set('.gitignore', `${ignored.trimEnd()}\n\n# zz-meridian: verify's report and an update in progress\n${unignored.join('\n')}\n`);

  // ── Write: every target checked first, so a bad one stops it before anything changes ─────────────────
  try { for (const rel of writes.keys()) inside(root, rel); } catch (e) { return fail((e as Error).message); }
  for (const [rel, content] of writes) writeIn(root, rel, content);

  const name = brand.name ?? String(pkg.name ?? path.basename(root)).replace(/^@[^/]+\//, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  brand = effectiveBrand({ ...brand, name });
  // The brand outputs this run creates under tokens/ and src/styles/ (absent before it) are Meridian's, so the manifest records them.
  const brandDirs = () => ['tokens', 'src/styles'].flatMap((d) => listFiles(root, d));
  const existed = new Set(brandDirs());
  const b = run(process.execPath, ['scripts/brand.ts', ...brandArgs(brand), '--existing'], root);
  if (b.status !== 0) {
    // From a clean tree, git takes back exactly what adopt wrote; with --allow-dirty it would take the team's changes too.
    const back = o.allowDirty ? 'remove what adopt wrote (git status shows it beside your own changes)' : 'put the tree back (git restore . && git clean -fd removes only what adopt wrote, since it started clean)';
    return fail(`scripts/brand.ts failed (above) after the files were copied, and the manifest and agent files are not written. Fix the cause, ${back}, and run zz-meridian adopt again with the same flags`);
  }

  // The project's own AGENTS.md keeps every byte and gains the managed block; the brief is the team's, written only when absent.
  // Neither is a Meridian file, so neither is recorded in the manifest.
  const pm = packageManager(root);
  const agentsAbs = path.join(root, 'AGENTS.md');
  try {
    const text = fs.existsSync(agentsAbs) ? fs.readFileSync(agentsAbs, 'utf8') : '';
    writeIn(root, 'AGENTS.md', upsertManagedBlock(text, managedBlock(VERSION, pm)));
  } catch (e) { return fail(`AGENTS.md: ${(e as Error).message} The files are copied; fix AGENTS.md by hand, then add the managed block.`); }
  const briefWritten = !fs.existsSync(path.join(root, 'docs/brief.md'));
  if (briefWritten) writeIn(root, 'docs/brief.md', BRIEF_TEMPLATE);

  const generated = brandDirs().filter((f) => !existed.has(f));
  if (owned.includes('scripts/package.json')) generated.push('scripts/package.json');
  const managed = managedPaths(all, 'adopt', generated);
  const files: Record<string, string> = {};
  for (const rel of [...owned, ...generated]) if (managed.has(rel)) files[rel] = sha256(fs.readFileSync(inside(root, rel)));
  installSkill(root, files);
  writeManifest(root, { version: VERSION, route: 'adopt', brand, files });

  // ── Install and prove it compiles ─────────────────────────────────────────────────────────────────────
  let typed = 'not run (--no-install)';
  if (o.install) {
    say(`\nInstalling with ${pm}…`);
    if (run(pm, installArgs(pm), root).status !== 0) return fail(`${pm} install failed (above). Fix it, then run ${pm} install and ${pm} run typecheck.`);
    // Route types first (LayoutProps, PageProps), as the gate does.
    runTool(root, 'next/dist/bin/next', ['typegen']);
    const tsc = runTool(root, 'typescript/bin/tsc', ['--noEmit']);
    typed = tsc.status === 0 ? 'passes' : `fails:\n${(tsc.stdout + tsc.stderr).trim().split('\n').slice(0, 30).join('\n')}`;
  }

  say(`
Meridian ${VERSION} is in ${root}.
  copied: ${owned.length} files (recorded in .meridian/manifest.json)
  skill: .agents/skills/zz-meridian (Codex) and .claude/skills/zz-meridian (Claude Code)
  agent context: AGENTS.md has the managed block; docs/brief.md ${briefWritten ? 'is the empty brief to fill in' : 'was kept as it is'}
  types: ${typed}${notes.length ? `\n  notes:\n${notes.map((n) => `    - ${n}`).join('\n')}` : ''}

Next: follow .agents/skills/zz-meridian/references/existing-project.md, Route A, from step 2 (step 1 was this), to the
standard in references/standard.md. The
template to read from is https://github.com/zhixuan312/zz-meridian/tree/v${VERSION}. Import Meridian's components as
'@meridian/components/…'. Before the first ${pm} run verify, read step 5: verify presses every control, Delete included.`);
  return 0;
}

function fail(msg: string): number {
  console.error(`zz-meridian adopt: ${msg}`);
  return 1;
}
