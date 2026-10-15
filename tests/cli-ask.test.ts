// @vitest-environment node
// Named cli-* so the payload leaves it out: it asks the questions of the sample's own Usage specification.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { personaFor, questionsOf } from '../scripts/ask.ts';

/**
 * `node scripts/ask.ts --base <url> [--view <name>] [--as <persona>]` asks a served product's assistant the questions each
 * page specification lists under `### What the agent does here`, as a persona of `scripts/verify.config.ts`, and writes
 * each question, the tools called with their input, every Proposal raised and the answer to `<out>/<view>.md` (FR-46,
 * AC-14.9). It reads no environment: whether the assistant is on is the served product's to say, so a product with every
 * `ASSISTANT_*` empty answers it 404 and the script says it did not run. Every run here writes to a folder of its own
 * (`--out`), never to the repository's `out/asks/`, which holds a real run's reports for a reader to judge.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const USAGE = fs.readFileSync(path.join(ROOT, 'app/(dashboard)/usage/README.md'), 'utf8');
const SENTINEL = 'sk-ask-sentinel-0b7c';

type Seen = { cookie?: string; body?: { messages?: { parts?: { text?: string }[] }[]; page?: { path?: string; title?: string; context?: string; text?: string } } };
type Part = Record<string, unknown>;
/** What the stand-in assistant answers a question with: a prepared query and an answer, unless a test says otherwise. */
const answered = (said: string): Part[] => [
  { type: 'start' },
  { type: 'tool-input-available', toolCallId: 't1', toolName: 'explore_usage', input: { source: 'hours', measures: ['requests'], by: 'weekday' } },
  { type: 'tool-output-available', toolCallId: 't1', output: { address: '/usage', answer: '- Sunday: 43,868,876 requests' } },
  { type: 'text-start', id: 'x' },
  { type: 'text-delta', id: 'x', delta: `Answered: ${said.slice(0, 20)} — Sunday: 43,868,876 requests.` },
  { type: 'text-end', id: 'x' },
  { type: 'finish' },
];
/**
 * The Usage page as `next start` streams it: the rail first, then the scroll region, whose figures arrive after the
 * loading fallback as a hidden segment that a script swaps in, one of them holding a placeholder a later segment fills,
 * and in it a value shown once, marked `data-assistant="omit"` as the panel leaves it out.
 */
const USAGE_PAGE = `<!DOCTYPE html><html><head><title>Usage · ZZ Meridian</title><style>.x{color:red}</style></head><body>
<nav aria-label="Main"><a href="/">Rail entry Home</a></nav>
<div data-scroll-region="" class="min-h-0"><main><h1>Usage</h1><p>Requests &amp; errors, 30 complete days</p>
<!--$?--><template id="B:0"></template><div aria-busy="true">Loading the figures</div><!--/$--></main></div>
<script>self.__next_f.push([1,"Rail entry Home"])</script>
<div hidden id="S:0"><section><h2>When requests come</h2><table><tr><th>Weekday</th><th>22:00</th></tr><tr><td>Sunday</td><td>43,868,876</td></tr></table><template id="P:1"></template></section></div>
<script>$RC("B:0","S:0")</script>
<div hidden id="S:1"><p>Busiest hour: 14:00 UTC</p><p>Shown once: <code data-assistant="omit" class="font-mono">sk-ask-omitted-41d2</code></p></div>
<script>$RS("S:1","P:1")</script>
<a href="/customers/northwind-labs">Northwind Labs</a><a href="/requests/req_1">req_1</a></body></html>`;
/** A stand-in for a served product: `on` answers the assistant with `parts` for each question, and every request is kept. */
function serve(on: boolean, parts: (said: string, n: number) => Part[] = answered) {
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
        for (const part of parts(said, seen.filter((x) => x.body?.messages?.length).length)) res.write(`data: ${JSON.stringify(part)}\n\n`);
        res.end('data: [DONE]\n\n');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' }).end(USAGE_PAGE);
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
const folders: string[] = [];
/** A folder of this test's own for a run to write to. */
const outDir = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-ask-')); folders.push(d); return d; };
afterAll(() => { for (const d of folders) fs.rmSync(d, { recursive: true, force: true }); });

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
    const { code, out } = await run(['--base', s.base, '--view', 'usage', '--out', outDir()]);
    s.close();
    expect(code).toBe(0);
    expect(out.trim().split('\n')).toHaveLength(1);
    expect(out).toMatch(/did not run/i);
    expect(out).not.toContain(SENTINEL);
  }, 30_000);

  it('asks each question of the page as the Owner and writes the tools, their input and the answer to <out>/<view>.md', async () => {
    const dir = outDir();
    const written = path.join(dir, 'usage.md');
    const repo = path.join(ROOT, 'out/asks/usage.md');
    const before = fs.existsSync(repo) ? fs.statSync(repo).mtimeMs : null;
    const s = await serve(true);
    const { code, out } = await run(['--base', s.base, '--view', 'usage', '--out', dir]);
    s.close();
    expect(code).toBe(0);
    expect(out).toContain(written);
    // The repository's own report, a real run's for a reader to judge, is neither written nor removed.
    expect(fs.existsSync(repo) ? fs.statSync(repo).mtimeMs : null).toBe(before);
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

  it("sends each question with the page's visible text as the persona is served it: the streamed figures in place, not the fallback, the rail, a script or a node marked omit", async () => {
    const s = await serve(true);
    const { code } = await run(['--base', s.base, '--view', 'usage', '--out', outDir()]);
    s.close();
    expect(code).toBe(0);
    const page = s.seen.find((x) => x.body?.messages?.length)!.body!.page!;
    expect(page.title).toBe('Usage');
    expect(page.text).toMatch(/^Usage\nRequests & errors, 30 complete days\nWhen requests come\n/);
    expect(page.text).toContain('Weekday\t22:00\nSunday\t43,868,876');
    expect(page.text).toContain('Busiest hour: 14:00 UTC');
    expect(page.text).not.toContain('Loading the figures');
    expect(page.text).not.toContain('Rail entry Home');
    expect(page.text).not.toContain('color:red');
    expect(page.text).not.toContain('Northwind');
    // What the panel leaves out, the script leaves out: the marked node, and only it.
    expect(page.text).toContain('Shown once:');
    expect(page.text).not.toContain('sk-ask-omitted-41d2');
  }, 60_000);

  it('records every Proposal the assistant raised, its approval request and a denial, and counts a Proposal as an answer', async () => {
    const dir = outDir();
    const s = await serve(true, (_said, n) => (n === 1
      ? [
          // The order `respond()` streams a write in: the Proposal is written while the approval is decided, before the
          // step starts and the call's input arrives.
          { type: 'start' },
          { type: 'data-proposal', id: 'w1', data: { title: 'Suspend Felix Andersson', tone: 'critical', changes: [{ label: 'status', from: 'Active', to: 'Suspended' }] } },
          { type: 'start-step' },
          { type: 'tool-input-available', toolCallId: 'w1', toolName: 'update_members', input: { ids: ['members_18'], set: { status: 'Suspended' } } },
          { type: 'tool-approval-request', approvalId: 'a1', toolCallId: 'w1' },
          { type: 'finish-step' },
          { type: 'finish' },
        ]
      : n === 2
        ? [
            { type: 'start' },
            { type: 'tool-input-available', toolCallId: 'w2', toolName: 'update_members', input: { ids: ['members_99'], set: { status: 'Suspended' } } },
            // A change the product refuses outright is denied without asking: the SDK streams the request as automatic, then the answer.
            { type: 'tool-approval-request', approvalId: 'a2', toolCallId: 'w2', isAutomatic: true },
            { type: 'tool-approval-response', approvalId: 'a2', approved: false, reason: 'No such id: members_99' },
            { type: 'tool-output-denied', toolCallId: 'w2' },
            { type: 'text-start', id: 'y' },
            { type: 'text-delta', id: 'y', delta: 'There is no member members_99.' },
            { type: 'text-end', id: 'y' },
            { type: 'finish' },
          ]
        : answered('')));
    const { code, out } = await run(['--base', s.base, '--view', 'usage', '--out', dir]);
    s.close();
    expect(out).not.toMatch(/not answered/);
    expect(out).toMatch(/1 Proposal/);
    expect(code).toBe(0);
    const md = fs.readFileSync(path.join(dir, 'usage.md'), 'utf8');
    const first = md.slice(md.indexOf('## 1.'), md.indexOf('## 2.'));
    expect(first).toContain('update_members');
    expect(first).toMatch(/Proposal "Suspend Felix Andersson" \(critical\)/);
    expect(first).toContain('| status | Active | Suspended |');
    expect(first).toMatch(/approval was requested/i);
    const second = md.slice(md.indexOf('## 2.'), md.indexOf('## 3.'));
    expect(second).toMatch(/denied: No such id: members_99/i);
    expect(second).toContain('There is no member members_99.');
  }, 60_000);

  it('is run by neither the default nor the full verify', () => {
    expect(fs.readFileSync(path.join(ROOT, 'scripts/verify.ts'), 'utf8')).not.toMatch(/ask\.ts/);
  });
});
