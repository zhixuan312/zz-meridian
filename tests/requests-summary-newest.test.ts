// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

// Every query the log is read with, so the summary's own can be told from the page's.
const asked = vi.hoisted(() => [] as { sort?: unknown; limit?: number; offset?: number }[]);
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  return { ...real, read: async (name: string, q?: Record<string, unknown>) => { if (name === 'requests') asked.push({ ...q }); return real.read(name, q as never); } };
});

import { REQUEST_PAGE, readRequests } from '@/data/requests';

describe("the requests' summary", () => {
  it('reads the newest requests, whatever the table is sorted by', async () => {
    asked.length = 0;
    await readRequests({ sort: 'latency', dir: 'asc' });
    // The page asks for a page of rows; the summary asks for the most it reads.
    const summary = asked.find((q) => q.limit !== REQUEST_PAGE);
    expect(summary).toBeTruthy();
    expect(summary?.sort).toEqual({ field: 'at', dir: 'desc' });
  });
});
