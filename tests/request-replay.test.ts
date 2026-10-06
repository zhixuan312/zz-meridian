// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const invalidated = vi.hoisted(() => [] as string[]);
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: (t: string) => { invalidated.push(t); }, revalidateTag: () => {} }));

import { replayRequest } from '../app/(dashboard)/requests/[id]/actions';
import { collectionFor, resolveAccess } from '@/data/access';
import { REQUESTS } from '@/system/fixtures/sample';

const failed = REQUESTS.find((r) => r.status >= 500)!;

describe('replaying a request', () => {
  it('sends the same request again: a new record, newest, that names the one it replays, and the list is refreshed', async () => {
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
});
