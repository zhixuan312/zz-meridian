// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const invalidated = vi.hoisted(() => [] as string[]);
const cacheFailure = vi.hoisted(() => ({ enabled: false }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: (t: string) => { invalidated.push(t); if (cacheFailure.enabled) throw new Error('owned cache invalidation fault'); }, revalidateTag: () => {} }));

import { replayRequest } from '../app/(dashboard)/requests/[id]/actions';
import { collectionFor, resolveAccess } from '@/data/access';
import { hasSample } from './sample-present';

// The records are the sample's own request log; a product that replaced the sample has none, so the cases over it are
// not applicable there rather than failing on an absent module (#131).
type Sample = typeof import('@/system/fixtures/sample');
const sample = hasSample()
  ? (await import(/* @vite-ignore */ new URL('../src/system/fixtures/sample.ts', import.meta.url).pathname)) as Sample
  : null;
const REQUESTS = sample?.REQUESTS ?? [];

const failed = REQUESTS.find((r) => r.status >= 500)!;

describe('replaying a request', () => {
  it.skipIf(!sample)('sends the same request again: a new record, newest, that names the one it replays, and the list is refreshed', async () => {
    const r = await replayRequest(failed.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.id).not.toBe(failed.id);
    const c = collectionFor(await resolveAccess(), 'requests');
    const { rows } = await c.query({ where: [{ field: 'id', op: 'eq', value: r.id }] });
    const replay = rows[0] as Record<string, unknown>;
    expect(replay).toMatchObject({ method: failed.method, route: failed.route, customer: failed.customer, region: failed.region, replayOf: failed.id, status: r.status });
    expect(replay.statusClass).toBe('2xx');
    expect(String(replay.search)).toContain(failed.route.toLowerCase());
    const newest = await c.query({ sort: { field: 'at', dir: 'desc' }, limit: 1 });
    expect(newest.rows[0].id).toBe(r.id);
    expect(invalidated.length).toBeGreaterThan(0);
  });
  it('answers a request that does not exist with a reason, and writes nothing', async () => {
    const c = collectionFor(await resolveAccess(), 'requests');
    const before = (await c.query({})).total;
    expect(await replayRequest('req_nope')).toEqual({ ok: false, error: 'No request with id req_nope.' });
    expect((await c.query({})).total).toBe(before);
  });
  it.skipIf(!sample)('refuses a request that did not fail, as the page does, and writes nothing', async () => {
    const ok = REQUESTS.find((r) => r.status < 400)!;
    const c = collectionFor(await resolveAccess(), 'requests');
    const before = (await c.query({})).total;
    expect(await replayRequest(ok.id)).toEqual({ ok: false, error: 'Only a request that failed for a while (a 5xx or a 429) can be replayed.' });
    expect((await c.query({})).total).toBe(before);
  });
});

it('keeps a committed replay successful when cache invalidation fails', async () => {
  const c = collectionFor(await resolveAccess(), 'requests');
  const before = (await c.query({})).total;
  cacheFailure.enabled = true;
  let result;
  try { result = await replayRequest(failed.id); } finally { cacheFailure.enabled = false; }
  expect((await c.query({})).total).toBe(before + 1);
  expect(result).toMatchObject({ ok: true, warning: expect.stringContaining('was saved') });
});
