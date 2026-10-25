// @vitest-environment node
// Named cli-* so the payload leaves it out. What it holds is the behaviour of this repository's own team-owned files —
// `app/(dashboard)/members/actions.ts`, `app/(dashboard)/settings/actions.ts` and `app/api/export/requests/route.ts` —
// which an update leaves exactly as a project has them. A shipped test cannot pin it: a project created at 0.29.0 and
// updated to 0.30.0 has this release's test and its own older action, and its gate fails on a sentence the project was
// never given. That is what 0.30.0's consumer smoke found. So the shipped files assert only what every generation shares
// (that a failed write refuses and invalidates nothing, that an export covers every row), and these assert the rest.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const cache = vi.hoisted(() => ({ updated: [] as string[] }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: (t: string) => { cache.updated.push(t); }, revalidateTag: () => {} }));
const session = vi.hoisted(() => ({ signedIn: true }));
vi.mock('@/data/access', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/access')>();
  return { ...real, resolveAccess: async () => { if (!session.signedIn) throw new real.Unauthenticated(); return real.resolveAccess(); } };
});

import { collections, members, requests } from '@/data/collections';
import { setMemberStatus } from '../app/(dashboard)/members/actions';
import { saveWorkspace } from '../app/(dashboard)/settings/actions';
import { GET } from '../app/api/export/requests/route';

const get = (q: string) => GET(new Request(`http://localhost/api/export/requests${q}`));

beforeEach(() => { cache.updated.length = 0; });

describe('a write that throws', () => {
  it('answers the sentence this action chose, not the one the collection threw', async () => {
    // A driver's message is not the person's to read. Both actions that turn a thrown write into a sentence are held
    // here, because the same rule has to hold in each of them.
    const membersSpy = vi.spyOn(members, 'update').mockRejectedValueOnce(new Error('duplicate key value violates unique constraint "members_email_key"'));
    const id = String((await members.query({})).rows.find((m) => m.role === 'Member' && m.status === 'Active')!.id);
    const r = await setMemberStatus(id, 'Suspended');
    membersSpy.mockRestore();
    expect(r).toEqual({ ok: false, error: 'The change did not go through.' });
    expect(cache.updated).toEqual([]);

    const workspace = collections.find((c) => c.name === 'workspace')!;
    const workspaceSpy = vi.spyOn(workspace, 'update').mockRejectedValueOnce(new Error('relation "workspace" does not exist'));
    const w = await saveWorkspace({ name: 'Acme Staging' });
    workspaceSpy.mockRestore();
    expect(w).toEqual({ ok: false, error: 'The change did not go through.' });
  });
});

describe('GET /api/export/requests', () => {
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
});
