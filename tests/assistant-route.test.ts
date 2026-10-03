// @vitest-environment node
import { afterEach, describe, expect, test } from 'vitest';
import { safeValidateUIMessages, type UIMessage } from 'ai';
import { POST } from '../app/api/assistant/route';

const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; });
const post = (body: unknown) => POST(new Request('http://localhost/api/assistant', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }));
const page = { path: '/members', title: 'Members', text: '' };
const ask = (id: string): UIMessage => ({ id, role: 'user', parts: [{ type: 'text', text: 'hello' }] });

describe('POST /api/assistant refuses what is not a thread', () => {
  test('malformed messages, an empty or oversized thread, and an oversized body answer before the model is reached', async () => {
    Object.assign(process.env, { ASSISTANT_PROVIDER: 'openai-compatible', ASSISTANT_API_KEY: 'k', ASSISTANT_MODEL: 'm', ASSISTANT_BASE_URL: 'http://127.0.0.1:9/v1' });
    for (const messages of [[null], [{}], [{ id: 'u1', role: 'user', parts: 5 }], []]) expect((await post({ messages, page })).status).toBe(400);
    expect((await post('{not json')).status).toBe(400);
    expect((await post({ messages: Array.from({ length: 101 }, (_, i) => ask(`u${i}`)), page })).status).toBe(400);
    expect((await post({ messages: [ask('u1')], page: { ...page, text: 'x'.repeat(2_000_001) } })).status).toBe(413);
  });

  test('a thread with a proposal and a tool part waiting for approval is a valid thread', async () => {
    const thread = [ask('u1'), { id: 'a1', role: 'assistant', parts: [
      { type: 'data-proposal', id: 'c1', data: { title: 'Remove Alice Moreno', tone: 'critical', changes: [] } },
      { type: 'tool-remove_members', toolCallId: 'c1', state: 'approval-responded', input: { ids: ['members_13'] }, approval: { id: 'ap1', approved: true } },
    ] }];
    expect((await safeValidateUIMessages({ messages: thread })).success).toBe(true);
  });
});
