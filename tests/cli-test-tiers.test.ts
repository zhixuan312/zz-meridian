// @vitest-environment node
// The classification in docs/testing.md and the repository cannot drift apart: every gate step, every suite verify names,
// every group of test files and every verify phase has exactly one row, and no row names something that does not exist.
// The repository's side is read from source (the gate's STEPS, the suite list scripts/lib/coverage.ts exports, the files
// under tests/), so a step or a suite added without a row fails here, naming its key. The planted cases below prove the
// guard is not vacuous: each one fails the same function the real tree passes.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SUITE_NAMES } from '../scripts/lib/coverage.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const COLUMNS = ['Key', 'Size', 'Type', 'Tier', 'Quiet machine', 'Command', 'Measured', 'What it checks'];
const SIZES = ['static', 'small', 'medium', 'large'];
const TYPES = ['functional', 'non-functional', 'performance'];
const TIERS = ['quick', 'change', 'complete', 'timed', 'on request'];
const RULE = 'A run needs a quiet machine exactly when it runs a check whose type is performance.';
const DEEP_COMMAND = 'pnpm exec vitest run tests/deep- --no-file-parallelism';
/** verify's phases that are not suites: each has a row of its own. */
const PHASES = ['build', 'route policy', 'first-load', 'html', 'navigation', 'personas'];
const STANDALONE = ['audit --atlas', 'vitals --atlas', 'consumer smoke'];

type Row = Record<string, string>;
type Repo = { steps: string[]; suites: readonly string[]; testFiles: { name: string; source: string }[] };

/** The gate's step names, read from the STEPS literal in scripts/gate.ts (the file runs on import, so it is not imported). */
function gateSteps(source: string): string[] {
  const block = source.slice(source.indexOf('const STEPS'), source.indexOf('\n];', source.indexOf('const STEPS')));
  return [...block.matchAll(/\[\s*'((?:[^'\\]|\\.)+)',\s*\[/g)].map((m) => m[1].replace(/\\'/g, "'"));
}

function groupOf(file: string): string {
  return file.startsWith('deep-') ? 'deep-*' : file.startsWith('cli-') ? 'cli-*' : 'shipped';
}

/** The table under `## The classification`: its header and its rows, each cell with surrounding backticks removed from the key. */
function parseTable(doc: string): { header: string[]; rows: Row[] } {
  // The heading line itself: `## Rules` names the section in a sentence, and a `## Budgets` table may sit between the two.
  const start = doc.indexOf('\n## The classification\n');
  if (start < 0) return { header: [], rows: [] };
  const lines = doc.slice(start).split('\n').filter((l) => l.trim().startsWith('|'));
  const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const header = lines.length ? cells(lines[0]) : [];
  const rows = lines.slice(2).map((l) => Object.fromEntries(cells(l).map((c, i) => [header[i], i === 0 ? c.replace(/`/g, '') : c])));
  return { header, rows };
}

export function problems(repo: Repo, doc: string): string[] {
  const out: string[] = [];
  const { header, rows } = parseTable(doc);
  if (header.join('|') !== COLUMNS.join('|')) out.push(`the table's columns are ${header.join(', ') || 'missing'}, not ${COLUMNS.join(', ')}`);
  if (!doc.includes(RULE)) out.push(`the rule sentence is missing: ${RULE}`);

  const groups = [...new Set(repo.testFiles.map((f) => groupOf(f.name)))];
  const expected = [
    ...repo.steps.map((s) => `gate/${s}`),
    ...groups.map((g) => `tests/${g}`),
    ...PHASES.map((p) => `verify/${p}`),
    ...repo.suites.map((s) => `verify/${s}`),
    ...STANDALONE.map((s) => `suite/${s}`),
  ];
  const keys = rows.map((r) => r.Key);
  for (const k of expected) if (!keys.includes(k)) out.push(`${k}: no row in docs/testing.md`);
  for (const k of keys) if (!expected.includes(k)) out.push(`${k}: the row names nothing the repository has`);
  for (const k of keys.filter((k, i) => keys.indexOf(k) !== i)) out.push(`${k}: more than one row`);

  for (const r of rows) {
    const sizes = (r.Size ?? '').split(',').map((s) => s.trim());
    if (!sizes.length || sizes.some((s) => !SIZES.includes(s))) out.push(`${r.Key}: size ${JSON.stringify(r.Size)} is not one of ${SIZES.join(', ')}`);
    if (!TYPES.includes(r.Type)) out.push(`${r.Key}: type ${JSON.stringify(r.Type)} is not one of ${TYPES.join(', ')}`);
    if (!TIERS.includes(r.Tier)) out.push(`${r.Key}: tier ${JSON.stringify(r.Tier)} is not one of ${TIERS.join(', ')}`);
    const quiet = r.Type === 'performance' ? 'yes' : 'no';
    if (r['Quiet machine'] !== quiet) out.push(`${r.Key}: quiet machine is ${JSON.stringify(r['Quiet machine'])}, but a ${r.Type} check needs ${quiet}`);
    if (!/`[^`]+`/.test(r.Command ?? '')) out.push(`${r.Key}: the command is not named in backticks`);
    if (!/\d+(\.\d+)? (s|min) at [0-9a-f]{7,40}\b/.test(r.Measured ?? '')) out.push(`${r.Key}: measured ${JSON.stringify(r.Measured)} is not "<n> s at <commit>"`);
    if (!(r['What it checks'] ?? '').trim()) out.push(`${r.Key}: says nothing about what it checks`);
  }
  const deep = rows.find((r) => r.Key === 'tests/deep-*');
  if (deep && !deep.Command.includes(DEEP_COMMAND)) out.push(`tests/deep-*: the command is not ${DEEP_COMMAND}`);

  // The one size boundary the layout enforces: a test that starts a browser is large, and lives in tests/deep-*.
  const launches = /^import\s+(?!type\b)[^;]*\blaunch\b[^;]*from\s+['"][^'"]*scripts\/lib\/chrome\.ts['"]/m;
  for (const f of repo.testFiles) if (groupOf(f.name) !== 'deep-*' && launches.test(f.source)) out.push(`tests/${f.name}: starts a browser outside tests/deep-*`);
  return out;
}

function repository(): Repo {
  const testFiles = fs.readdirSync(path.join(ROOT, 'tests'), { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && /\.test\.tsx?$/.test(d.name))
    .map((d) => path.relative(path.join(ROOT, 'tests'), path.join(d.parentPath, d.name)))
    .map((name) => ({ name, source: read(path.join('tests', name)) }));
  return { steps: gateSteps(read('scripts/gate.ts')), suites: SUITE_NAMES, testFiles };
}

describe('docs/testing.md classifies every check', () => {
  const repo = repository();
  const doc = read('docs/testing.md');

  it('reads a non-empty repository side', () => {
    expect(repo.steps).toContain('tests pass');
    expect(repo.suites).toContain('vitals');
    expect(repo.testFiles.length).toBeGreaterThan(0);
  });

  it('has one row per gate step, test group, verify phase and suite, and nothing else', () => {
    expect(problems(repo, doc)).toEqual([]);
  });

  it('fails, naming the key, on a suite added with no row', () => {
    expect(problems({ ...repo, suites: [...repo.suites, 'planted'] }, doc)).toContain('verify/planted: no row in docs/testing.md');
  });

  it('fails, naming the key, on a row removed', () => {
    const removed = doc.split('\n').filter((l) => !/^\|\s*`?verify\/vitals`?\s*\|/.test(l)).join('\n');
    expect(problems(repo, removed)).toContain('verify/vitals: no row in docs/testing.md');
  });

  it('fails, naming the file, on a test outside tests/deep-* that starts a browser', () => {
    const planted = { name: 'cli-planted.test.ts', source: "import { launch } from '../scripts/lib/chrome.ts';\n" };
    expect(problems({ ...repo, testFiles: [...repo.testFiles, planted] }, doc)).toContain('tests/cli-planted.test.ts: starts a browser outside tests/deep-*');
  });
});
