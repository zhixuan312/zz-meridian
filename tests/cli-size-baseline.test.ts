// @vitest-environment node
// A size baseline a project inherited from the release is not its own promise: both size checks are declared not run
// against it, whatever Node measures, and that must not hold the last-green marker (run: an adopted project's t2 re-ran
// the whole tier for 142.06 s each time, where a marker that advanced costs 0.35 s).
import { describe, expect, it } from 'vitest';
import { declaredNotRun } from '../scripts/lib/coverage.ts';
import { sizeBaselineOwned } from '../scripts/lib/sizes.ts';

/** The shape a baseline has when a release copied it in: figures, and no recording mark. */
const inherited = { method: 'stats', routes: { '/': 1 }, html: { method: 'gzip', node: 22, routes: { '/': 1 } } } as unknown as { recordedBy?: string };

describe('the ownership of a size baseline', () => {
  it('is the project’s own recording only when a project Meridian manages stamped it with --write-baseline', () => {
    expect(sizeBaselineOwned({ baseline: { recordedBy: 'sizes.ts' }, managed: true })).toEqual({ owned: true });
    expect(sizeBaselineOwned({ baseline: inherited, managed: true })).toEqual({
      owned: false,
      reason: "the size baseline is the release's, not the project's; record the project's own with node scripts/sizes.ts --write-baseline --base <url>",
    });
    expect(sizeBaselineOwned({ baseline: null, managed: true })).toEqual({
      owned: false,
      reason: "the project has no scripts/verify.baseline.json; record the project's own with node scripts/sizes.ts --write-baseline --base <url>",
    });
  });

  it('leaves this repository alone: the template has no manifest and its baseline is the team’s own', () => {
    expect(sizeBaselineOwned({ baseline: inherited, managed: false })).toEqual({ owned: true });
    expect(sizeBaselineOwned({ baseline: null, managed: false })).toEqual({ owned: true });
  });
});

describe('the declared reasons', () => {
  it('names a size baseline the project did not record as declared, and says nothing is declared about a missing Chrome', () => {
    expect(declaredNotRun("the size baseline is the release's, not the project's; record the project's own with node scripts/sizes.ts --write-baseline --base <url>")).toBe(true);
    expect(declaredNotRun("the project has no scripts/verify.baseline.json; record the project's own with node scripts/sizes.ts --write-baseline --base <url>")).toBe(true);
    expect(declaredNotRun('no Chrome to start')).toBe(false);
    expect(declaredNotRun('baseline recorded on Node 22, this build used Node 26')).toBe(false);
  });
});
