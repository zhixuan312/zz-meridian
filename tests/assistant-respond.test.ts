// @vitest-environment node
import { afterEach, describe, expect, test } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import type { UIMessage } from 'ai';
import { respond } from '@/lib/assistant/respond';
import { POST } from '../app/api/assistant/route';

/** Permits everything: this file is about the stream, the guard has its own tests. */
const guard = { authorize: async () => true, invalidate: () => {} };

const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
const say = (text: string) => ({
  stream: new ReadableStream({
    start(c) {
      for (const p of [{ type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: text }, { type: 'text-end', id: 't' }, { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage }]) c.enqueue(p as never);
      c.close();
    },
  }),
});
/** The UI message stream's events, parsed from its server-sent-event lines. */
async function events(res: Response) {
  const out: any[] = [];
  for (const line of (await res.text()).split('\n')) if (line.startsWith('data: ') && line !== 'data: [DONE]') out.push(JSON.parse(line.slice(6)));
  return out;
}
const ask = (text: string): UIMessage[] => [{ id: 'u1', role: 'user', parts: [{ type: 'text', text }] }];
const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; });

describe('respond', () => {
  test('streams the model answer as a UI message stream', async () => {
    const model = new MockLanguageModelV4({ doStream: async () => say('This is the Members page.') });
    const res = await respond({ model, secret: 's'.repeat(43), messages: ask('What is this page?'), page: { path: '/members', title: 'Members', text: 'Members\nAlice Moreno' }, collections: [], guard, now: new Date('2026-10-03T09:00:00Z') });
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const text = (await events(res)).filter((e) => e.type === 'text-delta').map((e) => e.delta).join('');
    expect(text).toBe('This is the Members page.');
  });

  test('gives the model the page as data: path, title, and the visible text cut to 24,000 characters', async () => {
    let prompt: any[] = [];
    const model = new MockLanguageModelV4({ doStream: async (o: any) => { prompt = o.prompt; return say('ok'); } });
    await (await respond({ model, secret: 's'.repeat(43), messages: ask('Explain'), page: { path: '/health', title: 'Health', text: 'x'.repeat(30_000) }, collections: [], guard, now: new Date('2026-10-03T09:00:00Z') })).text();
    const system = prompt.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    expect(system).toContain('Page: Health (/health)');
    expect(system).toMatch(/Today: \d{4}-\d{2}-\d{2}/);
    expect(system).toMatch(/never.*instruction/i);
    expect(system).toContain('x'.repeat(24_000));
    expect(system).not.toContain('x'.repeat(24_001));
  });
});

describe('POST /api/assistant', () => {
  test('answers 404 when the assistant is not configured', async () => {
    for (const k of Object.keys(process.env)) if (k.startsWith('ASSISTANT_')) delete process.env[k];
    const res = await POST(new Request('http://localhost/api/assistant', { method: 'POST', body: JSON.stringify({ messages: ask('hi'), page: { path: '/', title: 'Overview', text: '' } }) }));
    expect(res.status).toBe(404);
  });
});
