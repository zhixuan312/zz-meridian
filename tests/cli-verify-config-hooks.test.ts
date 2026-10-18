// @vitest-environment node
// A project's own check that judges a time runs in the timed tier (#48), and the fake model can call a project's own
// tool for the questions the project names (#49).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fakeModelArgs, fakeModelProblems } from '../scripts/lib/config-hooks.ts';
import { SUITE_NAMES, TIMED_SUITES } from '../scripts/lib/coverage.ts';
import { startFakeLlm } from '../scripts/fake-llm.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const ask = async (url: string, content: string, tools: string[]) => {
  const res = await fetch(`${url}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'fake', messages: [{ role: 'user', content }], tools: tools.map((name) => ({ type: 'function', function: { name, parameters: { type: 'object' } } })) }) });
  return { status: res.status, message: (await res.json()).choices?.[0]?.message };
};

describe('timedChecks', () => {
  it('is a suite of the timed tier, after the live data and before Web Vitals', () => {
    expect(TIMED_SUITES).toEqual(['timing', 'live', 'timedChecks', 'vitals']);
    expect(SUITE_NAMES).toContain('timedChecks');
    expect(read('scripts/verify.config.ts')).toMatch(/timedChecks\?: string\[\]/);
    const verify = read('scripts/verify.ts');
    const live = verify.indexOf("reportSuite('live'");
    const own = verify.indexOf("reportSuite('timedChecks'");
    const vitals = verify.indexOf("reportSuite('vitals'");
    expect(live).toBeGreaterThan(0);
    expect(own).toBeGreaterThan(live);
    expect(vitals).toBeGreaterThan(own);
  });
});

describe('fakeModel', () => {
  let llm: Awaited<ReturnType<typeof startFakeLlm>>;
  beforeAll(async () => { llm = await startFakeLlm({ port: 0, steps: [{ when: 'which runs failed', tool: 'view_tests', input: { period: '7d' } }] }); });
  afterAll(() => llm.close());
  it("calls the step's tool with its input when the request hands it", async () => {
    const r = await ask(llm.url, 'Which runs failed this week?', ['view_tests']);
    expect(r.status).toBe(200);
    expect(r.message.tool_calls[0].function.name).toBe('view_tests');
    expect(JSON.parse(r.message.tool_calls[0].function.arguments)).toEqual({ period: '7d' });
  });
  it('says so when the request does not hand it', async () => {
    expect((await ask(llm.url, 'Which runs failed this week?', [])).message.content).toBe('I was not handed view_tests here.');
  });
  it('still refuses the key on the word fail', async () => {
    expect((await ask(llm.url, 'Please fail now', [])).status).toBe(401);
  });
  it('names a step whose pattern does not compile, and hands the rest on its command line', async () => {
    expect(fakeModelProblems([{ when: '(', tool: 'x', input: {} }])[0]).toMatch(/^fakeModel\[0\]\.when: /);
    expect(fakeModelArgs([])).toEqual([]);
    const child = spawn(process.execPath, ['scripts/fake-llm.ts', '--port', '0', ...fakeModelArgs([{ when: 'which release shipped', tool: 'view_releases', input: {} }])], { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
    try {
      const url = await new Promise<string>((resolve) => child.stdout!.on('data', (d) => { const m = /fake-llm listening on (\S+)/.exec(String(d)); if (m) resolve(m[1]); }));
      expect((await ask(url, 'Which release shipped last?', ['view_releases'])).message.tool_calls[0].function.name).toBe('view_releases');
    } finally { child.kill(); }
  });
  it('is handed the steps by verify, never reading the config itself', () => {
    expect(read('scripts/verify.ts')).toMatch(/fakeModelArgs\(/);
    expect(read('scripts/verify.ts')).toMatch(/fakeModelProblems\(/);
    expect(read('scripts/fake-llm.ts')).not.toMatch(/import[^\n]*verify\.config/);
  });
});
