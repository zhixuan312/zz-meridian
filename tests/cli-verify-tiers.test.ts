// @vitest-environment node
// verify's suites are named once, by tier; the outcome sentence says what ran and which command runs the rest; and the
// options are refused before the gate, so a refusal costs nothing.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPLETE_SUITES, finalOutcome, SUITE_NAMES, TIMED_SUITES } from '../scripts/lib/coverage.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const verify = (...args: string[]) => spawnSync(process.execPath, ['scripts/verify.ts', ...args], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 });

describe('the suites, by tier', () => {
  it('names the complete tier, then the timed tier, then perf', () => {
    expect([...COMPLETE_SUITES]).toEqual(['audit', 'presses', 'keyboard', 'assistant', 'browserChecks']);
    expect([...TIMED_SUITES]).toEqual(['timing', 'live', 'timedChecks', 'vitals']);
    expect([...SUITE_NAMES]).toEqual([...COMPLETE_SUITES, ...TIMED_SUITES, 'perf']);
  });

  it('is written once: verify builds its list from the export', () => {
    const source = fs.readFileSync(path.join(ROOT, 'scripts/verify.ts'), 'utf8');
    expect(source).toMatch(/\bSUITE_NAMES\b/);
    expect(source).not.toMatch(/\[\s*'audit',\s*'presses'/);
  });
});

describe('the outcome sentence', () => {
  const timed = [...TIMED_SUITES];
  const complete = [...COMPLETE_SUITES];

  it('meets the standard only when nothing was left unrun', () => {
    expect(finalOutcome({ full: true, timed: true }, [])).toBe('the project meets the Meridian standard');
  });

  it('names both commands when neither tier was asked for, --perf alone included', () => {
    expect(finalOutcome({ full: false, timed: false }, [...complete, ...timed])).toBe('every check that ran passed; pnpm verify --full --timed runs the rest');
  });

  it('names --timed after a complete check that left only the timed tier', () => {
    expect(finalOutcome({ full: true, timed: false }, timed)).toBe('every check that ran passed; not run: timing, live, timedChecks, vitals; pnpm verify --timed runs them');
  });

  it('names --full after a timed check that left only the complete tier', () => {
    expect(finalOutcome({ full: false, timed: true }, complete)).toBe('every check that ran passed; not run: audit, presses, keyboard, assistant, browserChecks; pnpm verify --full runs them');
  });

  it('names no command when a suite of an asked-for tier did not run', () => {
    expect(finalOutcome({ full: true, timed: false }, ['assistant', ...timed])).toBe('every check that ran passed; not run: assistant, timing, live, timedChecks, vitals');
    expect(finalOutcome({ full: true, timed: true }, ['live'])).toBe('every check that ran passed; not run: live');
  });
});

describe('the options', () => {
  it('refuses --as beside --timed before the gate', () => {
    const r = verify('--as', 'viewer', '--timed');
    const out = `${r.stdout}${r.stderr}`;
    expect(r.status).toBe(1);
    expect(out).toContain('verify: --as cannot be combined with --perf or --timed. Run pnpm verify --as <persona> on its own.');
    expect(out).not.toMatch(/\bgate \(/);
  });

  it('refuses an unknown option, naming every option it takes', () => {
    const r = verify('--bogus');
    expect(r.status).toBe(1);
    // Every one, `--shard` included: it was missing from the list, so a person reading the refusal was not told the
    // option that would have run their command.
    expect(`${r.stdout}${r.stderr}`).toContain('pnpm verify takes --full, --timed, --perf, --as, --browsers, --rate, --shard.');
  });

  it('refuses a --rate that would make the phone faster than the standard, before the gate', () => {
    for (const bad of ['0.5', 'fast', '']) {
      const r = verify('--timed', '--rate', bad);
      expect(r.status).toBe(1);
      expect(`${r.stdout}${r.stderr}`).toContain(`verify: --rate takes how many times more to slow the phone, a number of at least 1, not "${bad}".`);
      expect(`${r.stdout}${r.stderr}`).not.toMatch(/\bgate \(/);
    }
  });
});
