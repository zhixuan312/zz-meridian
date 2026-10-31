// @vitest-environment node
// The fake model can call a project's own tool for the questions the project names (#49).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fakeModelArgs, fakeModelProblems } from '../scripts/lib/config-hooks.ts';
import { startFakeLlm } from '../scripts/fake-llm.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const ask = async (url: string, content: string, tools: string[]) => {
  const res = await fetch(`${url}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'fake', messages: [{ role: 'user', content }], tools: tools.map((name) => ({ type: 'function', function: { name, parameters: { type: 'object' } } })) }) });
  return { status: res.status, message: (await res.json()).choices?.[0]?.message };
};


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
});
