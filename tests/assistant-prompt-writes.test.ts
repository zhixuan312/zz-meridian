// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import type { UIMessage } from 'ai';

import { members } from '@/data/collections';
import { systemPrompt } from '@/lib/assistant/prompt';
import { respond } from '@/lib/assistant/respond';

/**
 * The prompt says the assistant has write tools, and that the person approves its Proposals, only where it is handed a
 * write tool (issue #46). Where it is handed none, it says it changes nothing, and asked for a change it still names the
 * page that makes it. The shared guidance that no change exists unless a write tool returned one stays: it is true either way.
 */
const page = { path: '/members', title: 'Members', text: '' };
const NOW = new Date('2026-10-03T09:00:00Z');
/** The two lines that say the assistant has write tools, and that a Proposal it raises waits for the person. */
const WRITES = /Your write tools|approves or dismisses each Proposal/;

describe('what the prompt says about changing things', () => {
  it('with write tools: they change this page only, and each Proposal is approved or dismissed', () => {
    const p = systemPrompt(page, NOW, '', [], { writes: true, explore: 'explore_members' });
    expect(p).toContain('Your write tools change what this page shows and nothing else. Asked for a change another page makes, give the address of the page that makes it');
    expect(p).toContain('The person approves or dismisses each Proposal in its preview.');
    expect(p).toContain('A change to a record takes the id its rows give.');
  });

  it('without: it changes nothing, names no write tool and no Proposal, and still sends a change to the page that makes it', () => {
    for (const p of [systemPrompt(page, NOW), systemPrompt(page, NOW, '', [], { explore: 'explore_members' })]) {
      expect(p).toContain('You change nothing in this product: you have no write tool here. Asked for any change, give the address of the page that makes it');
      expect(p).toContain('A page they may not open is never where they can make a change');
      expect(p).not.toMatch(WRITES);
      expect(p).not.toContain('takes the id its rows give');
    }
  });
});

describe('the prompt respond sends, by the tools it hands', () => {
  const guard = { authorize: async () => true, invalidate: () => {} };
  const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
  const ask: UIMessage[] = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Suspend Alice Moreno' }] }];
  const systemOf = async (collections: (typeof members)[]) => {
    let prompt: { role: string; content: unknown }[] = [];
    const model = new MockLanguageModelV4({
      doStream: async (o: { prompt: typeof prompt }) => {
        prompt = o.prompt;
        return { stream: new ReadableStream({ start(c) { for (const p of [{ type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: 'ok' }, { type: 'text-end', id: 't' }, { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage }]) c.enqueue(p as never); c.close(); } }) };
      },
    } as never);
    await (await respond({ model, secret: 's'.repeat(43), messages: ask, page, collections, guard, now: NOW })).text();
    return prompt.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  };

  it('tells of write tools and Proposals beside a collection the assistant may change', async () => {
    expect(await systemOf([members])).toMatch(WRITES);
  });

  it('tells of none beside collections it may only read, or none at all', async () => {
    const readOnly = { ...members, create: undefined, update: undefined, remove: undefined } as unknown as typeof members;
    for (const collections of [[readOnly], []]) {
      const system = await systemOf(collections);
      expect(system).toContain('You change nothing in this product');
      expect(system).not.toMatch(WRITES);
    }
  });
});
