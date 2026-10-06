// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {} }));
const session = vi.hoisted(() => ({ signedIn: true }));
vi.mock('@/data/access', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/access')>();
  return { ...real, resolveAccess: async () => { if (!session.signedIn) throw new real.Unauthenticated(); return real.resolveAccess(); } };
});

import { GET } from '../app/api/live/route';
import { liveStream } from '@/data/live-stream';
import { members } from '@/data/collections';
import { arrayCollection, liveListeners } from '@/lib/collection';

/** Reads a stream in the background, so a test can look at what arrived so far without losing a chunk. */
function tap(res: Response) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  const state = { text: '', done: false };
  void (async () => {
    for (;;) {
      const chunk = await reader.read().catch(() => ({ done: true as const, value: undefined }));
      if (chunk.done) { state.done = true; return; }
      state.text += dec.decode(chunk.value);
    }
  })();
  return { state, cancel: () => reader.cancel().catch(() => {}) };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const open = (q: string, signal?: AbortSignal) => GET(new Request(`http://localhost/api/live${q}`, { signal }));
const newcomer = () => ({ name: 'Lin Ito', email: 'lin@northwind.example', role: 'Member', team: 'Engineering', status: 'Invited', joined: '2026-10-05', lastActive: null });
const people = (tenantId: string) => arrayCollection({
  name: 'people', label: 'People', description: 'People in a tenant.', key: 'id', title: (r: { name: string }) => r.name,
  fields: z.object({ name: z.string().min(1) }), rows: [] as { id: string; name: string }[], allow: ['create'], tenantId,
});

describe('GET /api/live', () => {
  it('opens with retry and a resync, sends one minimized hint per change, and lets go on abort', async () => {
    const ac = new AbortController();
    const res = await open('?collections=members,keys', ac.signal);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^text\/event-stream/);
    expect(res.headers.get('cache-control')).toBe('no-cache, no-transform');
    const t = tap(res);
    await vi.waitFor(() => expect(t.state.text).toContain('event: resync'));
    expect(t.state.text.startsWith('retry: 3000\n')).toBe(true);
    expect(t.state.text).toContain('data: {"collections":["members","keys"]}');
    expect(liveListeners('demo', 'members')).toBeGreaterThan(0);
    await members.create!(newcomer());
    await vi.waitFor(() => expect(t.state.text).toContain('event: change\ndata: {"collection":"members"}'));
    expect(t.state.text).not.toMatch(/^id:/m);
    expect(t.state.text).not.toMatch(/mem_|collection:[0-9a-f]{64}|demo/);
    ac.abort();
    await t.cancel();
    await vi.waitFor(() => expect(liveListeners('demo', 'members')).toBe(0));
  });
  it('rejects a malformed, an empty, an oversized and a forbidden request', async () => {
    expect((await open('')).status).toBe(400);
    expect((await open('?collections=')).status).toBe(400);
    expect((await open(`?collections=${Array.from({ length: 51 }, (_, i) => `c${i}`).join(',')}`)).status).toBe(400);
    const forbidden = await open('?collections=members,secrets');
    expect(forbidden.status).toBe(403);
    expect(await forbidden.text()).not.toContain('secrets');
  });
  it('answers 401 without a session', async () => {
    session.signedIn = false;
    try { expect((await open('?collections=members')).status).toBe(401); } finally { session.signedIn = true; }
  });
});

describe('liveStream', () => {
  it('beats at the interval it is given', async () => {
    const ac = new AbortController();
    const t = tap(liveStream({ names: ['members'], collections: [members], signal: ac.signal, heartbeatMs: 20, authorize: async () => true }));
    await vi.waitFor(() => expect(t.state.text).toMatch(/: beat \d+/));
    ac.abort();
    await t.cancel();
  });
  it('beats every 15 s by default, with a comment that carries no event and no data', async () => {
    vi.useFakeTimers();
    try {
      const ac = new AbortController();
      const t = tap(liveStream({ names: ['members'], collections: [members], signal: ac.signal, authorize: async () => true }));
      await vi.advanceTimersByTimeAsync(0);
      expect(t.state.text).toContain('event: resync');
      expect(t.state.text).not.toMatch(/: beat/);
      await vi.advanceTimersByTimeAsync(14_999);
      expect(t.state.text).not.toMatch(/: beat/);
      await vi.advanceTimersByTimeAsync(1);
      expect(t.state.text.match(/: beat \d+\n\n/g)).toHaveLength(1);
      const afterResync = t.state.text.slice(t.state.text.indexOf('event: resync'));
      expect(afterResync.match(/^event:/gm)).toHaveLength(1);
      expect(afterResync.match(/^data:/gm)).toHaveLength(1);
      ac.abort();
      await t.cancel();
    } finally { vi.useRealTimers(); }
  });
  it('never delivers a change from another tenant’s collection of the same name', async () => {
    const a = people('tenant-a');
    const b = people('tenant-b');
    const ac = new AbortController();
    const t = tap(liveStream({ names: ['people'], collections: [b], signal: ac.signal, authorize: async () => true }));
    await vi.waitFor(() => expect(t.state.text).toContain('event: resync'));
    await a.create!({ name: 'Grace' });
    await sleep(100);
    expect(t.state.text).not.toContain('event: change');
    await b.create!({ name: 'Ada' });
    await vi.waitFor(() => expect(t.state.text).toContain('event: change\ndata: {"collection":"people"}'));
    ac.abort();
    await t.cancel();
  });
  it('ends the stream when the scope may no longer read what it subscribed to', async () => {
    let allowed = true;
    const ac = new AbortController();
    const t = tap(liveStream({ names: ['members'], collections: [members], signal: ac.signal, authorize: async () => allowed }));
    await vi.waitFor(() => expect(t.state.text).toContain('event: resync'));
    allowed = false;
    await members.create!(newcomer());
    await vi.waitFor(() => expect(t.state.done).toBe(true));
    expect(t.state.text).not.toContain('event: change');
    ac.abort();
  });
});
