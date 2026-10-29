// @vitest-environment node
// Named deep-* so the payload leaves it out: it runs scripts/rail.ts, which drives a real browser.
import { execFile } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * `pnpm verify --as <persona>` compares the rail rail.ts reads with the persona's expected routes. A product whose rail
 * is a web component keeps the links in an open shadow root, which the journey and the walk-through enter; rail.ts read
 * the light DOM only and failed "the rail drew no links" on a rail that was drawn.
 */
const PAGE = `<!doctype html><html lang="en"><title>Rail</title><main><h1>Rail</h1></main><app-rail></app-rail><script>
customElements.define('app-rail', class extends HTMLElement { connectedCallback() { this.attachShadow({ mode: 'open' }).innerHTML = '<nav aria-label="Main"><a href="/">Home</a><a href="/revenue">Revenue</a></nav>'; } });
</script>`;

let server: http.Server;
let base = '';
beforeAll(async () => {
  server = http.createServer((_req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE); });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(() => { server?.close(); });

describe('the rail suite on a rail drawn in a shadow root', () => {
  it('reads the links inside it', async () => {
    // Asynchronous: the page is served from this process, and a blocking spawn would starve the server.
    const out = await new Promise<string>((resolve) => execFile(process.execPath, ['scripts/rail.ts', '--base', base], { cwd: ROOT, timeout: 120_000 }, (_e, so, se) => resolve(so + se)));
    expect(out.trim().split('\n').at(-1)).toBe('rail: ["/","/revenue"]');
  }, 150_000);
});
