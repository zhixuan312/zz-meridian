import { describe, expect, it } from 'vitest';
import { FN_SWEEPS, sweepsFor, timedOutcome } from '../scripts/lib/browser-plan.ts';

describe('which browser suites a run judges', () => {
  it('runs every function sweep without --only, and exactly the named one with it', () => {
    expect([...sweepsFor(undefined)].sort()).toEqual([...FN_SWEEPS].sort());
    for (const s of FN_SWEEPS) expect([...sweepsFor(s)]).toEqual([s]);
    expect(() => sweepsFor('perf')).toThrow(/audit.*interactions.*keyboard.*rest/);
  });

  it('never turns a timed FAIL into a failure', () => {
    expect(timedOutcome('FAIL')).toBe('reported');
    expect(timedOutcome('ok')).toBe('ok');
    expect(timedOutcome('not run')).toBe('not run');
  });
});
