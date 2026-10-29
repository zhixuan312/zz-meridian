// @vitest-environment node
// Named cli-* so the payload leaves it out: src/data/live-stream.ts is a starter, the team's once a project has it, and a
// project created before 0.31.1 keeps its own copy, which the shipped tests must not hold to this release's.
import { describe, expect, it, vi } from 'vitest';
import { liveStream } from '@/data/live-stream';
import { members } from '@/data/collections';

/** Reads a stream in the background: what arrived, and whether it ended. */
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
  return state;
}

describe('liveStream on a server told to stop', () => {
  it('ends every open stream, so a tab reconnects to the server that replaces it', async () => {
    // A server that stops closes its port and waits for its open connections; a stream it never ended kept the old
    // process, and every tab's stream with it, while a new server answered the port.
    const ac = new AbortController();
    const open = () => tap(liveStream({ names: ['members'], collections: [members], signal: ac.signal, authorize: async () => true }));
    const streams = [open(), open()];
    await vi.waitFor(() => expect(streams.every((t) => t.text.includes('event: resync'))).toBe(true));
    // The stream's own listener, called as the signal would call it. Emitting the signal would run every other listener in
    // this process too; the stream's sees itself still listening, so it does not send the signal on to the process.
    const ours = process.listeners('SIGTERM').filter((l) => l.name === 'endLiveStreamsOnSignal');
    expect(ours.length).toBeGreaterThan(0);
    for (const l of ours) (l as (signal: string) => void)('SIGTERM');
    await vi.waitFor(() => expect(streams.every((t) => t.done)).toBe(true));
    ac.abort();
  });
});
