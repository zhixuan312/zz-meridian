// @vitest-environment node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { finalOutcome, NOT_RUN_EXIT, suiteCoverage, suiteOutcome } from '../scripts/lib/coverage.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('a suite that ran nothing', () => {
  it('exits with the not-run code from scripts/live.ts, never 0', () => {
    const r = spawnSync(process.execPath, ['scripts/live.ts', '--base', 'http://127.0.0.1:9'], { cwd: ROOT, encoding: 'utf8' });
    expect(r.stdout).toMatch(/live: 0 ok, 0 FAIL, 6 not run/);
    expect(r.status).toBe(NOT_RUN_EXIT);
  });
  it('is not run to verify, never ok', () => {
    expect(suiteOutcome(0)).toBe('ok');
    expect(suiteOutcome(NOT_RUN_EXIT)).toBe('not run');
    expect(suiteOutcome(1)).toBe('FAIL');
    expect(suiteOutcome(null)).toBe('FAIL');
  });
  it('keeps --full from saying the project meets the standard while a suite did not run', () => {
    expect(finalOutcome(true, [])).toBe('the project meets the Meridian standard');
    expect(finalOutcome(true, ['live'])).toBe('every check that ran passed; not run: live');
    expect(finalOutcome(false, ['audit'])).toBe('every check that ran passed; pnpm verify --full runs the rest');
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
