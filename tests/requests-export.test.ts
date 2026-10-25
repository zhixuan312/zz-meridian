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
  it('queries nothing at all when the request was already aborted', async () => {
    // The case above counts pulls, and a cancelled reader stops those by itself: it holds whatever the route does with
    // the signal. This one asks the stream for its first chunk with the signal already aborted, where the route's own
    // check is the only thing between the request and a query.
    const spy = vi.spyOn(requests, 'query');
    const ac = new AbortController();
    ac.abort();
    const res = await get('', ac.signal);
    const first = await res.body!.getReader().read();
    spy.mockRestore();
    expect(first.done).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });
  it('writes every row even when the collection answers fewer than the batch it was asked for', async () => {
    // A product's own collection may have a page size of its own. The stream moves by what came back, so a short batch
    // leaves no gap: advancing by the size it asked for skipped the rows in between and the export said nothing.
    const real = requests.query.bind(requests);
    const spy = vi.spyOn(requests, 'query').mockImplementation((async (q: Parameters<typeof real>[0] = {}) => real({ ...q, limit: Math.min(q.limit ?? 40, 40) })) as typeof requests.query);
    const { total } = await real({ where: [{ field: 'statusClass', op: 'eq', value: '2xx' }] });
    const res = await get('?status=2xx');
    const lines = (await res.text()).trimEnd().split('\r\n');
    spy.mockRestore();
    expect(lines).toHaveLength(total + 1);
    // Every row once: no id appears twice, and none is missing.
    expect(new Set(lines.slice(1).map((l) => l.split(',')[0])).size).toBe(total);
  });
  it('ends the stream when a collection counts rows it will not return', async () => {
    // A total of 500 and nothing back: the stream must close rather than ask again forever, and the file is its header.
    const spy = vi.spyOn(requests, 'query').mockResolvedValue({ rows: [], total: 500 });
    const res = await get('');
    const text = await res.text();
    spy.mockRestore();
    expect(text.split('\r\n').filter(Boolean)).toHaveLength(1);
    expect(text.split(',')[0]).toBe('id');
  });
  it('answers 401 without a session', async () => {
    session.signedIn = false;
    try { expect((await get('')).status).toBe(401); } finally { session.signedIn = true; }
  });
});
