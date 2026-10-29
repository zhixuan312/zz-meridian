// @vitest-environment node
// A live page's first open asks again only for what moved since the server read it (#53): the stream greets `synced`
// when every collection's revision is the one the page was served, and `resync` naming each that moved, so a write
// between the server's read and the stream's subscription is never lost.
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { GET } from '../app/api/live/route';
import { liveStream } from '@/data/live-stream';
import { arrayCollection } from '@/lib/collection';

function tap(res: Response) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  const state = { text: '' };
  void (async () => {
    for (;;) {
      const chunk = await reader.read().catch(() => ({ done: true as const, value: undefined }));
      if (chunk.done) return;
      state.text += dec.decode(chunk.value);
    }
  })();
  return { state, cancel: () => reader.cancel().catch(() => {}) };
}
const people = (tenantId: string) => arrayCollection({
  name: 'people', label: 'People', description: 'People in a tenant.', key: 'id', title: (r: { name: string }) => r.name,
  fields: z.object({ name: z.string().min(1) }), rows: [] as { id: string; name: string }[], allow: ['create'], tenantId,
});
const open = (c: ReturnType<typeof people>, since?: Record<string, string>) => {
  const ac = new AbortController();
  return { ac, t: tap(liveStream({ names: ['people'], collections: [c], signal: ac.signal, authorize: async () => true, since })) };
};

describe('a first open with the revisions the server read', () => {
  it('greets synced when nothing moved, and reads nothing again', async () => {
    const c = people('resume-a');
    const { ac, t } = open(c, { people: c.revision!() });
    await vi.waitFor(() => expect(t.state.text).toContain('event: synced'));
    expect(t.state.text).not.toContain('event: resync');
    ac.abort(); await t.cancel();
  });
  it('names a collection written between the read and the open', async () => {
    const c = people('resume-b');
    const served = c.revision!();
    await c.create!({ name: 'Ada' });
    const { ac, t } = open(c, { people: served });
    await vi.waitFor(() => expect(t.state.text).toContain('event: resync\ndata: {"collections":["people"]}'));
    ac.abort(); await t.cancel();
  });
  it('resyncs every name without since, and when the process restarted', async () => {
    const c = people('resume-c');
    const none = open(c);
    await vi.waitFor(() => expect(none.t.state.text).toContain('event: resync'));
    none.ac.abort(); await none.t.cancel();
    const elsewhere = open(c, { people: `another-boot:${c.revision!().split(':')[1]}` });
    await vi.waitFor(() => expect(elsewhere.t.state.text).toContain('event: resync'));
    elsewhere.ac.abort(); await elsewhere.t.cancel();
  });
  it('refuses a malformed since', async () => {
    expect((await GET(new Request('http://localhost/api/live?collections=members&since=members'))).status).toBe(400);
    expect((await GET(new Request('http://localhost/api/live?collections=members&since=keys:b:1'))).status).toBe(400);
  });
});
