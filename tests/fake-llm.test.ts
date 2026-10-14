// @vitest-environment node
import { afterAll, beforeAll, expect, test } from 'vitest';
import { streamText } from 'ai';
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
