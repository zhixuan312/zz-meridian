// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

// A young product: 120 complete days kept, and the day in progress.
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  return { ...real, readAll: async (name: string, q?: object) => {
    const all = await real.readAll(name, q as never);
    return name === 'days' ? { ...all, rows: all.rows.slice(-121) } : all;
  } };
});

import { readDays } from '@/data/metrics';

describe('a period is compared only with a whole period before it', () => {
  it('has no previous period where fewer days than its own are kept before it', async () => {
    const ninety = await readDays('90d');
    expect(ninety.series).toHaveLength(90);
    expect(ninety.previous).toEqual([]);
    expect(ninety.totals.previous).toBeNull();
    const thirty = await readDays('30d');
    expect(thirty.previous).toHaveLength(30);
    expect(thirty.totals.previous).not.toBeNull();
  });
});
