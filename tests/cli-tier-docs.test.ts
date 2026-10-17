// @vitest-environment node
// The documents and the generated text that say when to run what agree with docs/testing.md: none says `--full` runs the
// live data, Web Vitals or the navigation budgets, none says `--full` alone meets the standard or runs "the rest", none
// lists verify's modes without `--timed`, and none says the gate runs the browser-fixture tests. Each line is read with the
// next one, because prose is wrapped by hand; a window that names `--timed` is read as already telling the whole story.
// The decision records (decisions/) and the dated evidence (docs/evidence/) are history and keep their text. The planted
// lines prove each rule is not vacuous.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const refs = fs.readdirSync(path.join(ROOT, 'skills/zz-meridian/references')).filter((f) => f.endsWith('.md')).map((f) => `skills/zz-meridian/references/${f}`);
const FILES = [
  'README.md', 'AGENTS.md', 'CONTRIBUTING.md', 'cli/README.md', 'docs/testing.md', 'docs/distribution.md', 'docs/benchmark.md',
  'docs/agents.md', 'docs/start-a-dashboard.md', 'scripts/brand.ts', 'scripts/verify.config.ts', 'cli/src/context.ts',
  'cli/src/create.ts', 'cli/src/migrations.ts', 'cli/scripts/smoke.ts', '.github/workflows/weekly.yml', 'skills/zz-meridian/SKILL.md', ...refs,
];

// `--no-vitals` is a retired flag a migration names, not a claim about what runs.
const TIMED_WORK = /web vitals|(?<!-)\bvitals\b|live data|live-data|\bLCP\b|\bINP\b|navigation budget/i;
/** A line that says what `--full` does not do is the new text, not the old. */
const NEGATED = /does not run|no longer|without the|nothing in it judges/i;
const EXCUSED_GATE = /left out|leave|outside|--exclude|without|\bnot\b|no longer|own command|own step/i;

export function stale(file: string, text: string): string[] {
  const out: string[] = [];
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const at = `${file}:${i + 1}`;
    const window = `${line} ${lines[i + 1] ?? ''}`;
    if (line.includes('--full') && !window.includes('--timed')) {
      if (TIMED_WORK.test(window) && !NEGATED.test(line)) out.push(`${at}: says --full runs timed work`);
      if (/meets the/.test(window)) out.push(`${at}: says --full alone meets the standard`);
      if (/runs the rest/.test(window)) out.push(`${at}: says --full runs the rest`);
      if (line.includes('--perf')) out.push(`${at}: lists verify's modes without --timed`);
    }
    if (/\bgate\b/.test(line) && line.includes('tests/deep-') && !EXCUSED_GATE.test(line)) out.push(`${at}: says the gate runs tests/deep-*`);
  });
  return out;
}

describe('every document says what docs/testing.md says', () => {
  it('finds no stale claim in the documents and the generated text', () => {
    const found = FILES.flatMap((f) => stale(f, fs.readFileSync(path.join(ROOT, f), 'utf8')));
    expect(found).toEqual([]);
  });

  it('fails, naming the line, on each planted stale claim', () => {
    expect(stale('x.md', 'pnpm verify --full   # every route, the live data and Web Vitals')).toEqual(['x.md:1: says --full runs timed work']);
    expect(stale('x.md', 'the `pnpm verify --full` run covers the keyboard walk,\nthe live data and the vitals')).toEqual(['x.md:1: says --full runs timed work']);
    expect(stale('x.md', 'only a `--full` run with nothing left unrun ends with `the project\nmeets the Meridian standard`')).toEqual(['x.md:1: says --full alone meets the standard']);
    expect(stale('x.md', 'pnpm verify     # the smoke; `--full` runs the rest')).toEqual(['x.md:1: says --full runs the rest']);
    expect(stale('x.md', 'use `pnpm verify`, `--full` or `--perf` instead')).toEqual(["x.md:1: lists verify's modes without --timed"]);
    expect(stale('x.md', '`pnpm gate` runs every test, tests/deep-* included')).toEqual(['x.md:1: says the gate runs tests/deep-*']);
    expect(stale('x.md', '`pnpm verify --full --timed` ends with "the project meets the Meridian standard"')).toEqual([]);
    expect(stale('x.md', '`pnpm verify --full` does not run the live data or Web Vitals')).toEqual([]);
  });
});
