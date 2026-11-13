// @vitest-environment node
// Named cli-* so the payload leaves it out. It drives `adoptExit`, the decision adopt makes from the post-install type
// check, and not a real failing install: the lowest layer that holds the decision.
import { describe, expect, it } from 'vitest';
import { adoptExit } from '../cli/src/adopt.ts';

describe('adopt exit from the type check', () => {
  it('exits 1 when the type check fails', () => {
    expect(adoptExit('fails:\ntsc:\nsrc/a.ts(1,1): error TS2322')).toBe(1);
  });
  it('exits 0 when the type check passes', () => {
    expect(adoptExit('passes')).toBe(0);
  });
  it('exits 0 when the install was skipped and the type check did not run', () => {
    expect(adoptExit('not run (--no-install)')).toBe(0);
  });
});
