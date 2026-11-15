// @vitest-environment node
// The last-green marker decides which diff the next run proves. It used to be stamped with HEAD at the moment a run
// finished, so a commit made during the run was recorded as proven while nothing had tested it: on 2026-11-15 seven
// commits landed during a test:t2 and the next test:t1 printed "nothing changed since the last green run".
import { describe, expect, it } from 'vitest';
import { markerFor } from '../scripts/lib/marker.ts';

const START = 'a'.repeat(40);
const LATER = 'b'.repeat(40);

describe('what the last-green marker records', () => {
  it('records the commit the run read when it started, not the one current at its end', () => {
    expect(markerFor(START, LATER)).toEqual({ write: START, moved: LATER });
  });

  it('says nothing moved when the run began and ended on the same commit', () => {
    expect(markerFor(START, START)).toEqual({ write: START, moved: null });
  });

  it('still writes the start commit when a commit landed mid-run, so the new one stays unproven', () => {
    // The run passed on the old bytes; the newer commit must be the next run's work, not this run's claim.
    expect(markerFor(START, LATER).write).not.toBe(LATER);
  });
});
