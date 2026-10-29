// @vitest-environment node
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { answers } from '../scripts/lib/bin.ts';

let server: http.Server | undefined;
afterEach(() => server?.close());

describe('answers', () => {
  it('waits out a server that answers 5xx while it settles', async () => {
    let hits = 0;
    server = http.createServer((_, res) => { hits++; res.statusCode = hits < 4 ? 503 : 200; res.end(); });
    await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
    const started = Date.now();
    expect(await answers((server.address() as AddressInfo).port)).toBe(true);
    // Three misses, each followed by its quarter second, and no burst of retries.
    expect(hits).toBe(4);
    expect(Date.now() - started).toBeGreaterThanOrEqual(700);
  });
});
