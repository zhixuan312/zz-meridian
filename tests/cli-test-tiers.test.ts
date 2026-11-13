// @vitest-environment node
// The three test commands are the only test entry points, and a test's tier is the file convention alone. This guard
// reads package.json and scripts/test-run.ts, so a fourth command, an old one coming back, or a convention that no longer
// classifies a test file fails here by name. The planted cases prove each check is not vacuous.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isCode, isDeep, isTier2 } from '../scripts/test-run.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

const COMMANDS = ['test:t1', 'test:t2', 'test:release'];
const REMOVED = ['test', 'gate', 'verify', 'audit', 'interactions', 'live', 'keyboard', 'vitals'];

/** The test commands a package's scripts hold: exactly the three, each pointing at the one runner. */
export function testCommands(scripts: Record<string, string>): string[] {
  return Object.entries(scripts)
    .filter(([name, line]) => name.startsWith('test') || /vitest|scripts\/test-run\.ts/.test(line))
    .map(([name]) => name);
}

describe('the three test commands', () => {
  it('are the only test entry points in package.json', () => {
    expect(testCommands(pkg.scripts).sort()).toEqual([...COMMANDS].sort());
    for (const old of REMOVED) expect(pkg.scripts[old], `${old} is an old entry point`).toBeUndefined();
    for (const name of COMMANDS) expect(pkg.scripts[name]).toBe(`node scripts/test-run.ts ${name.slice('test:'.length)}`);
  });

  it('names no test flag: each command takes no arguments', () => {
    for (const name of COMMANDS) expect(pkg.scripts[name]).not.toMatch(/--/);
  });

  it('fails when a fourth test command is added', () => {
    expect(testCommands({ ...pkg.scripts, 'test:all': 'vitest run' })).toContain('test:all');
  });
});

describe('the tier convention', () => {
  it('puts the perf convention in Tier 2, and every other test in Tier 1', () => {
    expect(isTier2('tests/column-chart.perf.test.tsx')).toBe(true);
    expect(isTier2('tests/column-chart.test.tsx')).toBe(false);
    expect(isTier2('tests/cli-test-tiers.test.ts')).toBe(false);
    // The browser-fixture tests verify a check script's function: Tier 1, run as their own stage by their size.
    expect(isTier2('tests/deep-dom.test.ts')).toBe(false);
    expect(isDeep('tests/deep-dom.test.ts')).toBe(true);
    expect(isDeep('tests/deep-checks.test.ts')).toBe(true);
    expect(isDeep('tests/column-chart.test.tsx')).toBe(false);
  });

  it('treats code changes as needing a selection, and documents as not', () => {
    expect(isCode('src/lib/format.ts')).toBe(true);
    expect(isCode('scripts/test-run.ts')).toBe(true);
    expect(isCode('tests/a.test.ts')).toBe(true);
    expect(isCode('docs/testing.md')).toBe(false);
    expect(isCode('README.md')).toBe(false);
  });

  it('collects every test file the convention classifies', () => {
    const files = fs.readdirSync(path.join(ROOT, 'tests'), { recursive: true, withFileTypes: true })
      .filter((d) => d.isFile() && /\.test\.tsx?$/.test(d.name))
      .map((d) => path.relative(ROOT, path.join(d.parentPath, d.name)));
    expect(files.length).toBeGreaterThan(0);
    // The config collects both tiers; the runner's own `--exclude` is what keeps Tier 2 out of `test:t1`.
    expect(read('vitest.config.ts')).toContain("include: ['tests/**/*.test.{ts,tsx}']");
    // There is no `*.perf` file today, and there need not be: `test:t2` still runs the affected Tier 1 tests. Whatever
    // the convention matches is a performance test by name, and the browser fixtures are the Tier 1 stage of their own.
    expect(isTier2('tests/example.perf.test.ts')).toBe(true);
    expect(files.filter((f) => isTier2(f)).every((f) => /\.perf\.test\.tsx?$/.test(f))).toBe(true);
    expect(files.some(isDeep)).toBe(true);
  });
});

// `docs/testing.md` says the same in prose, and no test pins that wording: a sentence an owner may rewrite is not a
// guarantee, and the standard's behaviour is what this file asserts above — the commands that exist, and the
// convention that classifies each test file.
