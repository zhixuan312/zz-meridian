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
