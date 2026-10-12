// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import type { UIMessage } from 'ai';
import { z } from 'zod';
import type { AnyCollection } from '@/lib/collection';
import { respond } from '@/lib/assistant/respond';

// What the assistant is told it cannot do. A product whose pages write through their own calls implements no
// operation on the collection; naming one in `pageOnly` still says where it is done, and "nobody can" is kept for what
// nobody can (issue #24).
const guard = { authorize: async () => true, invalidate: () => {} };
const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
const say = () => ({
  stream: new ReadableStream({
    start(c) {
      for (const p of [{ type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: 'ok' }, { type: 'text-end', id: 't' }, { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage }]) c.enqueue(p);
      c.close();
    },
  }),
});
const ask: UIMessage[] = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Can you add a team?' }] }];
const teams = (extra: Partial<AnyCollection>) => ({
  name: 'teams', label: 'Teams', description: 'The teams of this workspace.', fields: z.object({ name: z.string() }), key: 'id', title: (r: { name: string }) => r.name,
  query: async () => ({ rows: [], total: 0 }), ...extra,
}) as unknown as AnyCollection;

async function told(collection: AnyCollection): Promise<string> {
  let prompt: { role: string; content: unknown }[] = [];
  const model = new MockLanguageModelV4({ doStream: async (o: { prompt: typeof prompt }) => { prompt = o.prompt; return say(); } } as never);
  await (await respond({ model, secret: 's'.repeat(43), messages: ask, page: { path: '/settings', title: 'Settings', text: 'Settings' }, collections: [collection], guard, now: new Date('2026-10-03T09:00:00Z') })).text();
  return prompt.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
}

describe('what the assistant is told about a collection', () => {
  test('an operation only a page performs is said to be the page\'s, implemented on the collection or not', async () => {
    const system = await told(teams({ pageOnly: ['create'] }));
    expect(system).toContain('Teams: create only on its page, by the person; you cannot propose it.');
    expect(system).toContain('Teams: nobody can update or remove teams here.');
    expect(system).not.toMatch(/nobody can create/);
  });

  test('an operation nothing implements and no page performs is nobody\'s', async () => {
    expect(await told(teams({}))).toContain('Teams: nobody can create or update or remove teams here.');
  });
});
