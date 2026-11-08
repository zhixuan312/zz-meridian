// @vitest-environment node
// The three test commands are the only test entry points, and a test's tier is the file convention alone. This guard
// reads package.json and scripts/test-run.ts, so a fourth command, an old one coming back, or a convention that no longer
// classifies a test file fails here by name. The planted cases prove each check is not vacuous.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isCode, isTier2 } from '../scripts/test-run.ts';

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
  it('puts the repo suites and the perf convention in Tier 2, and every other test in Tier 1', () => {
    expect(isTier2('tests/deep-dom.test.ts')).toBe(true);
    expect(isTier2('tests/column-chart.perf.test.tsx')).toBe(true);
    expect(isTier2('tests/column-chart.test.tsx')).toBe(false);
    expect(isTier2('tests/cli-test-tiers.test.ts')).toBe(false);
  });

  it('treats code changes as needing a selection, and documents as not', () => {
    expect(isCode('src/lib/format.ts')).toBe(true);
    expect(isCode('scripts/test-run.ts')).toBe(true);
    expect(isCode('tests/a.test.ts')).toBe(true);
    expect(isCode('docs/testing.md')).toBe(false);
    expect(isCode('README.md')).toBe(false);
  });

  it('collects every test file the convention classifies, Tier 2 included', () => {
    const files = fs.readdirSync(path.join(ROOT, 'tests'), { recursive: true, withFileTypes: true })
      .filter((d) => d.isFile() && /\.test\.tsx?$/.test(d.name))
      .map((d) => path.relative(ROOT, path.join(d.parentPath, d.name)));
    expect(files.length).toBeGreaterThan(0);
    // The config collects both tiers; the runner's own `--exclude` is what keeps Tier 2 out of `test:t1`.
    expect(read('vitest.config.ts')).toContain("include: ['tests/**/*.test.{ts,tsx}']");
    expect(files.some((f) => isTier2(f))).toBe(true);
    expect(files.some((f) => !isTier2(f))).toBe(true);
  });
});

describe('docs/testing.md states the standard', () => {
  const doc = read('docs/testing.md');
  for (const command of COMMANDS) it(`names ${command}`, () => expect(doc).toContain(command));
  it('names the Tier 2 file convention', () => {
    expect(doc).toContain('*.perf.test.ts(x)');
    expect(doc).toContain('tests/deep-*.test.ts(x)');
  });
  it('labels the three plan phases', () => {
    for (const tier of ['Tier 1', 'Tier 2', 'Tier 3']) expect(doc).toContain(tier);
  });
});
