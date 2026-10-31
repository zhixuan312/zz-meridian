// @vitest-environment node
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { domain } from '@/app.config';
import { curlOf } from '@/views/request';
import type { RequestRow } from '@/data/sample';

const exec = promisify(execFile);
const row = { method: 'POST', route: '/v1/messages?stream=true&x=1' } as RequestRow;
let fixtureDir = '';
let origin = '';
type Received = { method: string; url: string; body: string; authorization: string; contentLength: string | null };
const server = http.createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    method: req.method, url: req.url, body: Buffer.concat(chunks).toString('utf8'),
    authorization: req.headers.authorization, contentLength: req.headers['content-length'] ?? null,
  }));
});

beforeAll(async () => {
  fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-curl-'));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  if (server.listening) {
    const closed = once(server, 'close');
    server.close();
    server.closeAllConnections();
    await closed;
  }
  if (fixtureDir) fs.rmSync(fixtureDir, { recursive: true, force: true });
});

/** Execute the product's command with only its destination redirected to our own loopback receiver. */
function execute(command: string) {
  const remote = `'https://api.${domain}${row.route}'`;
  if (!command.startsWith('curl ') || !command.includes(remote) || command.indexOf(remote) !== command.lastIndexOf(remote)) {
    throw new Error('Unknown cURL destination; refusing to execute the command.');
  }
  const local = command.replace(remote, `'${origin}${row.route}'`)
    .replace(/^curl /, 'curl -q --silent --show-error --max-time 5 --noproxy 127.0.0.1 ');
  return exec('sh', ['-c', local], {
    encoding: 'utf8', timeout: 5_000,
    env: { NODE_ENV: 'test', PATH: `${fixtureDir}${path.delimiter}${process.env.PATH}`, HOME: fixtureDir, CURL_HOME: fixtureDir, API_KEY: 'review-test-key' },
  });
}

async function send(body: string | null): Promise<Received> {
  const { stdout } = await execute(curlOf(row, body));
  return JSON.parse(stdout) as Received;
}

describe('Copy as cURL', () => {
  it('sends the body exactly, preserving quotes, whitespace and literal shell expressions', async () => {
    const body = JSON.stringify({ text: "it's 🧭 $(printf wrong) `printf wrong`", n: 1 }, null, 2);
    const received = await send(body);
    expect(received.body).toBe(body);
    expect(received.authorization).toBe('Bearer review-test-key');
    expect(received.method).toBe('POST');
  });

  it('preserves raw JSON numbers and duplicate object keys', async () => {
    const body = '{"id":12345678901234567890,"decimal":1.00,"same":1,"same":2,"exponent":1e+03}';
    expect((await send(body)).body).toBe(body);
  });

  it('keeps a query whole and a non-JSON body unchanged', async () => {
    const received = await send("a 'b'\nc");
    expect(received.url).toBe(row.route);
    expect(received.body).toBe("a 'b'\nc");
  });

  it('never interprets a leading @ as a local file to upload', async () => {
    const file = path.join(fixtureDir, 'local-only.txt');
    fs.writeFileSync(file, 'This fixture must not be uploaded.');
    const body = `@${file}`;
    expect((await send(body)).body).toBe(body);
  });

  it('never executes shell expressions held by a captured method', async () => {
    const marker = path.join(fixtureDir, 'method-expanded');
    const probe = path.join(fixtureDir, 'methodprobe');
    fs.writeFileSync(probe, `#!/usr/bin/env node\nrequire('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran');\n`, { mode: 0o755 });
    await execute(curlOf({ ...row, method: 'POST`methodprobe`' }, null));
    expect(fs.existsSync(marker)).toBe(false);
  });

  it('distinguishes an explicitly empty captured body from an absent body', async () => {
    const empty = await send('');
    expect(empty.body).toBe('');
    expect(empty.contentLength).toBe('0');
    const absent = await send(null);
    expect(absent.body).toBe('');
    expect(absent.contentLength).toBeNull();
  });
});
