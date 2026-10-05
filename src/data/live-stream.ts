/**
 * The live stream: Server-Sent Events that tell a tab which collections changed, so it reads them again. A hint names
 * a collection and nothing else: no record, tenant or cache tag leaves the server. A hint is sent only after the
 * scope is checked again, and a scope that may no longer read what it subscribed to ends the stream.
 */
import type { AnyCollection } from '@/lib/collection';

/** The most hints waiting to be sent; beyond that they collapse into one resync. */
const MAX_QUEUED = 100;

let noted = false;

type LiveStreamOptions = {
  /** The requested names, already authorized once; the first frame is a resync of them. */
  names: string[];
  /** One scope-bound collection per name, in the same order. */
  collections: AnyCollection[];
  signal: AbortSignal;
  heartbeatMs?: number;
  /** Whether the current scope may still read a collection; asked before every hint is sent. */
  authorize: (name: string) => Promise<boolean>;
};

export function liveStream({ names, collections, signal, heartbeatMs = 15000, authorize }: LiveStreamOptions): Response {
  const encoder = new TextEncoder();
  const unsubscribe: Array<() => void> = [];
  let timer: ReturnType<typeof setInterval> | undefined;
  let closed = false;
  let controller!: ReadableStreamDefaultController<Uint8Array>;

  const send = (frame: string) => controller.enqueue(encoder.encode(frame));
  const resync = () => `event: resync\ndata: ${JSON.stringify({ collections: names })}\n\n`;

  function close() {
    if (closed) return;
    closed = true;
    clearInterval(timer);
    for (const off of unsubscribe) off();
    unsubscribe.length = 0;
    signal.removeEventListener('abort', close);
    try { controller.close(); } catch { /* already cancelled */ }
  }

  // Hints wait here while the scope is checked; past the bound they collapse into one resync of every name.
  let queue: string[] = [];
  let overflowed = false;
  let draining = false;

  async function drain() {
    if (draining) return;
    draining = true;
    try {
      while (!closed && (overflowed || queue.length > 0)) {
        const checked = overflowed ? names : [queue.shift()!];
        const frame = overflowed ? resync() : `event: change\ndata: ${JSON.stringify({ collection: checked[0] })}\n\n`;
        overflowed = false;
        const allowed = (await Promise.all(checked.map(authorize))).every(Boolean);
        if (closed) return;
        if (!allowed) return close();
        send(frame);
      }
    } catch {
      close();
    } finally {
      draining = false;
    }
  }

  function hint(name: string) {
    if (closed) return;
    if (process.env.LIVE_DROP_HINTS === '1') {
      if (!noted) {
        noted = true;
        console.log('note: LIVE_DROP_HINTS is set; change hints are dropped (a test switch)');
      }
      return;
    }
    if (overflowed) return;
    if (queue.length >= MAX_QUEUED) {
      queue = [];
      overflowed = true;
    } else if (!queue.includes(name)) queue.push(name);
    void drain();
  }

  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      if (signal.aborted) return close();
      signal.addEventListener('abort', close);
      send(`retry: 3000\n\n${resync()}`);
      collections.forEach((collection, i) => {
        const off = collection.subscribe?.(() => hint(names[i]!));
        if (off) unsubscribe.push(off);
      });
      timer = setInterval(() => { if (!closed) send(`: beat ${Date.now()}\n\n`); }, heartbeatMs);
    },
    cancel: close,
  });

  return new Response(body, {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform' },
  });
}
