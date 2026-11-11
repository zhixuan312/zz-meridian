// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { deepBrowserNotRun, verdictTag, vitalsSummary } from '../scripts/lib/report-lines.ts';

// The lines a run ends with are evidence: a failed check printed as ok, or a stage that never ran printed as a pass,
// is the defect these pin.
describe("a run's closing lines", () => {
  it('prints a FAIL as FAIL, a warn as warn, and a pass as ok', () => {
    expect(verdictTag('FAIL')).toBe('FAIL   ');
    expect(verdictTag('warn')).toBe('warn   ');
    expect(verdictTag('ok')).toBe('ok     ');
  });

  it('owes the browser-fixture stage when it was needed and could not run, so the line never says passed', () => {
    expect(deepBrowserNotRun(true, false)).toEqual(['Tier 1 browser-fixture tests (no Chrome)']);
    expect(deepBrowserNotRun(true, true)).toEqual([]);
    expect(deepBrowserNotRun(false, false)).toEqual([]);
  });

  it('counts pages over a vitals floor apart from those merely near one', () => {
    expect(vitalsSummary(30, 0, 2, 3)).toBe('vitals: 28 of 30 pages under LCP 2.5 s, INP 200 ms, CLS 0.1 and no dropped frame on a mid-range phone; 2 over a floor; 3 within 20% of a floor');
    expect(vitalsSummary(30, 0, 0, 0)).toBe('vitals: 30 of 30 pages under LCP 2.5 s, INP 200 ms, CLS 0.1 and no dropped frame on a mid-range phone');
  });
});
