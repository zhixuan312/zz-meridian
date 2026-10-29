// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

// The summary reads ten requests, a size at which the two usual ranks name different rows; a page is 20 (REQUEST_PAGE).
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  return { ...real, read: async (name: string, q?: { limit?: number }) => {
    const page = await real.read(name, q as never);
    return name === 'requests' && q?.limit !== 20 ? { ...page, rows: page.rows.slice(0, 10).map((r, i) => ({ ...r, latency: (i + 1) * 100 })) } : page;
  } };
});

import { readRequests } from '@/data/requests';
import { aggregateRows } from '@/lib/collection';

describe('Latency p95', () => {
  it('is the value the prepared query answers for the same requests', async () => {
    const { summary } = await readRequests({});
    const rows = Array.from({ length: 10 }, (_, i) => ({ latency: (i + 1) * 100 }));
    const asked = aggregateRows(rows, { measures: [{ name: 'p95', agg: 'p95', field: 'latency' }] }).total.values.p95;
    expect(asked).toBe(1000);
    expect(summary.p95).toBe(asked);
  });
});
