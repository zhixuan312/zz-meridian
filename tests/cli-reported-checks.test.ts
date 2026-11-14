// @vitest-environment node
// Only Tier 1 turns a run red. Lint and the type check are Tier 3 and the contrast pairs are Tier 2: they run, what they
// find is named in the closing line, and nothing exits on it. One function decides which list a failure joins, so a call
// site cannot sort a check by the habit of the code around it.
import { describe, expect, it } from 'vitest';
import { record, summaryLine } from '../scripts/lib/summary.ts';

const at = () => ({ failed: [] as string[], reported: [] as string[] });

describe('where a failing check is counted', () => {
  it('reds the run for a Tier 1 failure and reports a Tier 2 or Tier 3 one', () => {
    const one = at();
    record(1, 'the test suite', 1, one);
    expect(one.failed).toEqual(['the test suite']);
    expect(one.reported).toEqual([]);

    const three = at();
    record(1, 'lint: eslint on 3 changed files', 3, three);
    expect(three.failed).toEqual([]);
    expect(three.reported).toEqual(['lint: eslint on 3 changed files']);

    const two = at();
    record(1, 'contrast holds in every theme and accent', 2, two);
    expect(two.failed).toEqual([]);
    expect(two.reported).toEqual(['contrast holds in every theme and accent']);
  });

  it('counts nothing for a check that passed, at any tier', () => {
    const none = at();
    for (const tier of [1, 2, 3] as const) record(0, 'a check that passed', tier, none);
    expect(none).toEqual({ failed: [], reported: [] });
  });
});

describe('the closing line names what was reported', () => {
  it('prints the reported checks beside the failures, and still exits 0 when nothing failed', () => {
    const r = summaryLine({ command: 'test:t1', failed: [], notRun: [], declared: [], overBudget: [], reported: ['lint: the changed files', 'the type check'], covers: 'every Tier 1 check', files: 3, tests: 9 });
    expect(r.exit).toBe(0);
    expect(r.line).toContain('reported, not failed: lint: the changed files, the type check');
    expect(r.line).toContain('every Tier 1 check passed');
  });

  it('still prints them when a Tier 1 check failed, so one red does not hide them', () => {
    const r = summaryLine({ command: 'test:release', failed: ['the test suite'], notRun: [], declared: [], overBudget: [], reported: ['audit (12 contrast, 3 touch target)'] });
    expect(r.exit).toBe(1);
    expect(r.line).toContain('FAIL: 1 check failed: the test suite');
    expect(r.line).toContain('reported, not failed: audit (12 contrast, 3 touch target)');
  });

  it('says nothing about reporting when nothing was reported', () => {
    expect(summaryLine({ command: 'test:t1', failed: [], notRun: [], declared: [], overBudget: [], reported: [] }).line).not.toContain('reported, not failed');
  });
});
