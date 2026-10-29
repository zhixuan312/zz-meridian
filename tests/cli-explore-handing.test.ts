// @vitest-environment node
// Named cli-* so the payload leaves it out: it hands views of its own over the sample's collections, features and people.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import type { UIMessage } from 'ai';
import { z } from 'zod';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const seen = vi.hoisted(() => ({ calls: [] as { tools: { name: string; inputSchema?: unknown }[]; prompt: { role: string; content: unknown }[] }[], script: [] as unknown[], fixed: [] as unknown[] }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
const streamOf = (parts: unknown[]) => ({ stream: new ReadableStream({ start(c) { for (const p of parts) c.enqueue(p as never); c.close(); } }) });
/** The model: records what each call was given, and plays the next scripted step (a tool call), then says "ok". */
vi.mock('@/lib/assistant/config', () => ({
  assistantConfig: () => ({
    secret: 's'.repeat(43),
    model: new MockLanguageModelV4({
      doStream: async (o: { tools?: { name: string; inputSchema?: unknown }[]; prompt: { role: string; content: unknown }[] }) => {
        seen.calls.push({ tools: o.tools ?? [], prompt: o.prompt });
        const next = seen.script.shift();
        if (next) return streamOf([next, { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage }]);
        return streamOf([{ type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: 'ok' }, { type: 'text-end', id: 't' }, { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage }]);
      },
    } as never),
  }),
}));

/**
 * Three views of their own, so the handing is held apart from the sample's declarations: one at `/usage` with a prepared
 * query over the hours and the costs, one at the customers' detail address with one over the hours, and one at
 * `/members`, which a Viewer may not use, with one over the hours. The route hands the assistant the prepared query of
 * the page the person is on, and no other, and only where the person may use its view. The detail view takes its `id`
 * as the sample's One customer does, and its prepared query's `fixed` is handed it.
 */
vi.mock('@/logic/tools', async () => {
  const { FEATURES } = await import('@/data/features');
  const hours = {
    collection: 'hours',
    filters: { hour: { ops: ['eq'], values: Array.from({ length: 24 }, (_, h) => h) } },
    facets: ['weekday'],
    measures: { r: { label: 'Requests', unit: 'requests', definition: 'Requests in the hour.', agg: 'sum', field: 'requests' } },
    drill: { columns: ['id'], address: () => '/usage' },
    cannot: 'Who sent them is not recorded.',
  };
  const costs = {
    collection: 'costs',
    date: 'date',
    filters: {},
    facets: [],
    measures: { c: { label: 'Compute cost', unit: 'USD', definition: 'What compute cost.', agg: 'sum', field: 'compute' } },
    drill: { columns: ['date'], address: () => '/' },
    cannot: '',
  };
  const view = (name: string, page: string, needs: unknown, explore?: unknown, input: z.ZodObject = z.object({})) => ({
    name, title: name, page, description: `The ${name} view.`, needs, input, explore,
    read: async () => ({ context: { view: name, title: name, address: page, scope: '', facts: [], insights: [], unknowns: [] }, data: {} }),
  });
  return {
    viewTools: [
      view('usage', '/usage', FEATURES.usage.needs, { sources: { hours, costs } }),
      view('customer', '/customers/[id]', FEATURES.customer.needs, { sources: { hours }, fixed: async (input: { id: string }) => { seen.fixed.push(input.id); return { hours: [] }; } }, z.object({ id: z.string() })),
      view('members', '/members', FEATURES.members.needs, { sources: { hours } }),
    ],
  };
});

import { POST } from '../app/api/assistant/route';

const ask: UIMessage[] = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'What stands out?' }] }];
async function toolsOn(path: string): Promise<string[]> {
  seen.calls = [];
  const res = await POST(new Request('http://localhost/api/assistant', { method: 'POST', body: JSON.stringify({ messages: ask, page: { path, title: 'A page', text: '' } }) }));
  expect(res.status, path).toBe(200);
  await res.text();
  return seen.calls[0].tools.map((t) => t.name);
}
const explores = (names: string[]) => names.filter((n) => n.startsWith('explore_'));

beforeEach(() => { jar.value = 'members_1'; seen.script = []; seen.fixed = []; });
afterEach(() => { jar.value = undefined; });

describe("the assistant is handed the prepared query of the page the person is on", () => {
  it("hands the page's own explore tool, beside every view tool, and no other page's", async () => {
    const onUsage = await toolsOn('/usage?period=7d');
    expect(explores(onUsage)).toEqual(['explore_usage']);
    expect(onUsage).toEqual(expect.arrayContaining(['view_usage', 'view_customer', 'view_members']));
    expect(explores(await toolsOn('/customers/northwind-labs'))).toEqual(['explore_customer']);
    expect(explores(await toolsOn('/members'))).toEqual(['explore_members']);
    expect(explores(await toolsOn('/settings'))).toEqual([]);
    expect(explores(await toolsOn('/'))).toEqual([]);
  });

  it("offers a person only the sources they may read, and hands no explore tool where they may not use the view", async () => {
    await toolsOn('/usage');
    const ownerSchema = JSON.stringify(seen.calls[0].tools.find((t) => t.name === 'explore_usage')?.inputSchema);
    expect(ownerSchema).toContain('"costs"');
    jar.value = 'members_12';
    expect(explores(await toolsOn('/usage'))).toEqual(['explore_usage']);
    const viewerSchema = JSON.stringify(seen.calls[0].tools.find((t) => t.name === 'explore_usage')?.inputSchema);
    expect(viewerSchema).toContain('"hours"');
    expect(viewerSchema).not.toContain('"costs"');
    expect(explores(await toolsOn('/members'))).toEqual([]);
  });

  it('runs a call under the person it was handed to, and answers with an address and the text', async () => {
    seen.script = [{ type: 'tool-call', toolCallId: 'c1', toolName: 'explore_usage', input: JSON.stringify({ source: 'hours', measures: ['r'], where: [{ field: 'hour', op: 'eq', value: 22 }], by: 'weekday' }) }];
    await toolsOn('/usage');
    const result = JSON.stringify(seen.calls[1].prompt.filter((m) => m.role === 'tool'));
    expect(result).toContain('Requests');
    expect(result).toContain('Who sent them is not recorded.');
    expect(result).toMatch(/"address"/);

    jar.value = 'members_12';
    seen.script = [{ type: 'tool-call', toolCallId: 'c2', toolName: 'explore_usage', input: JSON.stringify({ source: 'costs', measures: ['c'] }) }];
    await toolsOn('/usage');
    expect(JSON.stringify(seen.calls[1].prompt.filter((m) => m.role === 'tool'))).toContain('You do not have access to that.');
  });

  it("offers a detail page's own input beside the query, and hands it to the query's fixed conditions", async () => {
    await toolsOn('/customers/northwind-labs');
    const schema = seen.calls[0].tools.find((t) => t.name === 'explore_customer')?.inputSchema as { properties?: Record<string, unknown>; required?: string[] };
    expect(Object.keys(schema?.properties ?? {})).toEqual(expect.arrayContaining(['id', 'source', 'measures']));
    expect(schema?.required ?? []).toEqual(expect.arrayContaining(['id', 'source', 'measures']));
    expect(schema?.required ?? []).not.toContain('rows');
    // A rail view's own input (Usage's period here would be one) is not joined: only a detail page's.
    const usageSchema = await toolsOn('/usage').then(() => seen.calls[0].tools.find((t) => t.name === 'explore_usage')?.inputSchema as { properties?: Record<string, unknown> });
    expect(Object.keys(usageSchema?.properties ?? {})).not.toContain('id');
    seen.script = [{ type: 'tool-call', toolCallId: 'c3', toolName: 'explore_customer', input: JSON.stringify({ id: 'northwind-labs', source: 'hours', measures: ['r'], by: 'weekday' }) }];
    await toolsOn('/customers/northwind-labs');
    expect(seen.fixed).toEqual(['northwind-labs']);
    expect(JSON.stringify(seen.calls[1].prompt.filter((m) => m.role === 'tool'))).toContain('Requests');
  });
});
