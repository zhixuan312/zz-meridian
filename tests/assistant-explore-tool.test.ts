// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import type { UIMessage } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { arrayCollection } from '@/lib/collection';
import type { PreparedQuery } from '@/lib/explore';
import { respond } from '@/lib/assistant/respond';
import { assistantTools, type HandedExplore } from '@/lib/assistant/tools';

/**
 * What the page's prepared query tells the model about itself: a call that does not fit is answered in the person's own
 * terms, never naming a source or measure withheld from them, while a withheld name still reaches the runner and is
 * answered "You do not have access to that."; and on a detail page the tool says every call is held to the page's record.
 */
type Day = { id: string; date: string; revenue: number; compute: number };
const rows: Day[] = [{ id: 'd1', date: '2026-10-01', revenue: 100, compute: 40 }, { id: 'd2', date: '2026-10-02', revenue: 120, compute: 50 }];
const collection = (name: string) => arrayCollection({ name, label: name, description: 'Days in a test.', fields: z.object({ date: z.string(), revenue: z.number(), compute: z.number() }), key: 'id', title: (r: Day) => r.date, rows, allow: [] });
const ledger = collection('ledger');
const spend = collection('spend');
const query: PreparedQuery = {
  sources: {
    days: {
      collection: ledger.name,
      date: 'date',
      filters: {},
      facets: [],
      measures: {
        revenue: { label: 'Revenue', unit: 'USD', definition: 'Billed.', agg: 'sum', field: 'revenue' },
        grossMargin: { label: 'Gross margin', unit: '%', definition: 'Revenue less compute cost, over revenue.', derive: 'margin', of: ['revenue', 'costs.compute'], scale: 0.01 },
      },
      drill: { columns: ['id', 'date'], address: () => '/' },
      cannot: '',
    },
    costs: {
      collection: spend.name,
      date: 'date',
      filters: {},
      facets: [],
      measures: { compute: { label: 'Compute cost', unit: 'USD', definition: 'What compute cost.', agg: 'sum', field: 'compute' } },
      drill: { columns: ['id', 'date'], address: () => '/' },
      cannot: '',
    },
  },
};
/** The page's prepared query handed to a person who may read the ledger and not the spend, as a Viewer on Home. */
function handed(page = '/', input: z.ZodObject = z.object({}), fixed?: PreparedQuery['fixed']): HandedExplore {
  const view = { name: 'home', title: 'Home', description: 'The company.', needs: [], page, input, read: async () => { throw new Error('not read here'); }, explore: { ...query, ...(fixed ? { fixed } : {}) } };
  const all = { [ledger.name]: ledger, [spend.name]: spend };
  return {
    view: view as never,
    rights: { readable: new Set([ledger.name]), hidden: () => [] },
    io: { aggregate: (name, q) => all[name].aggregate(q), read: (name, q) => all[name].query(q), today: '2026-10-03' },
    page: '/',
  };
}

const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
const stream = (parts: unknown[]) => ({ stream: new ReadableStream({ start(c) { for (const p of parts) c.enqueue(p as never); c.close(); } }) });
/** A model that calls `explore_home` with `input` once, then says ok, and keeps every prompt it was given. */
function calling(input: unknown) {
  const prompts: unknown[] = [];
  const model = new MockLanguageModelV4({
    doStream: async (o: { prompt: unknown }) => {
      prompts.push(o.prompt);
      return prompts.length === 1
        ? stream([{ type: 'tool-call', toolCallId: 'q1', toolName: 'explore_home', input: JSON.stringify(input) }, { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage }])
        : stream([{ type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: 'ok' }, { type: 'text-end', id: 't' }, { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage }]);
    },
  } as never);
  return { model, prompts };
}
const ask: UIMessage[] = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'What was the margin?' }] }];
const guard = { authorize: async () => true, invalidate: () => {} };
/** What the panel and the model are given after the call: the stream's events and the tool's result in the model's next prompt. */
async function after(input: unknown): Promise<{ events: string; prompt: string }> {
  const { model, prompts } = calling(input);
  const res = await respond({ model: model as never, secret: 's'.repeat(43), now: new Date('2026-10-03T09:00:00Z'), messages: ask, page: { path: '/', title: 'Home', text: '' }, guard, collections: [], explore: handed() });
  const events = await res.text();
  // The tool's result, as the model's next prompt carries it.
  const next = (prompts[1] ?? []) as { role: string }[];
  return { events, prompt: JSON.stringify(next.filter((m) => m.role === 'tool')) };
}

describe('a call that does not fit', () => {
  test("is answered with the names the person may use, and never a source or measure withheld from them", async () => {
    const { events, prompt } = await after({ source: 'dayz', measures: ['revenu'] });
    expect(events).toContain('tool-input-error');
    // The model is told what it got wrong, in names it may use.
    expect(prompt).toContain('days');
    expect(prompt).toContain('revenue');
    for (const withheld of ['costs', 'grossMargin', 'compute', 'Compute cost', 'Gross margin']) {
      expect(prompt, withheld).not.toContain(withheld);
      expect(events, withheld).not.toContain(withheld);
    }
  });

  test('a declared name withheld from the person still reaches the runner, and is answered "You do not have access to that."', async () => {
    for (const input of [{ source: 'costs', measures: ['compute'] }, { source: 'days', measures: ['grossMargin'] }]) {
      const { events } = await after(input);
      expect(events, JSON.stringify(input)).toContain('"answer":"You do not have access to that."');
      expect(events).not.toContain('tool-input-error');
    }
  });
});

describe('on a detail page', () => {
  const writer = { write() {}, merge() {}, onError: undefined } as never;
  test('the prepared query says every call is held to the record the page shows', () => {
    const detail = handed('/customers/[id]', z.object({ id: z.string() }), async () => ({ days: [] }));
    const { tools } = assistantTools([], writer, guard, [], detail);
    const description = (tools.explore_home as { description?: string }).description ?? '';
    expect(description).toMatch(/every call is held to the record this page shows/i);
    expect(description).toMatch(/no condition to add for it/i);
  });

  test('a rail page says nothing of a record', () => {
    const { tools } = assistantTools([], writer, guard, [], handed());
    expect((tools.explore_home as { description?: string }).description).not.toMatch(/record this page shows/i);
  });
});
