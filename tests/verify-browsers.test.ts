import { describe, expect, it } from 'vitest';
import { browserCeiling, slots } from '../scripts/lib/slots.ts';

const GiB = 2 ** 30;
const tick = () => new Promise((r) => setTimeout(r, 5));

/** One verify run holds no more browsers at once than its ceiling (#77). */
describe('the browser ceiling', () => {
  it('is what the machine holds: a browser per two CPUs and per 4 GiB, whichever is fewer, at least one', () => {
    expect(browserCeiling(10, 32 * GiB)).toBe(5);
    expect(browserCeiling(4, 15.6 * GiB)).toBe(2);
    expect(browserCeiling(16, 8 * GiB)).toBe(2);
    expect(browserCeiling(1, 1 * GiB)).toBe(1);
  });

  it('starts a suite only when the browsers it asks for are free, and frees them however it ends', async () => {
    const hold = slots(3);
    let open = 0;
    let most = 0;
    const suite = (want: number, fail = false) =>
      hold(want, async () => {
        open += Math.min(want, 3);
        most = Math.max(most, open);
        await tick();
        open -= Math.min(want, 3);
        if (fail) throw new Error('red');
        return want;
      });
    const runs = await Promise.allSettled([suite(1, true), suite(1), suite(1), suite(2), suite(9)]);
    expect(most).toBeLessThanOrEqual(3);
    expect(runs.map((r) => r.status)).toEqual(['rejected', 'fulfilled', 'fulfilled', 'fulfilled', 'fulfilled']);
    expect(await hold(1, async () => 'free again')).toBe('free again');
  });
});
