// @vitest-environment node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { finalOutcome, NOT_RUN_EXIT, suiteCoverage, suiteOutcome } from '../scripts/lib/coverage.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('a suite that ran nothing', () => {
  it('exits with the not-run code from scripts/live.ts, never 0', () => {
    const r = spawnSync(process.execPath, ['scripts/live.ts', '--base', 'http://127.0.0.1:9'], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 });
    expect(r.stdout).toMatch(/live: 0 ok, 0 FAIL, [1-9]\d* not run/);
    expect(r.status).toBe(NOT_RUN_EXIT);
  });
  it('is not run to verify, never ok', () => {
    expect(suiteOutcome(0)).toBe('ok');
    expect(suiteOutcome(NOT_RUN_EXIT)).toBe('not run');
    expect(suiteOutcome(1)).toBe('FAIL');
    expect(suiteOutcome(null)).toBe('FAIL');
  });
  it('is a warning when a suite passed and printed a warn line, and a failure whatever it printed when it failed', () => {
    expect(suiteOutcome(0, 'ok   /\nwarn /requests LCP 2.21 s\n  within 20% of the LCP floor\nvitals: 2 of 2')).toBe('warn');
    expect(suiteOutcome(0, 'ok   /\n  a warning in a sentence, not a line\nvitals: 1 of 1')).toBe('ok');
    expect(suiteOutcome(1, 'warn /\nFAIL /requests')).toBe('FAIL');
    expect(suiteOutcome(NOT_RUN_EXIT, 'warn /')).toBe('not run');
  });
  it('keeps --full --timed from saying the project meets the standard while a suite did not run', () => {
    expect(finalOutcome({ full: true, timed: true }, [])).toBe('the project meets the Meridian standard');
    expect(finalOutcome({ full: true, timed: true }, ['live'])).toBe('every check that ran passed; not run: live');
    expect(finalOutcome({ full: false, timed: false }, ['audit'])).toBe('every check that ran passed; pnpm verify --full --timed runs the rest');
  });
});

describe('the suites the coverage line names', () => {
  it('lists a suite that failed as failed, not as not run', () => {
    const suites = ['audit', 'presses', 'keyboard', 'live', 'vitals'];
    expect(suiteCoverage(suites, new Set(['presses', 'keyboard', 'vitals']), new Set(['audit']))).toEqual({ notRun: ['live'], failed: ['audit'] });
  });
  it('counts a suite that passed one run and failed another as failed only', () => {
    expect(suiteCoverage(['assistant'], new Set(['assistant']), new Set(['assistant']))).toEqual({ notRun: [], failed: ['assistant'] });
  });
});
