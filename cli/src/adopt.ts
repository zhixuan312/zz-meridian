/**
 * `zz-meridian adopt`: bring Meridian into an existing Next.js App Router project, in place, keeping its routes and
 * its data layer. Everything here is the settled part of the skill's Route A; rebuilding each page on Meridian's
 * components is the agent's work, and the printed next step hands it over.
 *
 * Nothing is written until every check has passed: a dirty tree, a project that is not Next.js with the App Router,
 * or a file of the same name with other content stops it before the first write.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  VERSION, brandArgs, effectiveBrand, inside, installSkill, packageManager, payloadBytes, payloadFiles, readJsonc, readPayload, relativeImports,
  run, runTool, sha256, writeIn, writeManifest,
} from './files.js';
import { BRIEF_TEMPLATE, managedBlock, upsertManagedBlock } from './context.js';
import { FIXED, adoptSetOf, managedPaths } from './ownership.js';

export type AdoptOptions = { root: string; brand: Record<string, string>; allowDirty: boolean; install: boolean };

/** The template's dependencies a dashboard built from these files needs. */
const DEPS = ['next', 'react', 'react-dom', 'radix-ui', 'lucide-react', 'clsx', 'tailwind-merge', 'react-markdown', 'remark-gfm', 'ai', '@ai-sdk/react', 'zod'];
const DEV_DEPS = ['typescript', '@types/node', '@types/react', '@types/react-dom', 'tailwindcss', '@tailwindcss/postcss', 'eslint', 'eslint-config-next', 'vitest', '@vitejs/plugin-react', 'jsdom', '@testing-library/react', '@testing-library/jest-dom'];
const SCRIPTS = ['typecheck', 'test', 'tokens', 'check', 'contrast', 'gate', 'audit', 'verify', 'brand', 'shot', 'interactions', 'keyboard', 'vitals'];

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

function appConfig(pages: string[]): string {
  const template = readPayload('src/app.config.ts');
  const items = pages.map((r) => `      { href: ${JSON.stringify(r)}, label: ${JSON.stringify(label(r))}, icon: LayoutGrid },`).join('\n');
  return template
    .replace(/^import \{[\s\S]*?\} from 'lucide-react';/m, "import { LayoutGrid, type LucideIcon } from 'lucide-react';")
    .replace(/export const nav: NavGroup\[\] = \[[\s\S]*?\n\];/, `/** Written by zz-meridian adopt from the project's pages: give each its own icon and group them. */\nexport const nav: NavGroup[] = [\n  {\n    items: [\n${items}\n    ],\n  },\n];`);
}

function verifyConfig(): string {
  return readPayload('scripts/verify.config.ts').replace(/const config: VerifyConfig = \{[\s\S]*?\n\};/, `const config: VerifyConfig = {
  // One detail page per state worth seeing (a normal record, a failed one, a missing one), with ids from your data.
  detailRoutes: [],
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

export function adopt(o: AdoptOptions): number {
  const { root } = o;
  const say = (s: string) => console.log(s);
  const pkgPath = path.join(root, 'package.json');

  // ── Checks: nothing is written until all of them pass ─────────────────────────────────────────────────
  if (!fs.existsSync(pkgPath)) return fail(`no package.json in ${root}: run adopt in the project's folder`);
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
  own('src/app.config.ts', exactImports('src/app.config.ts', appConfig(routes(root, dir)), known));
  own('scripts/verify.config.ts', verifyConfig());
  // Meridian's scripts are ES modules; a project whose package.json is not "type": "module" gets that for scripts/ only.
  if (pkg.type !== 'module') own('scripts/package.json', '{\n  "type": "module"\n}\n');

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
  merge('dependencies', DEPS);
  merge('devDependencies', DEV_DEPS);
  pkg.scripts ??= {};
  for (const s of SCRIPTS) {
    const want = tpl.scripts[s];
    if (!pkg.scripts[s]) pkg.scripts[s] = want;
    else if (pkg.scripts[s] !== want) notes.push(`kept your "${s}" script; Meridian's is "${want}"`);
  }
  writes.set('package.json', JSON.stringify(pkg, null, 2) + '\n');

  // tsconfig: Meridian's scripts import with .ts extensions, and its code needs ES2022; @meridian/* reaches its files.
  const tsPath = path.join(root, 'tsconfig.json');
  let atAlias: string | null = null;
  if (fs.existsSync(tsPath)) {
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
    if (typeof at === 'string') atAlias = at.replace(/\/\*$/, '').replace(/^\.\//, '') || '.';
    writes.set('tsconfig.json', JSON.stringify(ts, null, 2) + '\n');
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
  if (b.status !== 0) return fail('scripts/brand.ts failed (above); the files are copied, so fix the cause and run it again with the same flags');

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
    if (run(pm, ['install'], root).status !== 0) return fail(`${pm} install failed (above). Fix it, then run ${pm} install and ${pm} run typecheck.`);
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

Next: follow .agents/skills/zz-meridian/references/existing-project.md, Route A, from step 2 (step 1 was this). The
template to read from is https://github.com/zhixuan312/zz-meridian/tree/v${VERSION}. Import Meridian's components as
'@meridian/components/…'. Before the first ${pm} run verify, read step 5: verify presses every control, Delete included.`);
  return 0;
}

function fail(msg: string): number {
  console.error(`zz-meridian adopt: ${msg}`);
  return 1;
}
