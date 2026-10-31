// @vitest-environment node
// The phone every timed suite emulates is one device on every host: the device of Lighthouse benchmarkIndex 800, the top
// of Lighthouse's Mid-Tier Mobile bracket (spec v7, FR-17). The rate scales with the host's own index (Lighthouse's advice
// is to fit the multiplier to the host; scaling it automatically is Meridian's), so a host slower than this machine is not
// slowed by this machine's factor (the Phase 3 diagnosis: the runner at a fixed 4x matched this machine at 8x to 12x).
import { describe, expect, it } from 'vitest';
import { phoneRate, rateFrom } from '../scripts/lib/phone.ts';

describe('phoneRate', () => {
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

// The weekly runner is slower than this laptop at the same rate, so a red only the week shows is reproduced here with --rate.
describe('rateFrom', () => {
  it('is 1 when nothing asks for a slower machine', () => expect(rateFrom(undefined)).toBe(1));
  it('takes a whole or a decimal number of times', () => {
    expect(rateFrom('1.6')).toBe(1.6);
    expect(rateFrom('2')).toBe(2);
  });
  it('refuses a phone faster than the standard, and anything that is no number', () => {
    for (const bad of ['0.5', '0', '-2', 'fast', '', '1.6x', 'Infinity']) expect(() => rateFrom(bad)).toThrow(/--rate takes/);
  });
});

