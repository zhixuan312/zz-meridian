// @vitest-environment node
// Named cli-* so the payload leaves it out: it copies the template's own tracked files.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-rules-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
for (const f of execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((x) => x && !x.startsWith('cli/'))) {
  const src = path.join(ROOT, f);
  if (!fs.lstatSync(src, { throwIfNoEntry: false })?.isFile()) continue;
  fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
  fs.copyFileSync(src, path.join(dir, f));
}
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
const put = (f: string, text: string) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), text); };
const remove = (...files: string[]) => { for (const f of files) fs.rmSync(path.join(dir, f), { force: true }); };
/** Put the repository's own copy of a file back, or remove it when the repository has none. */
const restore = (f: string) => {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) put(f, fs.readFileSync(src, 'utf8'));
  else remove(f);
};
/** Add a statement to the end of a copy, so a planted import lands in a file with the same name and the same line count. */
const append = (f: string, text: string) => {
  const base = fs.readFileSync(path.join(dir, f), 'utf8');
  put(f, `${base}${base.endsWith('\n') ? '' : '\n'}${text}\n`);
};
const runCheck = () => spawnSync(process.execPath, ['scripts/check.ts'], { cwd: dir, encoding: 'utf8' });
const check = () => runCheck().stdout;
const rogue = () => {
  put('src/views/rogue.tsx', "import { DEMO_NOW } from '@/system/fixtures/sample';\nimport { ALERTS } from '../system/fixtures/sample-ops';\nexport const Rogue = [DEMO_NOW, ALERTS];\n");
  put('app/(dashboard)/rogue/page.tsx', "import { connection } from 'next/server';\nexport default async function Rogue() { await connection(); return null; }\n");
  put('app/(dashboard)/rogue/actions.ts', "'use server';\nimport { revalidateTag } from 'next/cache';\nexport async function stale() { revalidateTag('collection:x', 'max'); }\n");
};
/** The template's own `src/app.config.ts`, with the Home item's need replaced (or dropped) to plant a nav case. */
const plantNav = (needs: string | null) => {
  const base = fs.readFileSync(path.join(ROOT, 'src/app.config.ts'), 'utf8');
  const at = 'needs: FEATURES.home.needs';
  put('src/app.config.ts', needs === null ? base.replace(`, ${at}`, '') : base.replace(at, `needs: ${needs}`));
};
const restoreAppConfig = () => put('src/app.config.ts', fs.readFileSync(path.join(ROOT, 'src/app.config.ts'), 'utf8'));

describe("the template's own rules", () => {
  it('pass on the template as it is', () => expect(check()).toMatch(/^0 problems/m), 60_000);
  it('catch a direct fixture import, by alias and by relative path, a stray connection() and a stale writer', () => {
    rogue();
    const out = check();
    expect(out).toMatch(/src\/views\/rogue\.tsx:1: .*src\/system\/fixtures/);
    expect(out).toMatch(/src\/views\/rogue\.tsx:2: .*src\/system\/fixtures/);
    expect(out).toMatch(/app\/\(dashboard\)\/rogue\/page\.tsx:\d+: connection\(\)/);
    expect(out).toMatch(/app\/\(dashboard\)\/rogue\/actions\.ts:\d+: revalidates with 'max' on a writer path/);
    remove('src/views/rogue.tsx', 'app/(dashboard)/rogue/page.tsx', 'app/(dashboard)/rogue/actions.ts');
  }, 60_000);
  it('catch a literal colour in every form a browser takes, and leave a tint composed from tokens alone', () => {
    put('src/views/paint.tsx', [
      "export const Paint = () => (",
      "  <>",
      "    <p style={{ color: '#0a58caFF' }}>eight digits</p>",
      "    <p style={{ color: '#0a5F' }}>four digits</p>",
      "    <p style={{ color: 'oklch(0.62 0.19 259)' }}>a function</p>",
      "    <p style={{ color: 'lab(50% 40 59)' }}>another</p>",
      "    <p style={{ color: 'color(display-p3 0.1 0.4 0.8)' }}>and another</p>",
      "    <p style={{ color: 'color-mix(in oklch, var(--ink) 40%, transparent)' }}>not a literal: the layers compose tints this way</p>",
      "  </>",
      ");",
    ].join('\n') + '\n');
    const out = check();
    for (const [line, what] of [[3, '#0a58caFF'], [4, '#0a5F'], [5, 'oklch('], [6, 'lab('], [7, 'color(']] as const) {
      expect(out, `${what} on line ${line}`).toMatch(new RegExp(`src/views/paint\\.tsx:${line}: literal colour ${what.replace(/[()#]/g, (m) => `\\${m}`)}`));
    }
    expect(out).not.toMatch(/src\/views\/paint\.tsx:8:/);
    remove('src/views/paint.tsx');
  }, 60_000);
  it('allow one protagonist a page, in the template and in a product', () => {
    const featured = "<FeaturedMetric kicker=\"A\" value={1} />";
    put('src/views/two.tsx', `import { FeaturedMetric } from '@/components/patterns/featured-metric';\nexport const Two = () => (\n  <>\n    ${featured}\n    ${featured}\n  </>\n);\n`);
    expect(check()).toMatch(/src\/views\/two\.tsx:5: a second FeaturedMetric \(the first is at line 4\)/);
    remove('src/views/two.tsx');
  }, 60_000);
  it('send a nav item with no need, a bad grant or an allOf the shape it cannot read to the gate, naming its href', () => {
    plantNav(null);
    expect(check()).toMatch(/src\/app\.config\.ts: nav item \/ has no needs/);
    plantNav("'keys:manage'");
    expect(check()).toMatch(/src\/app\.config\.ts: nav item \/ names "keys:manage", which is not a grant/);
    plantNav('{ allOf: [] }');
    expect(check()).toMatch(/src\/app\.config\.ts: nav item \/ has an empty allOf/);
    plantNav("{ allOf: [{ allOf: ['keys:read'] }] }");
    expect(check()).toMatch(/src\/app\.config\.ts: nav item \/ names \{"allOf":\["keys:read"\]\} in its allOf, which is not a grant/);
    // Not one of the template's alone: a product's own src/app.config.ts is checked too.
    put('.meridian/manifest.json', JSON.stringify({ version: '0.5.0', route: 'create', brand: { name: 'Acme' }, files: {} }));
    expect(check()).toMatch(/src\/app\.config\.ts: nav item \/ names \{"allOf":\["keys:read"\]\} in its allOf/);
    remove('.meridian/manifest.json');
    restoreAppConfig();
    expect(check()).not.toMatch(/src\/app\.config\.ts: nav item/);
  }, 60_000);
  it('stay out of a product, whose pages are its own', () => {
    rogue();
    expect(check()).toMatch(/reads src\/system\/fixtures directly/);
    put('.meridian/manifest.json', JSON.stringify({ version: '0.5.0', route: 'create', brand: { name: 'Acme' }, files: {} }));
    const out = check();
    expect(out).toMatch(/problems ·/);
    expect(out).not.toMatch(/reads src\/system\/fixtures directly|connection\(\) outside the template|revalidates with 'max'/);
    remove('.meridian/manifest.json', 'src/views/rogue.tsx', 'app/(dashboard)/rogue/page.tsx', 'app/(dashboard)/rogue/actions.ts');
  }, 60_000);
});

describe('the four-layer rules', () => {
  const switchFile = 'scripts/check.local.ts';
  /** The three planted violations, in existing files so the copy's own counts and every other rule stay as they were. */
  const plantDataRule = () => append('src/data/usage.ts', "import { ALERTS } from '@/logic/alerts';\nvoid ALERTS;");
  const plantLogicRule = () => append('src/logic/alerts.ts', "import { WorkspaceRail } from '@/views/workspace-chrome';\nvoid WorkspaceRail;");
  const plantViewRule = () => put('src/views/standalone.tsx', 'export const helper = () => 1;\n');
  const restorePlants = () => {
    restore('src/data/usage.ts');
    restore('src/logic/alerts.ts');
    restore('src/views/standalone.tsx');
  };

  it('refuse a data module that imports the logic layer or a view, by alias and by relative path', () => {
    put('src/data/planted.ts', [
      "import { ALERTS } from '@/logic/alerts';",
      "import { summarise } from '../logic/summarise';",
      "import { WORKSPACE_IDS } from '@/views/workspaces';",
      'void ALERTS; void summarise; void WORKSPACE_IDS;',
    ].join('\n') + '\n');
    const r = runCheck();
    expect(r.stdout).toMatch(/src\/data\/planted\.ts:1: imports @\/logic\/alerts from src\/logic\/alerts; the data layer imports neither/);
    expect(r.stdout).toMatch(/src\/data\/planted\.ts:2: imports \.\.\/logic\/summarise from src\/logic\/summarise/);
    expect(r.stdout).toMatch(/src\/data\/planted\.ts:3: imports @\/views\/workspaces from src\/views\/workspaces/);
    expect(r.status).toBe(1);
    remove('src/data/planted.ts');
  }, 60_000);

  it('refuse a logic module that imports a view, by alias and by relative path', () => {
    put('src/logic/planted.ts', [
      "import { WorkspaceRail } from '@/views/workspace-chrome';",
      "import { Standalone } from '../views/standalone';",
      'void WorkspaceRail; void Standalone;',
    ].join('\n') + '\n');
    const r = runCheck();
    expect(r.stdout).toMatch(/src\/logic\/planted\.ts:1: imports @\/views\/workspace-chrome from src\/views\/workspace-chrome; the logic layer imports no view/);
    expect(r.stdout).toMatch(/src\/logic\/planted\.ts:2: imports \.\.\/views\/standalone from src\/views\/standalone/);
    expect(r.status).toBe(1);
    remove('src/logic/planted.ts');
  }, 60_000);

  it('refuse a file under src/views that is not a renderer, and allow workspaces.ts and a capitalised component', () => {
    // The fixture is camelCase on purpose: a kebab-case `src/views/<name>.ts` token is the shape
    // tests/moved-paths-documented.test.ts reads as a module that has moved to src/logic, and this
    // file exists only inside the copy, for the length of this test.
    put('src/views/helperFn.ts', 'export const helper = () => 1;\n');
    put('src/views/plain.tsx', 'export const helper = () => 1;\n');
    put('src/views/Good.tsx', 'export function Good() { return null; }\n');
    const r = runCheck();
    expect(r.stdout).toMatch(/src\/views\/helperFn\.ts: is not a renderer/);
    expect(r.stdout).toMatch(/src\/views\/plain\.tsx: is not a renderer/);
    expect(r.stdout).not.toMatch(/src\/views\/Good\.tsx: is not a renderer/);
    expect(r.stdout).not.toMatch(/src\/views\/workspaces\.ts: is not a renderer/);
    expect(r.status).toBe(1);
    remove('src/views/helperFn.ts', 'src/views/plain.tsx', 'src/views/Good.tsx');
  }, 60_000);

  it('print a stated escape with its reason, and still pass', () => {
    const f = 'src/data/usage.ts';
    const base = fs.readFileSync(path.join(dir, f), 'utf8');
    const marker = "import { ALERTS } from '@/logic/alerts'; // allow-data-imports-neither: the sample reads alerts beside usage on purpose";
    append(f, marker);
    const line = base.split('\n').length + (base.endsWith('\n') ? 0 : 1);
    const r = runCheck();
    const escape = `escape  src/data/usage.ts:${line}: data-imports-neither — the sample reads alerts beside usage on purpose`;
    expect(r.stdout).toContain(escape);
    expect(r.stdout).toMatch(/^0 problems/m);
    expect(r.status).toBe(0);
    // Printed as its own line after the problem list and before the summary, which it does not change.
    const lines = r.stdout.trimEnd().split('\n');
    expect(lines.indexOf(escape)).toBeGreaterThan(lines.indexOf('check: ok'));
    expect(lines.indexOf(escape)).toBeLessThan(lines.findIndex((l) => /^\d+ problems · /.test(l)));
    restore(f);
  }, 60_000);

  it('say nothing at all when the project has no switches file, though src/logic is there', () => {
    remove(switchFile);
    plantDataRule();
    plantLogicRule();
    plantViewRule();
    const r = runCheck();
    expect(r.stdout).not.toMatch(/the data layer imports neither|the logic layer imports no view|is not a renderer/);
    expect(r.stdout).not.toMatch(/fourLayers is declared/);
    expect(r.status).toBe(0);
    // The folder exists, so its existence cannot be what turns the rules on.
    expect(fs.existsSync(path.join(dir, 'src/logic'))).toBe(true);
    restorePlants();
    restore(switchFile);
  }, 60_000);

  it('leave the rules off and print one note when the switch is not a boolean', () => {
    put(switchFile, "export const fourLayers = 'yes';\n");
    const before = runCheck();
    expect(before.status).toBe(0);
    const summary = before.stdout.split('\n').find((l) => /^\d+ problems · /.test(l));
    plantDataRule();
    plantLogicRule();
    plantViewRule();
    const after = runCheck();
    expect(after.stdout).not.toMatch(/the data layer imports neither|the logic layer imports no view|is not a renderer/);
    const lines = after.stdout.trimEnd().split('\n');
    const notes = lines.filter((l) => l.startsWith('note  '));
    expect(notes).toEqual([`note  ${switchFile}: fourLayers is declared but not as true or false — the four-layer rules are off`]);
    expect(lines.indexOf(notes[0])).toBeLessThan(lines.findIndex((l) => /^\d+ problems · /.test(l)));
    expect(lines.find((l) => /^\d+ problems · /.test(l))).toBe(summary);
    expect(after.status).toBe(before.status);
    restorePlants();
    restore(switchFile);
  }, 60_000);

  it('stay silent when a comment says fourLayers = true but the declaration says false', () => {
    put(switchFile, "// fourLayers = true\nexport const fourLayers = false;\n");
    plantDataRule();
    plantLogicRule();
    plantViewRule();
    const r = runCheck();
    expect(r.stdout).not.toMatch(/the data layer imports neither|the logic layer imports no view|is not a renderer/);
    expect(r.stdout).not.toMatch(/fourLayers is declared/);
    expect(r.status).toBe(0);
    restorePlants();
    restore(switchFile);
  }, 60_000);
});
