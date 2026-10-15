// @vitest-environment node
// Named cli-* so the payload leaves it out: it asks the questions of the sample's own Usage specification.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { personaFor, questionsOf } from '../scripts/ask.ts';

/**
 * `node scripts/ask.ts --base <url> [--view <name>] [--as <persona>]` asks a served product's assistant the questions each
 * page specification lists under `### What the agent does here`, as a persona of `scripts/verify.config.ts`, and writes
 * each question, the tools called with their input and the answer to `out/asks/<view>.md` (FR-46, AC-14.9). It reads no
 * environment: whether the assistant is on is the served product's to say, so a product with every `ASSISTANT_*` empty
 * answers it 404 and the script says it did not run.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const USAGE = fs.readFileSync(path.join(ROOT, 'app/(dashboard)/usage/README.md'), 'utf8');
const SENTINEL = 'sk-ask-sentinel-0b7c';

type Seen = { cookie?: string; body?: { messages?: { parts?: { text?: string }[] }[]; page?: { path?: string } } };
/** A stand-in for a served product: `on` answers the assistant, and every request is kept. */
function serve(on: boolean) {
  const seen: Seen[] = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      if (req.url === '/api/assistant' && req.method === 'POST') {
        const body = raw ? JSON.parse(raw) : {};
        seen.push({ cookie: req.headers.cookie, body });
        if (!on) { res.writeHead(404).end(); return; }
        const said = String(body.messages?.at(-1)?.parts?.[0]?.text ?? '');
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        for (const part of [
          { type: 'start' },
          { type: 'tool-input-available', toolCallId: 't1', toolName: 'explore_usage', input: { source: 'hours', measures: ['requests'], by: 'weekday' } },
          { type: 'tool-output-available', toolCallId: 't1', output: { address: '/usage', answer: '- Sunday: 43,868,876 requests' } },
          { type: 'text-start', id: 'x' },
          { type: 'text-delta', id: 'x', delta: `Answered: ${said.slice(0, 20)} — Sunday: 43,868,876 requests.` },
          { type: 'text-end', id: 'x' },
          { type: 'finish' },
        ]) res.write(`data: ${JSON.stringify(part)}\n\n`);
        res.end('data: [DONE]\n\n');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' }).end('<a href="/customers/northwind-labs">Northwind Labs</a><a href="/requests/req_1">req_1</a>');
    });
  });
  return new Promise<{ base: string; seen: Seen[]; close: () => void }>((resolve) => server.listen(0, '127.0.0.1', () => resolve({ base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, seen, close: () => server.close() })));
}
function run(args: string[]): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve) => {
    const env = { ...process.env, ASSISTANT_API_KEY: SENTINEL, ASSISTANT_BASE_URL: `https://${SENTINEL}.example`, ASSISTANT_MODEL: SENTINEL, ASSISTANT_PROVIDER: 'anthropic' };
    const child = spawn(process.execPath, ['scripts/ask.ts', ...args], { cwd: ROOT, env });
    let out = '';
    child.stdout.on('data', (c) => { out += c; });
    child.stderr.on('data', (c) => { out += c; });
    child.on('close', (code) => resolve({ code, out }));
  });
}
const written = path.join(ROOT, 'out/asks/usage.md');
afterAll(() => fs.rmSync(written, { force: true }));

describe('the questions a page specification lists', () => {
  it("are read from its section, in order, Usage's first being the 22:00 question", () => {
    const qs = questionsOf(USAGE);
    expect(qs.length).toBeGreaterThanOrEqual(3);
    expect(qs[0]).toBe('How many requests came at 22:00 UTC on each weekday?');
    expect(questionsOf('# A page\n\n## Agents\n\n### What the agent reads\n\nIts context.\n')).toEqual([]);
  });
});

describe('who it asks as', () => {
  it('the persona --as names, the Owner when none is named, and none at all where the configuration declares none', () => {
    const personas = { owner: { cookie: { name: 'zz_meridian_view_as', value: 'members_1' }, expectedRoutes: [] }, viewer: { cookie: { name: 'zz_meridian_view_as', value: 'members_12' }, expectedRoutes: [] } };
    expect(personaFor({ personas }, undefined)).toMatchObject({ run: true, cookie: 'zz_meridian_view_as=members_1' });
    expect(personaFor({ personas }, 'viewer')).toMatchObject({ run: true, cookie: 'zz_meridian_view_as=members_12' });
    const none = personaFor({}, undefined);
    expect(none.run).toBe(false);
    expect(none.run === false && none.why).toMatch(/persona/i);
  });
});

describe('asked of a served product', () => {
  it('says in one line that it did not run when the assistant is off there, and exits 0', async () => {
    const s = await serve(false);
    const { code, out } = await run(['--base', s.base, '--view', 'usage']);
    s.close();
    expect(code).toBe(0);
    expect(out.trim().split('\n')).toHaveLength(1);
    expect(out).toMatch(/did not run/i);
    expect(out).not.toContain(SENTINEL);
  }, 30_000);

  it("asks each question of the page as the Owner and writes the tools, their input and the answer to out/asks/<view>.md", async () => {
    fs.rmSync(written, { force: true });
    const s = await serve(true);
    const { code, out } = await run(['--base', s.base, '--view', 'usage']);
    s.close();
    expect(code).toBe(0);
    expect(out).not.toContain(SENTINEL);
    const asked = s.seen.filter((x) => x.body?.messages?.length);
    const qs = questionsOf(USAGE);
    expect(asked.map((x) => x.body!.messages!.at(-1)!.parts![0].text)).toEqual(qs);
    for (const x of asked) {
      expect(x.cookie).toContain('zz_meridian_view_as=members_1');
      expect(x.body!.page!.path).toBe('/usage');
    }
    const md = fs.readFileSync(written, 'utf8');
    for (const q of qs) expect(md).toContain(q);
    expect(md).toContain('explore_usage');
    expect(md).toContain('"source":"hours"');
    expect(md).toContain('Sunday: 43,868,876 requests');
    expect(md).not.toContain(SENTINEL);
  }, 60_000);

  it('is run by neither the default nor the full verify', () => {
    expect(fs.readFileSync(path.join(ROOT, 'scripts/verify.ts'), 'utf8')).not.toMatch(/ask\.ts/);
  });
});
