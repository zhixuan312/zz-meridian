// @vitest-environment node
// `afterLive` starts its journey from a rail route that registers live data through the sample `LiveProvider`, so a product
// whose live layer is its own answers no route (zz-stack-dashboard's 0.39.3 run: 36 lines reading FAIL, all afterLive, on a
// run that was otherwise green). The condition then cannot measure that product at all, and the rule for a check that can
// measure nothing is to fix it or report it, never to leave it failing: it leaves the run once, by name, with the reason.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AFTER_LIVE_WHY, conditionsToRun } from '../scripts/lib/live-start.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONDITIONS = ['warm', 'cold', 'afterLive'] as const;

describe('which conditions a run measures', () => {
  it('runs all three when a rail route registers live data', () => {
    expect(conditionsToRun(CONDITIONS, ['/members', '/business'])).toEqual({ run: [...CONDITIONS], notApplicable: [] });
  });

  it('leaves afterLive out once, with the reason, when no rail route registers live data', () => {
    expect(conditionsToRun(CONDITIONS, [])).toEqual({
      run: ['warm', 'cold'],
      notApplicable: [{ condition: 'afterLive', why: AFTER_LIVE_WHY }],
    });
  });

  it('still measures warm and cold, which need no live route at all', () => {
    expect(conditionsToRun(CONDITIONS, []).run).toEqual(['warm', 'cold']);
  });

  it('says nothing about a condition the run never asked for', () => {
    expect(conditionsToRun(['warm', 'cold'], [])).toEqual({ run: ['warm', 'cold'], notApplicable: [] });
  });

  it('names the probe it looked for, so the line reads as an absent surface and not as a slow page', () => {
    expect(AFTER_LIVE_WHY).toContain('LiveProvider');
  });

  it('is what perf.ts decides its conditions with', () => {
    expect(fs.readFileSync(path.join(ROOT, 'scripts/perf.ts'), 'utf8')).toContain('conditionsToRun(CONDITIONS, live)');
  });
});
