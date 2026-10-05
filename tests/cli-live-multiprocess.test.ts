// @vitest-environment node
// Named cli-* so the payload leaves it out: it starts Node processes from the template's own scripts/fixtures.
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createLiveClient, type LiveState } from '../src/lib/live.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const POLL_MS = 1000;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-live-multi-'));
const file = path.join(dir, 'items.json');
fs.writeFileSync(file, '[]');
const children: ChildProcess[] = [];

afterAll(() => {
  for (const c of children) c.kill('SIGTERM');
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Start one process over the shared file and resolve its base URL. Only this process is ever killed, by its handle. */
function serve(): Promise<string> {
  const child = spawn(process.execPath, ['scripts/fixtures/file-collection-server.ts', '--file', file], { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
  children.push(child);
  return new Promise((resolve, reject) => {
    let out = '';
    child.stdout!.on('data', (d) => {
      out += d;
      const m = /listening on (\d+)/.exec(out);
      if (m) resolve(`http://127.0.0.1:${m[1]}`);
    });
    child.on('exit', (code) => reject(new Error(`a fixture process exited with ${code}`)));
  });
}

/** Every SSE event name the stream delivered, in order; the browser's EventSource is what the client expects, and Node has none. */
const received: string[] = [];
class StreamSource {
  private listeners = new Map<string, Array<(e: { data: string }) => void>>();
  private abort = new AbortController();
  constructor(url: string) {
    void this.run(url);
  }
  addEventListener(type: string, listener: (e: { data: string }) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  close() {
    this.abort.abort();
  }
  private emit(type: string, data = '') {
    if (this.abort.signal.aborted) return;
    for (const l of this.listeners.get(type) ?? []) l({ data });
  }
  private async run(url: string) {
    try {
      const response = await fetch(url, { signal: this.abort.signal, headers: { accept: 'text/event-stream' } });
      this.emit('open');
      const decoder = new TextDecoder();
      let buffer = '';
      const reader = response.body!.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let end: number;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const event = /^event: (.+)$/m.exec(frame)?.[1];
          if (!event) continue;
          received.push(event);
          this.emit(event, /^data: (.+)$/m.exec(frame)?.[1]);
        }
      }
      this.emit('error');
    } catch {
      this.emit('error');
    }
  }
}

const until = async (what: string, ok: () => boolean, ms: number) => {
  const t = Date.now();
  while (!ok()) {
    if (Date.now() - t > ms) throw new Error(`${what}: not within ${ms} ms`);
    await new Promise((r) => setTimeout(r, 20));
  }
  return Date.now() - t;
};
const write = (base: string, name: string) => fetch(`${base}/write`, { method: 'POST', body: JSON.stringify({ name }) });

describe('two processes over one shared file store', () => {
  it('miss each other\'s hints, and a client of the second still converges through its safety refresh', async () => {
    const [a, b] = await Promise.all([serve(), serve()]);
    let rows: { name: string }[] = [];
    let state: LiveState | undefined;
    const client = createLiveClient({
      refresh: async () => { rows = (await (await fetch(`${b}/rows`)).json()) as { name: string }[]; },
      endpoint: `${b}/live`,
      pollMs: POLL_MS,
      EventSource: StreamSource as unknown as typeof EventSource,
      onState: (s) => { state = s; },
    });
    try {
      client.setNames(['items']);
      await until('the client of B goes live', () => state === 'live', 5000);

      const before = received.filter((e) => e === 'change').length;
      const t = Date.now();
      await write(a, 'written-through-a');
      const ms = await until('B converges on the write made through A', () => rows.some((r) => r.name === 'written-through-a'), POLL_MS + 2000);
      console.log(`ok   B converged on A's write in ${ms} ms (${Date.now() - t} ms after the write began; bound ${POLL_MS + 2000} ms), no hint`);
      expect(ms).toBeLessThanOrEqual(POLL_MS + 2000);
      // B never heard A's write: only the safety refresh repaired it.
      expect(received.filter((e) => e === 'change').length).toBe(before);

      // The control: a write through B itself is hinted, so a stream that heard nothing above was a stream that works.
      await write(b, 'written-through-b');
      await until('B hints its own write', () => received.filter((e) => e === 'change').length === before + 1, 2000);
      await until('B reads its own write', () => rows.some((r) => r.name === 'written-through-b'), 2000);
    } finally {
      client.dispose();
    }
  }, 30_000);
});
