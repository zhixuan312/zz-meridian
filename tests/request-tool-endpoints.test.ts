// @vitest-environment node
// The request's own page treats the endpoints read as optional: `app/(dashboard)/requests/[id]/page.tsx` wraps it in
// `.catch(() => null)` and draws the record without the route comparison. The agent's view of the same record awaited it
// bare, so one failing read took the whole record from the assistant and the MCP view — a record the page still showed.
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/data/metrics', async (orig) => {
  const real = await orig<typeof import('@/data/metrics')>();
  return { ...real, readEndpoints: async (): Promise<never> => { throw new Error('the endpoints read failed'); } };
});
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ name: 'zz_meridian_view_as', value: 'members_1' }), set: () => {} }),
  headers: async () => new Headers(),
}));

import { read } from '@/data/read';
import { requestTool } from '@/logic/tools';
import { contextText } from '@/lib/shared-context';

describe('one request, when the endpoints read fails', () => {
  it('is still answered, with the route comparison named as absent rather than the record lost', async () => {
    const { rows } = await read('requests', { limit: 1 });
    const id = String(rows[0]!.id);
    const out = await requestTool.read({ id });
    const text = contextText(out.context);
    expect(id).toBeTruthy();
    // The record is there; the p95 comparison is not, and nothing claims it is.
    expect(text).not.toMatch(/× the p95 of/);
    expect(text.length).toBeGreaterThan(0);
  });
});
