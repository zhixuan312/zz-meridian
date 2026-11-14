// @vitest-environment node
// Tier 2 is reported, never a gate: a value is judged against the previous release (and the spread of the last releases,
// once three exist), the flag names the line, and nothing here fails anything — the exit is test:release's, and always 0
// for Tier 2.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { summaryLine } from '../scripts/lib/summary.ts';
import { changeText, clearParts, compare, HISTORY_FILE, readHistory, readParts, recordPart, RECORD_FILE, reportOrWarn, reportRun, staleBaseline, table, writeRecord, type History, type Value } from '../scripts/lib/tier2.ts';

const release = (version: string, values: Value[]): History['releases'][number] => ({ version, commit: 'abc', date: '2026-11-09', host: 'runner', rate: 3.6, values });
const seed = { 'vitals.frames': 50, 'vitals.lcp': 2.5, 'sizes.first-load': 830 };
const lcp = (s: number): Value => ({ check: 'vitals.lcp', page: '/', unit: 's', value: s });

describe('a Tier 2 value against its baseline', () => {
  it('flags a move past the provisional line before three releases exist, and does not flag one under it', () => {
    const history: History = { releases: [release('0.38.0', [lcp(1.0)])] };
    const flagged = compare(history, [lcp(1.4)], seed).rows[0]!;
    expect(flagged.flagged).toBe(true);
    expect(flagged.line).toContain('provisional');
    expect(changeText(flagged)).toBe('+40.0%');
    const under = compare(history, [lcp(1.1)], seed).rows[0]!;
    expect(under.flagged).toBe(false);
    expect(under.improved).toBe(false);
  });

  it('uses the measured spread once three releases exist, with the spread floored so a steady value cannot flag', () => {
    const steady = { releases: [release('0.38.0', [lcp(1.0)]), release('0.37.0', [lcp(1.0)]), release('0.36.0', [lcp(1.0)])] };
    // sd is 0: the floor (5% of the mean) is what decides, so 1.03 is inside and 1.2 is outside.
    expect(compare(steady, [lcp(1.03)], seed).rows[0]!.flagged).toBe(false);
    const moved = compare(steady, [lcp(1.2)], seed).rows[0]!;
    expect(moved.flagged).toBe(true);
    expect(moved.line).toContain('outside mean ±');
  });

  it('lists a CLS that fell as better, never as a flag, though it moved past the absolute line', () => {
    const history: History = { releases: [release('0.38.0', [{ check: 'vitals.cls', page: '/', unit: 'score', value: 0.1 }])] };
    const row = compare(history, [{ check: 'vitals.cls', page: '/', unit: 'score', value: 0 }], seed).rows[0]!;
    expect(row.flagged).toBe(false);
    expect(row.improved).toBe(true);
  });

  it('lists an improvement, and marks a value whose baseline came from the seed', () => {
    const history: History = { releases: [release('0.38.0', [lcp(1.0)])] };
    expect(compare(history, [lcp(0.6)], seed).rows[0]!.improved).toBe(true);
    const seeded = compare(null, [{ check: 'vitals.frames', page: '/', unit: 'ms', value: 30 }], seed);
    expect(seeded.seeded).toBe(true);
    expect(seeded.rows[0]!.previous).toBe(50);
    expect(table(seeded.rows, seeded.baselineVersion, seeded.seeded)[0]).toContain("Meridian's seed values, not this project's measurement");
  });

  it('sorts the table by change, largest rise first', () => {
    const history: History = { releases: [release('0.38.0', [lcp(1.0), { check: 'vitals.inp', page: '/', unit: 'ms', value: 100 }])] };
    const { rows, baselineVersion, seeded } = compare(history, [lcp(1.01), { check: 'vitals.inp', page: '/', unit: 'ms', value: 300 }], seed);
    const lines = table(rows, baselineVersion, seeded);
    expect(lines[1]).toContain('vitals.inp');
  });

  it('warns when the baseline is an older release than the previous tag', () => {
    const history: History = { releases: [release('0.37.0', [])] };
    expect(staleBaseline(history, 'v0.38.0')).toBe('baseline is 0.37.0, the previous release is v0.38.0; the comparison is against an older release');
    expect(staleBaseline(history, 'v0.37.0')).toBeUndefined();
  });
});

describe('the last line and the exit', () => {
  it('exits 0 with the warn line when only Tier 2 is over its line', () => {
    const r = summaryLine({ command: 'test:release', failed: [], notRun: [], declared: [], overBudget: ['vitals.lcp / +30%'], files: 10, tests: 20 });
    expect(r.exit).toBe(0);
    expect(r.line).toContain('Tier 2 over budget (reported, not failed): 1 — vitals.lcp / +30%');
  });

  it('exits 1 and names every failure together when a Tier 1 check failed, reporting Tier 2 too', () => {
    const r = summaryLine({ command: 'test:release', failed: ['the test suite', 'the lint check'], notRun: [], declared: [], overBudget: ['sizes.first-load / +7%'] });
    expect(r.exit).toBe(1);
    expect(r.line).toContain('FAIL: 2 checks failed: the test suite, the lint check');
    expect(r.line).toContain('Tier 2 over budget');
  });

  it('claims only what the command covers: test:t1 never says it ran Tier 2', () => {
    const r = summaryLine({ command: 'test:t1', failed: [], notRun: [], declared: [], overBudget: [], covers: 'every Tier 1 check', files: 3, tests: 9 });
    expect(r.exit).toBe(0);
    expect(r.line).toBe('test:t1: every Tier 1 check passed (3 test files, 9 tests)');
    expect(summaryLine({ command: 'test:release', failed: [], notRun: [], declared: [], overBudget: [] }).line).toBe('test:release: every Tier 1 and Tier 2 check passed');
  });

  it('keeps a declared not-run out of the failure count, and the run at 0', () => {
    const r = summaryLine({ command: 'test:t2', failed: [], notRun: [], declared: ['browser suites (navigation: no check)'], overBudget: [] });
    expect(r.exit).toBe(0);
    expect(r.line).toContain("not run by the project's configuration");
  });
});

describe('no stage hides the next', () => {
  it('release() collects failures and has no early return before its summary', () => {
    const runner = fs.readFileSync(path.join(import.meta.dirname, '..', 'scripts', 'test-run.ts'), 'utf8');
    // The function's own body: from its signature to the next top-level `}`.
    const body = /async function release\(\): Promise<number> \{([\s\S]*?)\n\}/.exec(runner)?.[1] ?? '';
    expect(body).not.toMatch(/return 1;/);
    expect(body).toContain('failed.push(');
    expect(body).toContain('summaryLine(');
  });
});

describe('the navigation boundary: function within a fixed patience, time reported', () => {
  it('keeps never-ready on the fixed patience constant and a slow-but-ready route on the reported budget', () => {
    const navigate = fs.readFileSync(path.join(import.meta.dirname, '..', 'scripts', 'navigate.ts'), 'utf8');
    const journey = fs.readFileSync(path.join(import.meta.dirname, '..', 'scripts', 'lib', 'journey.ts'), 'utf8');
    // The never-ready failure is bounded by PATIENCE, a named constant of its own (10 s desktop, 30 s phone), never by
    // a budget value; a slow-but-ready route is a time past a budget, which the run reports.
    expect(journey).toMatch(/const PATIENCE: Record<Device, number> = \{ desktop: 10_000, phone: 30_000 \}/);
    expect(journey).toContain('PATIENCE[device]');
    // A time past its budget goes to the reported list; only a function problem reaches `problems`, which decides FAIL.
    expect(navigate).toMatch(/line\.overBudget\.push/);
    expect(navigate).toMatch(/line\.problems\.push\(/);
  });
});

describe('the table after a deep-fixture run', () => {
  it('holds only this run\'s browser values: the parts are cleared before the browser stage', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tier2-parts-'));
    try {
      recordPart(root, 'navigate', [{ check: 'nav.shell', page: '/live-late-b phone', unit: 'ms', value: 196 }]);
      clearParts(root);
      recordPart(root, 'navigate', [{ check: 'nav.shell', page: '/ phone', unit: 'ms', value: 30 }]);
      expect(readParts(root).flatMap((p) => p.values).map((v) => v.page)).toEqual(['/ phone']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
    // And the command clears them before it starts the browser, where the fixtures' own runs stop mattering. That is the
    // behaviour the round-trip above proves; where in the file it is called is not a guarantee anyone can depend on, and
    // reading the source to check it is the pin `docs/testing.md` ("Behavior, not pins") asks for the removal of.
  });
});

describe('reporting inside a project, where there is no cli/', () => {
  it('writes the table and the record from a project-shaped directory, version from the manifest', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tier2-project-'));
    try {
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'acme', version: '0.1.0' }));
      fs.mkdirSync(path.join(root, '.meridian'), { recursive: true });
      fs.writeFileSync(path.join(root, '.meridian', 'manifest.json'), JSON.stringify({ version: '0.39.0' }));
      fs.mkdirSync(path.join(root, 'app'), { recursive: true });
      fs.writeFileSync(path.join(root, 'app', 'page.tsx'), 'export default function Page() { return null; }\n');
      execFileSync('git', ['init', '-q'], { cwd: root });
      execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', 'add', '-A'], { cwd: root });
      execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-qm', 'base'], { cwd: root });
      const { lines, flagged } = await reportRun({ root, values: [{ check: 'vitals.lcp', page: '/', unit: 's', value: 1 }], seed });
      expect(lines[0]).toContain("Meridian's seed values, not this project's measurement");
      expect(flagged).toEqual([]);
      expect(JSON.parse(fs.readFileSync(path.join(root, RECORD_FILE), 'utf8'))).toMatchObject({ version: '0.39.0', values: [{ check: 'vitals.lcp', page: '/' }] });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('turns a reporting error into a warn line, never a thrown failure', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tier2-project-'));
    try {
      fs.writeFileSync(path.join(root, 'package.json'), '{}');
      fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
      fs.writeFileSync(path.join(root, HISTORY_FILE), '{ not json');
      const { lines, flagged } = await reportOrWarn({ root, values: [{ check: 'vitals.lcp', page: '/', unit: 's', value: 1 }], seed });
      expect(flagged).toEqual([]);
      expect(lines[0]).toMatch(/^warn tier2: could not report: /);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('the record and its parts', () => {
  it('round-trips the history file and writes the record with its shape', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tier2-'));
    try {
      fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
      const history: History = { releases: [release('0.38.0', [lcp(1.0)])] };
      fs.writeFileSync(path.join(root, HISTORY_FILE), JSON.stringify(history));
      expect(readHistory(root)).toEqual(history);

      recordPart(root, 'vitals', [lcp(1.0)]);
      recordPart(root, 'sizes', [{ check: 'sizes.first-load', page: '/', unit: 'KiB', value: 700 }]);
      expect(readParts(root).map((p) => p.suite)).toEqual(['sizes', 'vitals']);
      const merged = readParts(root).flatMap((p) => p.values);
      writeRecord(root, { version: '0.39.0', commit: 'abc', date: '2026-11-10', host: 'runner', rate: 3.6, values: merged });
      const record = JSON.parse(fs.readFileSync(path.join(root, RECORD_FILE), 'utf8'));
      expect(record).toMatchObject({ version: '0.39.0', commit: 'abc', host: 'runner', rate: 3.6 });
      expect(record.values).toHaveLength(2);
      expect(record.values[0]).toMatchObject({ check: 'sizes.first-load', page: '/', unit: 'KiB', value: 700 });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
