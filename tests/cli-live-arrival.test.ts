// @vitest-environment node
// scripts/live.ts waits for a change to arrive, then judges it: the arrival is the requirement and its milliseconds are a
// Tier 2 value (docs/testing.md). A change shown late is a warn and the run exits 0; only one that never arrives within
// the patience fails. Run 42774379818's consumer red a live case on a slowed runner, which is what these hold apart.
import { describe, expect, it } from 'vitest';
import { liveSummary, verdictOf } from '../scripts/lib/live-arrival.ts';

describe("a live case's verdict", () => {
  it('is ok when the change showed within its latency line', () => {
    expect(verdictOf(1800, 1000, 2000)).toEqual({ status: 'ok', ms: 800 });
    expect(verdictOf(1000, 1000, 2000)).toEqual({ status: 'ok', ms: 0 });
  });

  it('is a warn, not a failure, when the change showed past its line', () => {
    expect(verdictOf(7200, 1000, 5000)).toEqual({ status: 'warn', ms: 6200 });
  });

  it('fails when the change never showed within the patience the caller waited', () => {
    expect(verdictOf(null, 1000, 5000)).toEqual({ status: 'FAIL', ms: Infinity });
  });
});

describe("the run's exit", () => {
  const outcome = (status: 'ok' | 'warn' | 'FAIL' | 'not run') => ({ status, text: '' });

  it('is 0 when a case arrived late, and the line counts it as a warn', () => {
    const { line, exit } = liveSummary([outcome('ok'), outcome('warn')], 3000);
    expect(exit).toBe(0);
    expect(line).toBe('live: 1 ok, 1 warn, 0 FAIL, 0 not run (poll 3000 ms)');
  });

  it('is 1 when a case failed, whatever else passed', () => {
    expect(liveSummary([outcome('ok'), outcome('warn'), outcome('FAIL')], 3000).exit).toBe(1);
  });

  it('is 2 when nothing failed and a case did not run, and 0 when nothing did', () => {
    expect(liveSummary([outcome('ok'), outcome('not run')], 3000).exit).toBe(2);
    expect(liveSummary([outcome('FAIL'), outcome('not run')], 3000).exit).toBe(1);
    expect(liveSummary([], 3000)).toEqual({ line: 'live: 0 ok, 0 warn, 0 FAIL, 0 not run (poll 3000 ms)', exit: 0 });
  });
});
