// @vitest-environment node
// The phone every timed suite emulates is one device on every host: the device of Lighthouse benchmarkIndex 800, the top
// of Lighthouse's Mid-Tier Mobile bracket (spec v7, FR-17). The rate scales with the host's own index (Lighthouse's advice
// is to fit the multiplier to the host; scaling it automatically is Meridian's), so a host slower than this machine is not
// slowed by this machine's factor (the Phase 3 diagnosis: the runner at a fixed 4x matched this machine at 8x to 12x).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TARGET_INDEX, phoneRate } from '../scripts/lib/phone.ts';

describe('phoneRate', () => {
  it('targets the top of the Mid-Tier Mobile bracket', () => expect(TARGET_INDEX).toBe(800));
  it("leaves a host of the phone's own index unslowed", () => expect(phoneRate(800)).toBe(1));
  it("slows a host by its index over the phone's, to one decimal", () => {
    expect(phoneRate(4427)).toBe(5.5);
    expect(phoneRate(1760)).toBe(2.2);
  });
  it('has no ceiling', () => expect(phoneRate(16000)).toBe(20));
  it('never speeds a host up', () => expect(phoneRate(400)).toBe(1));
  it('refuses a reading that is no benchmark', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(() => phoneRate(bad)).toThrow(/benchmark index/);
  });
});

describe('the timed suites take the phone from it', () => {
  it('verify shows the rate under the navigation and under each suite', () => {
    const text = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'scripts/verify.ts'), 'utf8');
    expect(text).toMatch(/startsWith\('phone:'\)/);
    // The helper's definition and its two callers: the navigation phase and reportSuite.
    expect(text.match(/\bphoneLines\(/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
  for (const rel of ['scripts/vitals.ts', 'scripts/lib/journey.ts']) {
    it(rel, () => {
      const text = fs.readFileSync(path.resolve(import.meta.dirname, '..', rel), 'utf8');
      expect(text).not.toMatch(/setCPUThrottlingRate', \{ rate: (4\b|device === 'phone' \? 4\b)/);
      expect(text).toMatch(/from '\.\/(lib\/)?phone\.ts'/);
      expect(text).toMatch(/\bmeasurePhone\(/);
    });
  }
});
