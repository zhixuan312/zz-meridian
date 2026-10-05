// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {} }));
const session = vi.hoisted(() => ({ signedIn: true }));
vi.mock('@/data/access', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/access')>();
  return { ...real, resolveAccess: async () => { if (!session.signedIn) throw new real.Unauthenticated(); return real.resolveAccess(); } };
});

import { GET } from '../app/api/export/requests/route';
import { requests } from '@/data/collections';

const get = (q: string, signal?: AbortSignal) => GET(new Request(`http://localhost/api/export/requests${q}`, { signal }));

describe('GET /api/export/requests', () => {
  it('streams the whole authorized filtered set, not one page, in bounded batches', async () => {
    const { total } = await requests.query({ where: [{ field: 'statusClass', op: 'eq', value: '2xx' }] });
    expect(total).toBeGreaterThan(100);
    const spy = vi.spyOn(requests, 'query');
    const res = await get('?status=2xx');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^text\/csv/);
    expect(res.headers.get('content-disposition')).toMatch(/attachment; filename="requests[^"]*\.csv"/);
    const lines = (await res.text()).trimEnd().split('\r\n');
    const batches = spy.mock.calls.map((c) => c[0]?.limit ?? Infinity);
    spy.mockRestore();
    expect(lines).toHaveLength(total + 1);
    expect(lines[0].split(',')).toContain('status');
    expect(batches.length).toBeGreaterThan(1);
    expect(Math.max(...batches)).toBeLessThanOrEqual(100);
  });
  it('stops querying once the download is cancelled', async () => {
    const { total } = await requests.query({});
    const spy = vi.spyOn(requests, 'query');
    const ac = new AbortController();
    const res = await get('', ac.signal);
    const reader = res.body!.getReader();
    await reader.read();
    ac.abort();
    await reader.cancel().catch(() => {});
    await new Promise((r) => setTimeout(r, 50));
    const called = spy.mock.calls.length;
    spy.mockRestore();
    expect(called).toBeLessThan(Math.ceil(total / 100));
  });
  it('answers 401 without a session', async () => {
    session.signedIn = false;
    try { expect((await get('')).status).toBe(401); } finally { session.signedIn = true; }
  });
});
