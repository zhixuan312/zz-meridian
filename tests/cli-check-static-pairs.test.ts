// @vitest-environment node
// Named cli-* so the payload leaves it out: it copies the template's own tracked files and reads scripts/check.ts.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { templateCopy } from './cli-template-copy';

/**
 * Every rule `scripts/check.ts` judges, and the two states that hold it: a copy of the template changed by the smallest
 * edit that must make the rule print its problem line, and the same copy put back, where the line is gone. A rule with
 * only a clean run is a rule nothing shows can fire, and one with only a failing run might fire on everything; the gate
 * is how an adopter learns their project breaks the contract, so each rule here has both. The rules tests/cli-check-rules.test.ts
 * and tests/cli-check-agent-section.test.ts already pair are listed with the file that does (`pairedIn`), and the file
 * is read to confirm it still holds the rule's line. The completeness scan finds every `problems.push(` in the script
 * and fails naming any a rule here does not claim by its `source`, so a new failure site is a new rule listed here.
 */
type Batch = 'T' | 'M1' | 'M2' | 'M3';
type Match = string | RegExp;
type Rule = {
  id: string;
  /** Text at the place in the script the rule fails from: the place still exists, and no place goes unclaimed. */
  source: string;
  /** The batch of edits that makes it fail, and the lines (all of them) it must then print. */
  batch?: Batch;
  fails?: Match[];
  /** Text a corrected twin planted in the same batch carries, which must NOT be reported. */
  twin?: Match;
  /** A test file that already holds a failing and a passing case, and a text of the rule's line it asserts. */
  pairedIn?: { file: string; needle: string };
};

const RULE_TESTS = 'tests/cli-check-rules.test.ts';
const AGENT_TESTS = 'tests/cli-check-agent-section.test.ts';
const RULES: Rule[] = [
  // Cards.
  { id: 'card has a preview', source: ': no preview.tsx', batch: 'T', fails: ['src/components/ui/badge: no preview.tsx'] },
  { id: 'card README opens with a name and a sentence', source: '/README.md: must open with', batch: 'T', fails: ['src/components/ui/card/README.md: must open with "# Name"'] },
  { id: 'card README has a status', source: 'no "Status: draft|beta|stable" line', batch: 'T', fails: ['src/components/ui/kbd/README.md: no "Status: draft|beta|stable" line'] },
  { id: 'card README has its sections', source: '/README.md: missing ${s}', batch: 'T', fails: ['src/components/ui/switch/README.md: missing ## Accessibility'] },
  // Pages.
  { id: 'page spec opens with a name and a sentence', source: '${p}: must open with', batch: 'T', fails: ['app/(dashboard)/keys/README.md: must open with "# Name"'] },
  { id: 'page spec has its sections', source: '${p}: missing ${s}', batch: 'T', fails: ['app/(dashboard)/members/README.md: missing ## Structure'] },
  { id: 'page spec says what the agent reads', source: 'no "### What the agent reads" under ## Agents', batch: 'T', fails: ['app/(dashboard)/services/README.md: no "### What the agent reads" under ## Agents'] },
  { id: 'page with a view tool has the does-here section', source: 'no "### What the agent does here" under ## Agents', pairedIn: { file: AGENT_TESTS, needle: 'What the agent does here' } },
  { id: 'does-here section has a protagonist', source: 'has no "Protagonist:', pairedIn: { file: AGENT_TESTS, needle: 'README\\.md: .*Protagonist' } },
  { id: 'does-here section has three questions', source: 'of the three questions it needs', pairedIn: { file: AGENT_TESTS, needle: 'README\\.md: .*three' } },
  // Documents.
  { id: 'a spec names only tokens that exist', source: 'which is not a token', batch: 'T', fails: ['CONTRIBUTING.md: names `ground-nope`, which is not a token'] },
  { id: 'a spec writes a token value right', source: 'is written as ${m[2]}px', batch: 'T', fails: ['CONTRIBUTING.md: `radius-lg` is written as 99px'] },
  { id: 'a document names an embed view that exists', source: 'names the embed /embed/${m}, which is not a route', batch: 'T', fails: ['CONTRIBUTING.md: names the embed /embed/nowhere, which is not a route'], twin: 'embed /embed/requests' },
  { id: 'the surfaces inventory offers embed views that exist', source: 'the inventory offers a', batch: 'T', fails: ['docs/surfaces.md: the inventory offers a `ghostview` embed view, which is not a route'] },
  // Styles and components.
  { id: 'hand-written motion uses tokens', source: 'literal duration ${lit[0]}', batch: 'T', fails: [/src\/styles\/motion\.css:\d+: literal duration 300ms/] },
  { id: 'no literal colour', source: 'literal colour ${lit[0]}', pairedIn: { file: RULE_TESTS, needle: 'literal colour' } },
  { id: 'no Tailwind utility outside the reset scales', source: "outside Meridian's scale", batch: 'T', fails: [/planted-lint\.tsx:\d+: font-bold is outside Meridian's scale/] },
  { id: 'blur names a token', source: "Meridian's blur scale", batch: 'T', fails: [/planted-lint\.tsx:\d+: backdrop-blur-sm is outside Meridian's blur scale/], twin: /planted-lint\.tsx:\d+: blur is outside/ },
  { id: 'no literal duration or delay', source: 'is a literal duration (use duration-', batch: 'T', fails: [/planted-lint\.tsx:\d+: duration-300 is a literal duration/] },
  { id: 'a press control transitions transform', source: 'transition leaves out transform', batch: 'T', fails: [/planted-lint\.tsx:\d+: a press control's transition leaves out transform/] },
  { id: 'no Tailwind palette class', source: 'Tailwind palette class', batch: 'T', fails: [/planted-lint\.tsx:\d+: Tailwind palette class bg-red-500/] },
  { id: 'a variable used is defined', source: 'which is not defined', batch: 'T', fails: ['src/views/planted-lint.tsx: uses --nope-token, which is not defined'] },
  // One implementation, inert markdown, keyboard, protagonist, nav.
  { id: 'a collection fixture is read through the collection', source: 'from the fixtures; read it through', batch: 'T', fails: ['src/views/planted-lint.tsx: imports MEMBERS from the fixtures; read it through src/data/collections.ts'], twin: 'imports Member from the fixtures' },
  { id: 'a whole fixture module is read through the collection', source: 'imports all of', batch: 'T', fails: ['src/views/planted-lint.tsx: imports all of fixtures/sample-records, which holds API_KEYS; read it through src/data/collections.ts'] },
  { id: 'no raw-HTML markdown dependency', source: 'raw HTML in rendered markdown would stop being inert', batch: 'T', fails: ['package.json depends on rehype-raw: raw HTML in rendered markdown would stop being inert'] },
  { id: 'no raw-HTML markdown plugin in source', source: 'reaches for rehype-raw', batch: 'T', fails: ['src/views/planted-lint.tsx: reaches for rehype-raw; render markdown with Prose'] },
  { id: 'an element with a control role handles the keyboard', source: 'has no onKeyDown', batch: 'T', fails: ['src/views/planted-lint.tsx: <span role="tab"> has no onKeyDown'], twin: '<span role="switch">' },
  { id: 'one protagonist a page', source: 'a second FeaturedMetric', pairedIn: { file: RULE_TESTS, needle: 'a second FeaturedMetric' } },
  { id: 'a nav item needs a shape the rail can read', source: 'nav item ${item.href}', pairedIn: { file: RULE_TESTS, needle: 'nav item \\/' } },
  { id: 'a sub page is under an item the rail can draw it under', source: 'navUnderProblems(nav)', batch: 'T', fails: ['src/app.config.ts: nav item /requests is under /nowhere, which is no item of its group'] },
  // The update session, the keep register and the logo (an adopted project).
  { id: 'a completed history journal reads back', source: '${file}: ${(e as Error)', batch: 'M1', fails: [/\.meridian\/history\/0\.1\.0\/a\/state\.json: state\.json: not valid JSON/] },
  { id: 'one update session at most', source: 'update sessions (', batch: 'M1', fails: ['.meridian/update: 2 update sessions (0.2.0, 0.3.0); finish or abort all but one'] },
  { id: 'an update session is resolved', source: 'open.map((o) =>', batch: 'M2', fails: ['.meridian/update/0.2.0: 0.2.0: the update was interrupted: run update --resume', 'npx zz-meridian@0.2.0 update --finalize'] },
  { id: 'an update journal reads back', source: '/state.json: ${(e as Error).message}', batch: 'M3', fails: ['.meridian/update/0.2.0/state.json: state.json: not valid JSON'] },
  { id: 'keep.json names managed files that are present', source: 'keepProblems(parseKeep(', batch: 'M3', fails: ['.meridian/keep.json: src/lib/format.ts: kept, but Meridian neither manages nor retired it', '.meridian/keep.json: src/ghost-managed.ts: kept file is missing'] },
  { id: 'keep.json reads back', source: '.meridian/keep.json: ${(e as Error).message}', batch: 'M2', fails: ['.meridian/keep.json: keep.json: not valid JSON'] },
  { id: 'app.logo is a root-relative SVG path', source: 'is not a root-relative SVG path', batch: 'M3', fails: ['src/app.config.ts: app.logo "ghost.png" is not a root-relative SVG path'] },
  { id: 'app.logo names a file that exists', source: 'but public${source} does not exist', batch: 'M1', fails: ['src/app.config.ts: app.logo is /ghost.svg, but public/ghost.svg does not exist'] },
  // The template's request boundaries.
  { id: 'connection() only at the three boundaries', source: 'connection() outside the template', pairedIn: { file: RULE_TESTS, needle: 'connection\\(\\)' } },
  { id: 'pages read the sample through src/data', source: 'reads src/system/fixtures directly', pairedIn: { file: RULE_TESTS, needle: 'reads src\\/system\\/fixtures directly' } },
  { id: "a writer path never revalidates with 'max'", source: "revalidates with 'max'", pairedIn: { file: RULE_TESTS, needle: "revalidates with 'max' on a writer path" } },
  // The four layers.
  { id: 'src/data imports neither logic nor views', source: 'imports ${spec} from ${target}; ${why}', pairedIn: { file: RULE_TESTS, needle: 'the data layer imports neither' } },
  { id: 'src/logic imports no view', source: 'imports ${spec} from ${target}; ${why}', pairedIn: { file: RULE_TESTS, needle: 'the logic layer imports no view' } },
  { id: 'a view is a renderer', source: 'is not a renderer', pairedIn: { file: RULE_TESTS, needle: 'is not a renderer' } },
  { id: 'a client module imports no reading logic module', source: 'a client module imports no logic module that reads', pairedIn: { file: RULE_TESTS, needle: 'a client module imports no logic module that reads' } },
  { id: 'presentation does not read', source: '${p.file}:${p.line}: ${p.message}', pairedIn: { file: RULE_TESTS, needle: 'presentation does not read' } },
  { id: 'no direct query', source: '${p.file}:${p.line}: ${p.message}', pairedIn: { file: RULE_TESTS, needle: 'calls collection.query( directly' } },
  // Dormant code, the agent context.
  { id: 'brand.ts lists what a product drops', source: 'no atlasOnly list found', batch: 'T', fails: ['scripts/brand.ts: no atlasOnly list found'] },
  { id: 'no dormant export', source: 'which nothing a product keeps imports', batch: 'T', fails: ['src/lib/planted-lib.ts: exports orphanPlanted, which nothing a product keeps imports'], twin: 'exports usedPlanted' },
  { id: 'the brief has its five sections', source: 'docs/brief.md: ${e}', batch: 'T', fails: ['docs/brief.md: missing required heading "## Glossary"', 'docs/brief.md: heading "## Users" appears 2 times'] },
  { id: 'a path a document names exists', source: 'scanReferences(docs, has, scripts)', batch: 'T', fails: ['path "docs/nope-planted.md" does not exist'], twin: 'optional-planted' },
  { id: 'a package script a document names exists', source: 'scanReferences(docs, has, scripts)', batch: 'T', fails: ['package script "nopescript" is not in package.json'], twin: 'package script "gate"' },
];

const ROOT = path.resolve(import.meta.dirname, '..');
const SCRIPT = fs.readFileSync(path.join(ROOT, 'scripts/check.ts'), 'utf8');

describe('every rule the static gate judges is listed, and every place it can fail belongs to one', () => {
  /** The statement of each `problems.push(`, to its closing parenthesis, so a site is judged by its own message only. */
  const sites = (text: string) => {
    const out: { line: number; text: string }[] = [];
    let at = text.indexOf('problems.push(');
    while (at !== -1) {
      const lineStart = text.lastIndexOf('\n', at) + 1;
      if (!/^\s*(\/\/|\*)/.test(text.slice(lineStart, text.indexOf('\n', at)))) {
        let depth = 0;
        let quote = '';
        let end = at + 'problems.push'.length;
        for (; end < text.length; end++) {
          const c = text[end];
          if (quote) {
            if (c === '\\') end++;
            else if (c === quote) quote = '';
          } else if (c === "'" || c === '"' || c === '`') quote = c;
          else if (c === '(') depth++;
          else if (c === ')' && --depth === 0) break;
        }
        out.push({ line: text.slice(0, at).split('\n').length, text: text.slice(at, end + 1) });
      }
      at = text.indexOf('problems.push(', at + 1);
    }
    return out;
  };
  const unclaimed = (text: string) => sites(text).filter((s) => !RULES.some((r) => s.text.includes(r.source))).map((s) => s.line);

  it('has each rule once, with exactly one way it is shown', () => {
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
    for (const r of RULES) {
      const ways = [r.pairedIn, r.batch && r.fails?.length ? r : undefined].filter(Boolean);
      expect(ways.length, `${r.id} needs exactly one of pairedIn or a batch with fails`).toBe(1);
    }
  });

  it('finds every rule source in a failure site of the script', () => {
    const all = sites(SCRIPT);
    for (const r of RULES) expect(all.some((s) => s.text.includes(r.source)), `${r.id}: scripts/check.ts no longer holds "${r.source}" at a problems.push`).toBe(true);
  });

  it('names no failure site that no rule claims', () => {
    const lines = unclaimed(SCRIPT);
    expect(lines.map((n) => `scripts/check.ts:${n} can fail from here and no rule claims it: ${SCRIPT.split('\n')[n - 1].trim().slice(0, 120)}`)).toEqual([]);
  });

  it('names a failure site planted in a copy of the script', () => {
    const planted = `${SCRIPT}\nproblems.push('a rule nobody listed');\n`;
    const at = SCRIPT.split('\n').length + 1;
    expect(unclaimed(planted)).toEqual([at]);
    // A site inside a loop of the script is found too, not only one at the end.
    const middle = SCRIPT.replace('  for (const s of CARD_SECTIONS)', "  problems.push('another rule nobody listed');\n  for (const s of CARD_SECTIONS)");
    expect(unclaimed(middle).length).toBe(1);
  });

  /**
   * Whether a test file asserts the needle: on an assertion's own line, or in a constant an assertion interpolates. A
   * title or a comment that names it asserts nothing.
   */
  const asserts = (text: string, needle: string) => {
    const lines = text.split('\n');
    const expects = lines.filter((l) => l.includes('expect('));
    return expects.some((l) => l.includes(needle)) || lines.some((l) => {
      const name = l.includes(needle) ? /\bconst (\w+) =/.exec(l)?.[1] : undefined;
      return name !== undefined && expects.some((e) => e.includes(`\${${name}}`));
    });
  };
  it('keeps every rule paired in another file in that file', () => {
    for (const r of RULES.filter((x) => x.pairedIn)) {
      expect(asserts(fs.readFileSync(path.join(ROOT, r.pairedIn!.file), 'utf8'), r.pairedIn!.needle), `${r.id}: ${r.pairedIn!.file} no longer asserts "${r.pairedIn!.needle}"`).toBe(true);
    }
    // The passing case of every paired rule is the template's own run, which reports no problem at all.
    for (const file of new Set(RULES.flatMap((x) => (x.pairedIn ? [x.pairedIn.file] : [])))) {
      expect(fs.readFileSync(path.join(ROOT, file), 'utf8'), `${file} holds no case of the template passing`).toMatch(/expect\(.*\)\.toMatch\(\/\^0 problems\/m\)/);
    }
  });

});

// ── The copy of the template the edits are made in ───────────────────────────────────────────────────
const dir = templateCopy('zz-static-pairs-');
const touched = new Set<string>();
const put = (f: string, text: string) => {
  touched.add(f);
  fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
  fs.writeFileSync(path.join(dir, f), text);
};
const edit = (f: string, change: (text: string) => string) => {
  const before = fs.readFileSync(path.join(dir, f), 'utf8');
  const after = change(before);
  expect(after, `${f}: the edit changed nothing`).not.toBe(before);
  put(f, after);
};
const remove = (f: string) => { touched.add(f); fs.rmSync(path.join(dir, f), { force: true }); };
/** Every file an edit touched goes back to the repository's own copy, or goes away when the repository has none. */
const reset = () => {
  for (const f of touched) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.copyFileSync(src, path.join(dir, f));
    } else fs.rmSync(path.join(dir, f), { force: true });
  }
  touched.clear();
  fs.rmSync(path.join(dir, '.meridian'), { recursive: true, force: true });
  fs.rmSync(path.join(dir, 'public'), { recursive: true, force: true });
};
const run = () => {
  const r = spawnSync(process.execPath, ['scripts/check.ts'], { cwd: dir, encoding: 'utf8' });
  return { out: r.stdout, status: r.status };
};
const hash = (f: string) => `sha256-${createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex')}`;
const journal = (id: string) => JSON.stringify({
  id, sourceVersion: '0.1.0', targetVersion: id, route: 'create',
  originalManifest: { version: '0.1.0', route: 'create', brand: {}, files: {} },
  targetManifest: { version: id, route: 'create', brand: {}, files: {} },
  targetIntegrity: 'x', planHash: `sha256-${'0'.repeat(64)}`, phase: 'applying',
  operations: [], migrations: [], retired: [], validation: [], failure: null,
});
const BADGE = 'src/components/ui/badge/index.tsx';
const manifest = (files: Record<string, string>) => put('.meridian/manifest.json', JSON.stringify({ version: '0.31.2', route: 'create', brand: {}, files }));
const logo = (value: string) => edit('src/app.config.ts', (t) => t.replace("accent: 'indigo' as const,", `accent: 'indigo' as const,\n  logo: '${value}',`));

/** The edits of each batch. T is the template as it is; M1..M3 are an adopted project, where the update rules speak. */
const EDITS: Record<Batch | 'M0', () => void> = {
  T: () => {
    remove('src/components/ui/badge/preview.tsx');
    edit('src/components/ui/card/README.md', (t) => `x\n${t}`);
    edit('src/components/ui/kbd/README.md', (t) => t.replace(/^Status: .*\n/m, ''));
    edit('src/components/ui/switch/README.md', (t) => t.replace(/^## Accessibility$/m, '## Accessibilty'));
    edit('app/(dashboard)/keys/README.md', (t) => `x\n${t}`);
    edit('app/(dashboard)/members/README.md', (t) => t.replace(/^## Structure$/m, '## Structre'));
    edit('app/(dashboard)/services/README.md', (t) => t.replace(/^### What the agent reads$/m, '### What the agent readz'));
    edit('CONTRIBUTING.md', (t) => `${t}\n\nPlanted: \`ground-nope\`, \`radius-lg\` 99px, \`/embed/nowhere\` and the real \`/embed/requests\`.\n`);
    edit('docs/surfaces.md', (t) => t.replace(/(\| Customers \| List with sparklines \|[^\n]*?\| )Not offered( \|)/, '$1`ghostview`$2'));
    edit('src/styles/motion.css', (t) => `${t}\n.planted { transition: opacity 300ms; }\n`);
    edit('src/app.config.ts', (t) => t.replace("under: '/usage'", "under: '/nowhere'"));
    put('src/lib/planted-lib.ts', 'export const orphanPlanted = 1;\nexport const usedPlanted = 2;\n');
    put('src/views/planted-lint.tsx', [
      "import { MEMBERS } from '@/system/fixtures/sample-members';",
      "import { type Member } from '@/system/fixtures/sample-members';",
      "import * as everything from '@/system/fixtures/sample-records';",
      "import { usedPlanted } from '@/lib/planted-lib';",
      'void [MEMBERS, everything, usedPlanted];',
      "export const a: Member[] = [];",
      "export const b = 'font-bold';",
      "export const c = 'backdrop-blur-sm';",
      '// A comment may say the focus left with no blur: it is words, not a class.',
      "export const d = 'duration-300';",
      "export const e = 'press transition-colors';",
      "export const f = 'bg-red-500';",
      "export const g = 'var(--nope-token)';",
      "export const h = 'rehype-raw';",
      'export function PlantedLint() {',
      '  return (<><span role="tab">a</span><span role="switch" onKeyDown={() => {}}>b</span></>);',
      '}',
      '',
    ].join('\n'));
    edit('package.json', (t) => t.replace('"dependencies": {', '"dependencies": {\n    "rehype-raw": "1.0.0",'));
    edit('scripts/brand.ts', (t) => t.replace('const atlasOnly = [', 'const atlasOnlyList = ['));
    put('docs/brief.md', [
      '# Brief', '', '## Product', 'x', '', '## Users', 'x', '', '## Users', 'x', '', '## Data', 'x', '', '## Decisions',
      'See `docs/nope-planted.md`, `optional:docs/optional-planted.md` and `pnpm nopescript`, and `pnpm run gate`.', '',
    ].join('\n'));
  },
  M0: () => {
    manifest({ [BADGE]: hash(BADGE) });
    put('.meridian/keep.json', JSON.stringify([{ path: BADGE, reason: 'our own badge' }]));
    put('public/logo.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>\n');
    logo('/logo.svg');
  },
  M1: () => {
    manifest({});
    put('.meridian/update/0.2.0/state.json', journal('0.2.0'));
    put('.meridian/update/0.3.0/state.json', journal('0.3.0'));
    put('.meridian/history/0.1.0/a/state.json', '{');
    logo('/ghost.svg');
  },
  M2: () => {
    manifest({});
    put('.meridian/update/0.2.0/state.json', journal('0.2.0'));
    put('.meridian/keep.json', 'not json');
  },
  M3: () => {
    manifest({ 'src/ghost-managed.ts': `sha256-${'0'.repeat(64)}` });
    put('.meridian/update/0.2.0/state.json', '{');
    put('.meridian/keep.json', JSON.stringify([{ path: 'src/lib/format.ts', reason: 'ours' }, { path: 'src/ghost-managed.ts', reason: 'ours' }]));
    logo('ghost.png');
  },
};

type Result = { out: string; status: number | null };
const results = new Map<string, Result>();
/** The run of one batch, made once and then read by each rule of the batch. */
const ran = (batch: Batch | 'M0' | 'clean'): Result => {
  let r = results.get(batch);
  if (!r) {
    reset();
    if (batch !== 'clean') EDITS[batch]();
    r = run();
    reset();
    results.set(batch, r);
  }
  return r;
};
const has = (out: string, m: Match) => (typeof m === 'string' ? out.includes(m) : m.test(out));

describe('the static gate on the template as it is, and on an adopted project with nothing wrong', () => {
  it('prints no problem on the template', () => {
    const { out, status } = ran('clean');
    expect(out).toMatch(/^check: ok$/m);
    expect(out).toMatch(/^0 problems/m);
    expect(status).toBe(0);
  }, 120_000);

  it('prints no problem on an adopted project whose manifest, keep register and logo are right', () => {
    const { out, status } = ran('M0');
    expect(out).toMatch(/^0 problems/m);
    expect(status).toBe(0);
  }, 120_000);
});

describe('each rule fails on its edit, and is silent once the edit is put back', () => {
  for (const r of RULES.filter((x) => x.batch)) {
    it(r.id, () => {
      const batch = r.batch!;
      const failing = ran(batch);
      for (const m of r.fails!) expect(has(failing.out, m), `${batch}: no line ${m}\n${failing.out.slice(0, 3000)}`).toBe(true);
      expect(failing.status).toBe(1);
      // The corrected twin, planted in the same run, is not reported.
      if (r.twin) expect(has(failing.out, r.twin), `the twin ${r.twin} was reported`).toBe(false);
      // Put back, the line is gone: the template for T, the adopted project with nothing wrong for M1..M3.
      const clean = ran(batch === 'T' ? 'clean' : 'M0');
      for (const m of r.fails!) expect(has(clean.out, m), `the line ${m} is still there once the edit is undone`).toBe(false);
    }, 120_000);
  }
});
