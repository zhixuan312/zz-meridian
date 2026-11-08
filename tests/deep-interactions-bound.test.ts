// @vitest-environment node
// A link that accepts and never answers must end the walk as a named failure within the bound, never as a hang: on the
// old code the presses awaited a bare fetch with nothing to end the wait. Chrome is required, as for every deep-* file.
import { spawn } from 'node:child_process';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
let server: http.Server;
let base = '';

beforeAll(async () => {
  server = http.createServer((req, res) => {
    // The link accepts the connection and never answers: a destination that is up but silent.
    if (req.url === '/never') return;
    if (req.url === '/api/assistant') { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><html><head><title>hang</title></head><body><a href="/never">never</a></body></html>');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => {
  server.closeAllConnections();
  server.close(() => resolve());
}));

describe('the presses bound a link that never answers', () => {
  it('names it and ends within the bound, instead of waiting on it', async () => {
    const child = spawn(process.execPath, ['scripts/interactions.ts', '--base', base, '--routes', '/hang', '--width', '1440'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += String(d)));
    child.stderr.on('data', (d) => (out += String(d)));
    const outcome = await Promise.race([
      new Promise<number>((resolve) => child.on('close', (code) => resolve(code ?? 1))),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 90_000)),
    ]);
    if (outcome === 'timeout') child.kill('SIGKILL');
    expect(outcome, `interactions.ts did not end within 90 s: it was still waiting on the link. Output:\n${out}`).not.toBe('timeout');
    expect(outcome).toBe(1);
    expect(out).toContain('link /never did not answer within 60 s');
    expect(out).toContain('interactions:');
  }, 150_000);
});
