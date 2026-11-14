// @vitest-environment node
// A check that judges a wall-clock window judges the machine when the suite puts a dozen browsers on eight cores.
// Measured on a product's own suite: a page that settled in 12.5 s with its check alone took 25.4 s inside the full
// run, and Tier 1 rows went red on a product that was fine. The run therefore holds a ceiling of browsers, weighting
// each job by what it opens; this is that scheduler, and it is pure so it can be judged without starting one.
import { describe, expect, it } from 'vitest';
import { capacityFrom, ceilingOf, pool } from '../scripts/lib/pool.ts';

/** A job that holds `weight` browsers for `ms`, counting what the pool has open at its peak. */
function tracked() {
  let open = 0;
  let peak = 0;
  const order: string[] = [];
  const job = (name: string, weight: number, ms: number) => ({
    weight,
    start: async () => {
      open += weight;
      peak = Math.max(peak, open);
      order.push(`start ${name}`);
      await new Promise((r) => setTimeout(r, ms));
      open -= weight;
      order.push(`end ${name}`);
      return name;
    },
  });
  return { job, peak: () => peak, order };
}

describe('the browser ceiling', () => {
  it('holds one browser per two cores, and never fewer than one', () => {
    expect(ceilingOf(8)).toBe(4);
    expect(ceilingOf(4)).toBe(2);
    expect(ceilingOf(2)).toBe(1);
    expect(ceilingOf(1)).toBe(1);
  });

  it('takes an explicit count, and falls back to the machine when the value is not one', () => {
    expect(capacityFrom('6', 8)).toBe(6);
    expect(capacityFrom('16', 8)).toBe(16);
    expect(capacityFrom(undefined, 8)).toBe(4);
    expect(capacityFrom('0', 8)).toBe(1);
    expect(capacityFrom('-2', 8)).toBe(1);
    expect(capacityFrom('lots', 8)).toBe(4);
    expect(capacityFrom('3.7', 8)).toBe(3);
  });
});

describe('the pool', () => {
  it('never holds more browsers open than the ceiling, weighting each job by what it opens', async () => {
    const t = tracked();
    const jobs = [t.job('a', 1, 20), t.job('b', 1, 20), t.job('c', 2, 20), t.job('d', 3, 20)];
    const out = await pool(jobs, 4);
    // Three units at most at once even though four jobs were asked for: c (2) and d (3) never overlap.
    expect(t.peak()).toBeLessThanOrEqual(4);
    expect(t.peak()).toBe(4);
    expect(out).toEqual(['a', 'b', 'c', 'd']);
  });

  it('runs a job that opens more browsers than the ceiling alone, rather than beside others', async () => {
    const t = tracked();
    const out = await pool([t.job('heavy', 12, 20), t.job('light', 1, 5)], 4);
    expect(out).toEqual(['heavy', 'light']);
    expect(t.order).toEqual(['start heavy', 'end heavy', 'start light', 'end light']);
  });

  it('keeps the declaration order of its results however the jobs interleave', async () => {
    const t = tracked();
    // Two at a time, so they finish in the order 5 ms, 15 ms, 30 ms — the reverse of how they were declared.
    const out = await pool([t.job('slow', 1, 30), t.job('fast', 1, 5), t.job('middle', 1, 15)], 2);
    expect(t.order.filter((l) => l.startsWith('end'))).toEqual(['end fast', 'end middle', 'end slow']);
    expect(out).toEqual(['slow', 'fast', 'middle']);
  });

  it('runs every job when one fails, and fails after them rather than at the first', async () => {
    const ran: string[] = [];
    const jobs = [
      { weight: 1, start: async () => { ran.push('first'); throw new Error('boom'); } },
      { weight: 1, start: async () => { ran.push('second'); return 'second'; } },
    ];
    await expect(pool(jobs, 4)).rejects.toThrow('boom');
    expect(ran).toEqual(['first', 'second']);
  });
});
