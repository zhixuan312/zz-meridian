// @vitest-environment node
import { afterAll, beforeAll, expect, test } from 'vitest';
import { isStepCount, jsonSchema, streamText, tool } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { startFakeLlm } from '../scripts/fake-llm';

let llm: Awaited<ReturnType<typeof startFakeLlm>>;
beforeAll(async () => { llm = await startFakeLlm({ port: 0 }); });
afterAll(() => llm.close());

test('answers in the OpenAI-compatible streaming format about the page named in the system prompt, and records the request', async () => {
  const model = createOpenAICompatible({ name: 'fake', baseURL: llm.url, apiKey: 'fake-key' })('fake-model');
  const r = streamText({ model, system: 'You are the assistant.\nPage: Members (/members)', prompt: 'What is this page?' });
  expect(await r.text).toBe('This is the Members page.');
  const last = llm.requests.at(-1)!;
  expect(last.model).toBe('fake-model');
  expect(last.stream).toBe(true);
  expect(JSON.stringify(last.messages)).toContain('Page: Members (/members)');
});

test("answers a view tool's result with its address and its first insight, the line the walk-through recognises", async () => {
  const context = ['Home · last 90 days · address /?period=90d', 'Facts:', '- Revenue: $1.00.', 'Insights, computed by the product (quote them; do not recompute):', '- The first insight.', '- The second.'].join('\n');
  const ask = async (content: string) => {
    const res = await fetch(`${llm.url}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'fake', messages: [{ role: 'user', content: 'Open the home for the last 90 days' }, { role: 'tool', tool_call_id: 'call_1', content }] }),
    });
    return (await res.json()).choices[0].message.content as string;
  };
  expect(await ask(JSON.stringify({ address: '/?period=90d', context }))).toBe('From /?period=90d: The first insight.');
  expect(await ask(JSON.stringify({ address: '/?period=90d', context: context.split('\nInsights')[0] }))).toBe('From /?period=90d: Home · last 90 days · address /?period=90d');
});

/** A prepared query's tool as a request hands it, in the chat-completions shape. */
const handed = (name: string) => ({ type: 'function', function: { name, description: 'A prepared query.', parameters: { type: 'object' } } });
const complete = async (messages: object[], tools: object[]) => {
  const res = await fetch(`${llm.url}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'fake', messages, tools }) });
  return (await res.json()).choices[0].message as { content: string | null; tool_calls?: { function: { name: string; arguments: string } }[] };
};
const W10 = 'How many requests came at 22:00 UTC on each weekday?';
const W11 = 'How many runs passed in the last seven days?';

test("asks Usage's prepared query for the requests at 22:00 by weekday, and Tests' for the runs of seven days by how they ended", async () => {
  const usage = await complete([{ role: 'user', content: W10 }], [handed('view_usage'), handed('explore_usage')]);
  expect(usage.tool_calls?.map((c) => c.function.name)).toEqual(['explore_usage']);
  expect(JSON.parse(usage.tool_calls![0].function.arguments)).toEqual({ source: 'hours', measures: ['requests'], where: [{ field: 'hour', op: 'eq', value: 22 }], by: 'weekday' });
  const tests = await complete([{ role: 'user', content: W11 }], [handed('explore_tests')]);
  expect(tests.tool_calls?.map((c) => c.function.name)).toEqual(['explore_tests']);
  expect(JSON.parse(tests.tool_calls![0].function.arguments)).toEqual({ source: 'runs', measures: ['runs'], by: 'state', period: '7d' });
});

test('calls no prepared query the request did not hand, and says which it lacked', async () => {
  const other = await complete([{ role: 'user', content: W10 }], [handed('explore_tests')]);
  expect(other.tool_calls).toBeUndefined();
  expect(other.content).toBe('I was not handed explore_usage here.');
});

test("answers a prepared query's result with its address and its first group line, or its first line when it has none", async () => {
  const answer = ['Source hours, no window, as it has no date, where hour eq 22, by weekday.', 'Requests: 61,000,000 requests. Requests in the weekday and UTC hour.', '- Sunday: 43,868,876 requests', '- Thursday: 3,563,748 requests', 'Requests are not kept by customer and hour.'].join('\n');
  const reply = async (content: string) => (await complete([{ role: 'user', content: W10 }, { role: 'tool', tool_call_id: 'call_1', content }], [])).content;
  expect(await reply(JSON.stringify({ address: '/usage', answer }))).toBe('From /usage: Sunday: 43,868,876 requests');
  expect(await reply(JSON.stringify({ address: '/usage', answer: 'You do not have access to that.' }))).toBe('From /usage: You do not have access to that.');
});

test('runs the call through a client that hands the tool, and quotes what the tool returned', async () => {
  const model = createOpenAICompatible({ name: 'fake', baseURL: llm.url, apiKey: 'fake-key' })('fake-model');
  let input: unknown;
  const answer = ['Source runs, 2026-09-26 to 2026-10-02, complete days, by state.', 'Runs: 9 runs. Every run that started in the window.', '- passed: 8 runs', '- failed: 1 runs'].join('\n');
  const explore_tests = tool({ inputSchema: jsonSchema<Record<string, unknown>>({ type: 'object' }), execute: async (i) => { input = i; return { address: '/tests', answer }; } });
  const r = streamText({ model, system: 'Page: Tests (/tests)', prompt: W11, tools: { explore_tests }, stopWhen: isStepCount(2) });
  expect(await r.text).toBe('From /tests: passed: 8 runs');
  expect(input).toEqual({ source: 'runs', measures: ['runs'], by: 'state', period: '7d' });
  expect(llm.requests.at(-2).tools.map((t: { function: { name: string } }) => t.function.name)).toEqual(['explore_tests']);
});
