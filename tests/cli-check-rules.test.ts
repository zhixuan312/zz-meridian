// @vitest-environment node
// Named cli-* so the payload leaves it out: it copies the template's own tracked files.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { templateCopy } from './cli-template-copy';

const ROOT = path.resolve(import.meta.dirname, '..');
const dir = templateCopy('zz-rules-');
/** Every path a batch planted or removed, put back before and after each batch, so one red leaves the next batch the template's copy. */
const touched = new Set<string>();
const put = (f: string, text: string) => { touched.add(f); fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), text); };
const remove = (...files: string[]) => { for (const f of files) { touched.add(f); fs.rmSync(path.join(dir, f), { force: true }); } };
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
const rogue = () => {
  put('src/views/rogue.tsx', "import { DEMO_NOW } from '@/system/fixtures/sample';\nimport { ALERTS } from '../system/fixtures/sample-ops';\nexport const Rogue = [DEMO_NOW, ALERTS];\n");
  put('app/(dashboard)/rogue/page.tsx', "import { connection } from 'next/server';\nexport default async function Rogue() { await connection(); return null; }\n");
  put('app/(dashboard)/rogue/actions.ts', "'use server';\nimport { revalidateTag } from 'next/cache';\nexport async function stale() { revalidateTag('collection:x', 'max'); }\n");
};
/** Replace one nav item's need in the copy's `src/app.config.ts`, or drop it, to plant a nav case naming that href. */
const plantNav = (href: string, needs: string | null) => {
  const file = 'src/app.config.ts';
  const lines = fs.readFileSync(path.join(dir, file), 'utf8').split('\n');
  const at = lines.findIndex((l) => l.includes(`href: '${href}'`) && / needs: /.test(l));
  if (at < 0) throw new Error(`src/app.config.ts has no nav item ${href}`);
  lines[at] = needs === null ? lines[at].replace(/, needs: FEATURES\.\w+\.needs/, '') : lines[at].replace(/needs: FEATURES\.\w+\.needs/, `needs: ${needs}`);
  put(file, lines.join('\n'));
};
/** The three planted violations, in existing files so the copy's own counts and every other rule stay as they were. */
const plantDataRule = () => append('src/data/usage.ts', "import { ALERTS } from '@/logic/alerts';\nvoid ALERTS;");
const plantLogicRule = () => append('src/logic/alerts.ts', "import { WorkspaceRail } from '@/views/workspace-chrome';\nvoid WorkspaceRail;");
const plantViewRule = () => put('src/views/standalone.tsx', 'export const helper = () => 1;\n');

/** The switch declared, but not as a boolean. */
const plantNonBooleanSwitch = () => put('scripts/check.local.ts', "export const fourLayers = 'yes';\n");

/**
 * The states of the copy the cases below read. Every plant a case asserts and that no other case's plant can change is
 * made once, in one state, and one run of the gate prints all of them: the gate is expensive (it reads the whole tree),
 * a rule's own text is what proves it fires, and a run that plants four defects at once proves four rules rather than
 * one. A state that conflicts with another (a switch removed or not a boolean) keeps its own run.
 */
const BATCHES = {
  /** The template as it is. */
  clean: () => {},
  /** Every independent planted defect, each on its own file or its own nav item. */
  defects: () => {
    rogue();
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
    put('src/views/two.tsx', `import { FeaturedMetric } from '@/components/patterns/featured-metric';\nexport const Two = () => (\n  <>\n    <FeaturedMetric kicker="A" value={1} />\n    <FeaturedMetric kicker="A" value={1} />\n  </>\n);\n`);
    // A nav need of each shape the rail cannot read, each on an item of its own, so one run shows every shape.
    plantNav('/', null);
    plantNav('/members', "'keys:manage'");
    plantNav('/settings', '{ allOf: [] }');
    plantNav('/business', "{ allOf: [{ allOf: ['keys:read'] }] }");
    // The four layers: a data module importing logic and a view, a logic module importing a view, and files under
    // src/views that are not renderers.
    put('src/data/planted.ts', [
      "import { ALERTS } from '@/logic/alerts';",
      "import { summarise } from '../logic/summarise';",
      "import { WORKSPACE_IDS } from '@/views/workspaces';",
      'void ALERTS; void summarise; void WORKSPACE_IDS;',
    ].join('\n') + '\n');
    put('src/logic/planted.ts', [
      "import { WorkspaceRail } from '@/views/workspace-chrome';",
      "import { Standalone } from '../views/standalone';",
      'void WorkspaceRail; void Standalone;',
    ].join('\n') + '\n');
    put('src/views/helperFn.ts', 'export const helper = () => 1;\n');
    put('src/views/plain.tsx', 'export const helper = () => 1;\n');
    put('src/views/Good.tsx', 'export function Good() { return null; }\n');
    // A client module that imports a logic module whose imports reach a reading module, by alias and by relative path,
    // and a third import of it with the stated escape: the escape prints and only its line is not refused.
    const alias = "import { ALERTS } from '@/logic/alerts';";
    const relative = "import { ALERTS as AGAIN } from '../logic/alerts';";
    put('src/views/planted-client.tsx', [
      "'use client';",
      alias,
      relative,
      `${relative.replace('ALERTS as AGAIN', 'ALERTS as THIRD')} // allow-client-does-not-import-a-reading-module: the sample reads alerts beside usage on purpose`,
      'void ALERTS; void AGAIN; void THIRD;',
      'export function Planted() { return null; }',
    ].join('\n') + '\n');
    // Presentation does not read: a view and a client component taking a value from a data module, and the five
    // vocabulary modules staying silent.
    put('src/views/planted-read.tsx', ["import { readServices } from '@/data/metrics';", 'void readServices;', 'export function PlantedRead() { return null; }'].join('\n') + '\n');
    put('src/components/planted-read.tsx', ["'use client';", "import { signInDays } from '@/data/sign-in';", 'void signInDays;', 'export function PlantedClientRead() { return null; }'].join('\n') + '\n');
    put('src/views/planted-vocabulary.tsx', ["import { roleLabel } from '@/data/roles';", 'void roleLabel;', 'export function PlantedVocabulary() { return null; }'].join('\n') + '\n');
    // A .query( in a lib module or a view, none in a comment, two on one line, and one in src/app.
    put('src/lib/planted-query.ts', ['const collection = { query: (_: object) => [] };', 'void collection.query({});'].join('\n') + '\n');
    put('src/views/planted-query.tsx', ['const collection = { query: (_: object) => [] };', 'export function PlantedQuery() { return collection.query({}); }'].join('\n') + '\n');
    put('src/lib/planted-query-comment.ts', ['// members.query({}) is what this rule refuses; the line is prose, not a call.', 'const marker = 1;', 'void marker;'].join('\n') + '\n');
    put('src/lib/planted-two-queries.ts', ['const a = { query: (_: object) => [] };', 'const b = { query: (_: object) => [] };', 'void [a.query({}), b.query({})];'].join('\n') + '\n');
    put('src/app/planted-query/page.tsx', 'const collection = { query: (_: object) => [] };\nexport default function Page() { return collection.query({}); }\n');
  },
  /** Everything the rules must accept: each escape, and each case that must say nothing, in one clean run. */
  legal: () => {
    // A data module's stated escape prints, and changes no count.
    append('src/data/usage.ts', "import { ALERTS } from '@/logic/alerts'; // allow-data-imports-neither: the sample reads alerts beside usage on purpose");
    // A pure helper over values a page was given is not a reading module.
    put('src/views/planted-pure.tsx', ["'use client';", "import { requiredOf } from '@/logic/tests-context';", 'void requiredOf;', 'export function PlantedPure() { return null; }'].join('\n') + '\n');
    // The chain stops at a 'use server' module, which the browser gets a reference to, not its body.
    put('src/logic/planted-through-server.ts', "import { refreshCollections } from '@/data/live-actions';\nexport const through = refreshCollections;\n");
    put('src/views/planted-server.tsx', ["'use client';", "import { through } from '@/logic/planted-through-server';", 'void through;', 'export function PlantedServer() { return null; }'].join('\n') + '\n');
    // A stated presentation escape, and an authorized read in src/app, and the two stated no-direct-query escapes.
    put('src/views/planted-read-escape.tsx', [
      "import { readServices } from '@/data/metrics'; // allow-presentation-does-not-read: the footer reads services beside the screen on purpose",
      'void readServices;',
      'export function PlantedReadEscape() { return null; }',
    ].join('\n') + '\n');
    put('src/app/planted-authorized/page.tsx', "import { read } from '@/data/read';\n// collection.query({}) must not bypass the authorized reader.\nexport default async function Page() { await read('members', {}); return null; }\n");
    put('src/app/planted-query/actions.ts', ['const collection = { query: (_: object) => [] };', 'void collection.query({}); // allow-no-direct-query: the export streams uncached batches'].join('\n') + '\n');
    put('src/lib/planted-query-escape.ts', ['const collection = { query: (_: object) => [] };', 'void collection.query({}); // allow-no-direct-query: the export streams its own batches and must not be cached'].join('\n') + '\n');
    // What reads is decided by the code, not by a comment that names read().
    put('src/logic/planted-collections.ts', "import { clock } from '@/data/collections';\nexport const at = clock;\n");
    put('src/views/planted-comment.tsx', ["'use client';", "import { at } from '@/logic/planted-collections';", 'void at;', 'export function PlantedComment() { return null; }'].join('\n') + '\n');
  },
  /** No switches file, with src/logic still there: the four-layer rules are off. */
  noswitch: () => { remove('scripts/check.local.ts'); plantDataRule(); plantLogicRule(); plantViewRule(); },
  /** The switch declared, but not as a boolean. */
  nonbool: plantNonBooleanSwitch,
  nonboolPlanted: () => { plantNonBooleanSwitch(); plantDataRule(); plantLogicRule(); plantViewRule(); },
  /** The declaration is false, though a comment says true. */
  switchFalse: () => { put('scripts/check.local.ts', '// fourLayers = true\nexport const fourLayers = false;\n'); plantDataRule(); plantLogicRule(); plantViewRule(); },
  /** A product, whose own pages are its own: the template's rules fall silent, the protagonist and nav rules do not. */
  product: () => {
    rogue();
    put('src/views/two.tsx', `import { FeaturedMetric } from '@/components/patterns/featured-metric';\nexport const Two = () => (\n  <>\n    <FeaturedMetric kicker="A" value={1} />\n    <FeaturedMetric kicker="A" value={1} />\n  </>\n);\n`);
    plantNav('/', "{ allOf: [{ allOf: ['keys:read'] }] }");
    put('.meridian/manifest.json', JSON.stringify({ version: '0.5.0', route: 'create', brand: { name: 'Acme' }, files: {} }));
  },
} as const;

type Batch = keyof typeof BATCHES;
type Result = { out: string; status: number | null };
const results = new Map<Batch, Result>();
/** Put every file a batch touched back, so the copy starts and ends each batch as the template. */
const reset = () => {
  for (const f of touched) restore(f);
  touched.clear();
  fs.rmSync(path.join(dir, 'client-imports.json'), { force: true });
};
/** The run of one state, made once and then read by each case that asserts on it. */
const ran = (batch: Batch): Result => {
  let r = results.get(batch);
  if (!r) {
    reset();
    BATCHES[batch]();
    const out = runCheck();
    r = { out: out.stdout, status: out.status };
    reset();
    results.set(batch, r);
  }
  return r;
};
/**
 * Every state's gate run, once, before the cases: each is a child process whose output several cases only read, which
 * `docs/testing.md` puts in `beforeAll`. The cases below assert on the stored output and change no state of the copy.
 */
beforeAll(() => { for (const batch of Object.keys(BATCHES) as Batch[]) ran(batch); }, 240_000);

describe("the template's own rules", () => {
  it('pass on the template as it is', () => expect(ran('clean').out).toMatch(/^0 problems/m), 60_000);
  it('catch a direct fixture import, by alias and by relative path, a stray connection() and a stale writer', () => {
    const { out } = ran('defects');
    expect(out).toMatch(/src\/views\/rogue\.tsx:1: .*src\/system\/fixtures/);
    expect(out).toMatch(/src\/views\/rogue\.tsx:2: .*src\/system\/fixtures/);
    expect(out).toMatch(/app\/\(dashboard\)\/rogue\/page\.tsx:\d+: connection\(\)/);
    expect(out).toMatch(/app\/\(dashboard\)\/rogue\/actions\.ts:\d+: revalidates with 'max' on a writer path/);
  }, 60_000);
  it('catch a literal colour in every form a browser takes, and leave a tint composed from tokens alone', () => {
    const { out } = ran('defects');
    for (const [line, what] of [[3, '#0a58caFF'], [4, '#0a5F'], [5, 'oklch('], [6, 'lab('], [7, 'color(']] as const) {
      expect(out, `${what} on line ${line}`).toMatch(new RegExp(`src/views/paint\\.tsx:${line}: literal colour ${what.replace(/[()#]/g, (m) => `\\${m}`)}`));
    }
    expect(out).not.toMatch(/src\/views\/paint\.tsx:8:/);
  }, 60_000);
  it('allow one protagonist a page, in the template and in a product', () => {
    expect(ran('defects').out).toMatch(/src\/views\/two\.tsx:5: a second FeaturedMetric \(the first is at line 4\)/);
    expect(ran('product').out).toMatch(/src\/views\/two\.tsx:5: a second FeaturedMetric \(the first is at line 4\)/);
  }, 60_000);
  it('send a nav item with no need, a bad grant or an allOf the shape it cannot read to the gate, naming its href', () => {
    const { out } = ran('defects');
    expect(out).toMatch(/src\/app\.config\.ts: nav item \/ has no needs/);
    expect(out).toMatch(/src\/app\.config\.ts: nav item \/members names "keys:manage", which is not a grant/);
    expect(out).toMatch(/src\/app\.config\.ts: nav item \/settings has an empty allOf/);
    expect(out).toMatch(/src\/app\.config\.ts: nav item \/business names \{"allOf":\["keys:read"\]\} in its allOf, which is not a grant/);
    // Not one of the template's alone: a product's own src/app.config.ts is checked too.
    expect(ran('product').out).toMatch(/src\/app\.config\.ts: nav item \/ names \{"allOf":\["keys:read"\]\} in its allOf/);
    // Put back, the template states none.
    expect(ran('clean').out).not.toMatch(/src\/app\.config\.ts: nav item/);
  }, 60_000);
  it('stay out of a product, whose pages are its own', () => {
    const { out } = ran('product');
    expect(out).toMatch(/problems ·/);
    expect(out).not.toMatch(/reads src\/system\/fixtures directly|connection\(\) outside the template|revalidates with 'max'/);
  }, 60_000);
});

describe('the four-layer rules', () => {
  const switchFile = 'scripts/check.local.ts';

  it('refuse a data module that imports the logic layer or a view, by alias and by relative path', () => {
    const { out, status } = ran('defects');
    expect(out).toMatch(/src\/data\/planted\.ts:1: imports @\/logic\/alerts from src\/logic\/alerts; the data layer imports neither/);
    expect(out).toMatch(/src\/data\/planted\.ts:2: imports \.\.\/logic\/summarise from src\/logic\/summarise/);
    expect(out).toMatch(/src\/data\/planted\.ts:3: imports @\/views\/workspaces from src\/views\/workspaces/);
    expect(status).toBe(1);
  }, 60_000);

  it('refuse a logic module that imports a view, by alias and by relative path', () => {
    const { out, status } = ran('defects');
    expect(out).toMatch(/src\/logic\/planted\.ts:1: imports @\/views\/workspace-chrome from src\/views\/workspace-chrome; the logic layer imports no view/);
    expect(out).toMatch(/src\/logic\/planted\.ts:2: imports \.\.\/views\/standalone from src\/views\/standalone/);
    expect(status).toBe(1);
  }, 60_000);

  it('refuse a file under src/views that is not a renderer, and allow workspaces.ts and a capitalised component', () => {
    const { out, status } = ran('defects');
    expect(out).toMatch(/src\/views\/helperFn\.ts: is not a renderer/);
    expect(out).toMatch(/src\/views\/plain\.tsx: is not a renderer/);
    expect(out).not.toMatch(/src\/views\/Good\.tsx: is not a renderer/);
    expect(out).not.toMatch(/src\/views\/workspaces\.ts: is not a renderer/);
    expect(status).toBe(1);
  }, 60_000);

  it('print a stated escape with its reason, and still pass', () => {
    const { out, status } = ran('legal');
    const base = fs.readFileSync(path.join(dir, 'src/data/usage.ts'), 'utf8');
    const line = base.split('\n').length + (base.endsWith('\n') ? 0 : 1);
    const escape = `escape  src/data/usage.ts:${line}: data-imports-neither — the sample reads alerts beside usage on purpose`;
    expect(out).toContain(escape);
    expect(out).toMatch(/^0 problems/m);
    expect(status).toBe(0);
    // Printed as its own line after the problem list and before the summary, which it does not change.
    const lines = out.trimEnd().split('\n');
    expect(lines.indexOf(escape)).toBeGreaterThan(lines.indexOf('check: ok'));
    expect(lines.indexOf(escape)).toBeLessThan(lines.findIndex((l) => /^\d+ problems · /.test(l)));
  }, 60_000);

  it('say nothing at all when the project has no switches file, though src/logic is there', () => {
    const { out, status } = ran('noswitch');
    expect(out).not.toMatch(/the data layer imports neither|the logic layer imports no view|is not a renderer/);
    expect(out).not.toMatch(/fourLayers is declared/);
    expect(status).toBe(0);
    // The folder exists, so its existence cannot be what turns the rules on.
    expect(fs.existsSync(path.join(dir, 'src/logic'))).toBe(true);
  }, 60_000);

  it('leave the rules off and print one note when the switch is not a boolean', () => {
    const before = ran('nonbool');
    expect(before.status).toBe(0);
    const summary = before.out.split('\n').find((l) => /^\d+ problems · /.test(l));
    const after = ran('nonboolPlanted');
    expect(after.out).not.toMatch(/the data layer imports neither|the logic layer imports no view|is not a renderer/);
    const lines = after.out.trimEnd().split('\n');
    const notes = lines.filter((l) => l.startsWith('note  '));
    expect(notes).toEqual([`note  ${switchFile}: fourLayers is declared but not as true or false — the four-layer rules are off`]);
    expect(lines.indexOf(notes[0])).toBeLessThan(lines.findIndex((l) => /^\d+ problems · /.test(l)));
    expect(lines.find((l) => /^\d+ problems · /.test(l))).toBe(summary);
    expect(after.status).toBe(before.status);
  }, 60_000);

  it('stay silent when a comment says fourLayers = true but the declaration says false', () => {
    const { out, status } = ran('switchFalse');
    expect(out).not.toMatch(/the data layer imports neither|the logic layer imports no view|is not a renderer/);
    expect(out).not.toMatch(/fourLayers is declared/);
    expect(status).toBe(0);
  }, 60_000);

  it('refuse a client module that imports a logic module whose imports reach a reading module, by alias and by relative path', () => {
    // `src/logic/alerts.ts` imports `src/data/access.ts`, which resolves access and reads: the logic module is legal, but
    // a client module that imports it by value would pull the reads into a browser. The chain is in the refusal.
    const chain = 'whose imports reach src/data/access, a module that reads (src/logic/alerts -> src/data/access); a client module imports no logic module that reads';
    const { out, status } = ran('defects');
    expect(out).toContain(`src/views/planted-client.tsx:2: imports @/logic/alerts from src/logic/alerts, ${chain}`);
    expect(out).toContain(`src/views/planted-client.tsx:3: imports ../logic/alerts from src/logic/alerts, ${chain}`);
    expect(status).toBe(1);
    // The stated escape on the third import prints as the other rules' escapes do, and only that line is not refused.
    expect(out).toContain('escape  src/views/planted-client.tsx:4: client-does-not-import-a-reading-module — the sample reads alerts beside usage on purpose');
    expect(out).not.toMatch(/src\/views\/planted-client\.tsx:4: imports/);
  }, 60_000);

  it('say nothing when the logic module a client imports is a pure helper over values a page was given', () => {
    // `src/logic/tests-context.ts` imports `src/data/verification.ts`, three pure rules over runs and releases, which
    // calls none of the six reads: a pure helper is not a reading module, and the rule says nothing about it.
    const { out, status } = ran('legal');
    expect(out).not.toMatch(/src\/views\/planted-pure\.tsx/);
    expect(out).toMatch(/^0 problems/m);
    expect(status).toBe(0);
  }, 60_000);

  it("say nothing when the chain crosses a 'use server' module", () => {
    // `src/data/live-actions.ts` is a Server Action that reads, but the browser gets a reference to it, not its body:
    // the walk stops there, so a client may import a logic module that names it.
    const { out, status } = ran('legal');
    expect(out).not.toMatch(/src\/views\/planted-server\.tsx/);
    expect(out).toMatch(/^0 problems/m);
    expect(status).toBe(0);
  }, 60_000);

  it('refuse a view or a client component that takes a value from a data module, and stay silent on the five vocabulary modules', () => {
    // A sixth module is any of src/data's that is not roles, features, sample, request-methods or live-actions: a read
    // wearing a helper's name. The relative form is refused because the scan resolves the specifier, not its spelling.
    const { out, status } = ran('defects');
    expect(out).toContain('src/views/planted-read.tsx:1: imports @/data/metrics from src/data/metrics; presentation does not read');
    expect(out).toContain('src/components/planted-read.tsx:2: imports @/data/sign-in from src/data/sign-in; presentation does not read');
    expect(out).not.toMatch(/planted-vocabulary/);
    expect(status).toBe(1);
  }, 60_000);

  it('print a stated presentation escape with its reason, and pass without the refusal', () => {
    const { out, status } = ran('legal');
    const escape = 'escape  src/views/planted-read-escape.tsx:1: presentation-does-not-read — the footer reads services beside the screen on purpose';
    expect(out).toContain(escape);
    expect(out).not.toMatch(/src\/views\/planted-read-escape\.tsx:1: imports/);
    expect(out).toMatch(/^0 problems/m);
    expect(status).toBe(0);
    // Printed as its own line after the problem list and before the summary, which it does not change.
    const lines = out.trimEnd().split('\n');
    expect(lines.indexOf(escape)).toBeGreaterThan(lines.indexOf('check: ok'));
    expect(lines.indexOf(escape)).toBeLessThan(lines.findIndex((l) => /^\d+ problems · /.test(l)));
  }, 60_000);

  it('refuse a .query( in a lib module or a view, and say nothing about one a comment names', () => {
    // The prose file proves the scan reads comment-blanked source: a documented call is not a call.
    const { out, status } = ran('defects');
    expect(out).toContain('src/lib/planted-query.ts:2: calls collection.query( directly; no direct query');
    expect(out).toContain('src/views/planted-query.tsx:2: calls collection.query( directly; no direct query');
    expect(out).not.toMatch(/planted-query-comment/);
    expect(status).toBe(1);
  }, 60_000);

  it('refuses every direct query on a line, not only the first', () => {
    // One line, two reads: the second must not slip through because the first was found.
    const { out, status } = ran('defects');
    expect(out).toContain('src/lib/planted-two-queries.ts:3: calls a.query( directly');
    expect(out).toContain('src/lib/planted-two-queries.ts:3: calls b.query( directly');
    expect(status).toBe(1);
  }, 60_000);

  it('refuse a direct query in src/app while accepting an authorized read and comment-only mention', () => {
    const refused = ran('defects');
    expect(refused.out).toContain('src/app/planted-query/page.tsx:2: calls collection.query( directly; no direct query');
    expect(refused.status).toBe(1);
    const authorized = ran('legal');
    expect(authorized.out).not.toContain('src/app/planted-authorized/page.tsx:');
    expect(authorized.out).toMatch(/^0 problems/m);
    expect(authorized.status).toBe(0);
  }, 60_000);

  it('honor a stated src/app direct-query escape on the call line', () => {
    const file = 'src/app/planted-query/actions.ts';
    const { out, status } = ran('legal');
    expect(out).toContain(`escape  ${file}:2: no-direct-query — the export streams uncached batches`);
    expect(out).not.toContain(`${file}:2: calls`);
    expect(out).toMatch(/^0 problems/m);
    expect(status).toBe(0);
  }, 60_000);

  it('print a stated no-direct-query escape with its reason, and pass without the refusal', () => {
    const { out, status } = ran('legal');
    expect(out).toContain('escape  src/lib/planted-query-escape.ts:2: no-direct-query — the export streams its own batches and must not be cached');
    expect(out).not.toMatch(/src\/lib\/planted-query-escape\.ts:2: calls/);
    expect(out).toMatch(/^0 problems/m);
    expect(status).toBe(0);
  }, 60_000);

  it('decide what reads by the code, not by a comment that names read()', () => {
    // `src/data/collections.ts` names `read()` in its prose and calls none of the six. A raw text match would call it a
    // reading module and refuse this client, which reaches nothing but the collections' own data.
    const { out, status } = ran('legal');
    expect(out).not.toMatch(/src\/views\/planted-comment\.tsx/);
    expect(out).toMatch(/^0 problems/m);
    expect(status).toBe(0);
  }, 60_000);
});

describe('the client-import walk in a tree that has no sample', () => {
  it('runs its two unguarded assertions instead of skipping the file', () => {
    reset();
    const generator = 'src/system/fixtures/company.ts';
    const report = path.join(dir, 'client-imports.json');
    remove(generator);
    const r = spawnSync(path.join(ROOT, 'node_modules/.bin/vitest'), ['run', 'tests/client-imports.test.ts', '--reporter=json', `--outputFile=${report}`], { cwd: dir, encoding: 'utf8' });
    // The report is written whether or not the run passed, so its own cases say what happened.
    const assertions = (JSON.parse(fs.readFileSync(report, 'utf8')).testResults as { assertionResults: { status: string }[] }[]).flatMap((f) => f.assertionResults);
    reset();
    // Only the reading-module boundary can speak without a generator, and it does: the two unguarded cases run.
    const ran = assertions.filter((a) => a.status === 'passed' || a.status === 'failed');
    expect(ran.map((a) => a.status), `${r.stdout}\n${r.stderr}`).toEqual(['passed', 'passed']);
    // The generator cases are collected and skipped, not absent: the file is one file, and it did not skip whole.
    expect(assertions.length).toBeGreaterThan(ran.length);
    expect(r.status).toBe(0);
  }, 120_000);
});

describe("the ownership guide is the rule's rendering", () => {
  const guide = 'skills/zz-meridian/references/ownership.md';
  it('is reported when the block no longer matches cli/src/ownership.ts, and is silent once it is put back', () => {
    const original = fs.readFileSync(path.join(ROOT, guide), 'utf8');
    try {
      fs.writeFileSync(path.join(ROOT, guide), original.replace('- Kept: a path in the keep register', '- Kept: A PATH in the keep register'));
      const r = spawnSync(process.execPath, ['scripts/check.ts'], { cwd: ROOT, encoding: 'utf8' });
      expect(r.stdout).toContain(`${guide}: the ownership list differs from cli/src/ownership.ts`);
      expect(r.status).toBe(1);
    } finally {
      fs.writeFileSync(path.join(ROOT, guide), original);
    }
    const clean = spawnSync(process.execPath, ['scripts/check.ts'], { cwd: ROOT, encoding: 'utf8' });
    expect(clean.stdout).toMatch(/^0 problems/m);
  }, 120_000);
});
