// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { asSchema, readUIMessageStream, type UIMessage, type UIMessageChunk } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { arrayCollection, type AnyCollection } from '@/lib/collection';
import type { PreparedQuery } from '@/lib/explore';
import { respond } from '@/lib/assistant/respond';
import { assistantTools, type HandedExplore } from '@/lib/assistant/tools';
import { collections, members } from '@/data/collections';

type Person = { id: string; name: string; team: 'Support' | 'Sales' };
let n = 0;
const people = (rows?: Person[]) =>
  arrayCollection({
    name: `staff${++n}`,
    label: 'Staff',
    description: 'People in a test.',
    fields: z.object({ name: z.string(), team: z.enum(['Support', 'Sales']) }),
    key: 'id',
    title: (r: Person) => r.name,
    rows: rows ?? [
      { id: 'p_1', name: 'Alice Moreno', team: 'Support' },
      { id: 'p_2', name: 'Ravi Patel', team: 'Support' },
      { id: 'p_3', name: 'Amara Okafor', team: 'Sales' },
    ],
    allow: ['create', 'update', 'remove'],
  });

/** A guard that permits everything: these tests are about the tools, the guard has its own file. */
const guard = { authorize: async () => true, invalidate: () => {} };
const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
const stream = (parts: unknown[]) => ({ stream: new ReadableStream({ start(c) { for (const p of parts) c.enqueue(p as never); c.close(); } }) });
/** A model step: each call builds a fresh stream, because a stream can be read once. */
type Step = () => ReturnType<typeof stream>;
const call = (id: string, toolName: string, input: unknown): Step => () => stream([{ type: 'tool-call', toolCallId: id, toolName, input: JSON.stringify(input) }, { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage }]);
const say = (text: string): Step => () => stream([{ type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: text }, { type: 'text-end', id: 't' }, { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage }]);
/** A model that plays the given steps in order (repeating the last), and counts how often it was called. */
const scripted = (...steps: Step[]) => {
  let i = 0;
  const model = new MockLanguageModelV4({ doStream: async () => { model.calls = ++i; return steps[Math.min(i - 1, steps.length - 1)](); } }) as MockLanguageModelV4 & { calls: number };
  model.calls = 0;
  return model;
};
/**
 * A page's prepared query over `c`, handed as the route hands one: `c`'s `drill` columns, a filter and a facet on `team`
 * where it has one, read straight from `c` under rights that read it and hide what it hides.
 */
function explored(c: AnyCollection, query: Partial<PreparedQuery['sources'][string]> = {}): HandedExplore {
  const explore: PreparedQuery = {
    sources: {
      staff: {
        collection: c.name,
        filters: { team: { ops: ['eq', 'in'], values: ['Support', 'Sales'] } },
        facets: ['team'],
        measures: { people: { label: 'People', unit: 'people', definition: 'People in the test.', agg: 'count' } },
        drill: { columns: ['id', 'name'], address: () => '/staff' },
        cannot: 'Seats are not counted here.',
        ...query,
      },
    },
  };
  const view = { name: 'staff', title: 'Staff', description: 'The staff.', needs: [], page: '/staff', input: z.object({}), read: async () => { throw new Error('not read here'); }, explore };
  return {
    view: view as never,
    rights: { readable: new Set([c.name]), hidden: () => (c.hidden ?? []) as string[] },
    io: { aggregate: (_, q) => c.aggregate(q), read: (_, q) => c.query(q), today: '2026-10-03' },
    page: '/staff',
  };
}
const SECRET = 's'.repeat(43);
const NOW = new Date('2026-10-03T09:00:00Z');
const page = { path: '/staff', title: 'Staff', text: '' };
const ask = (text: string): UIMessage[] => [{ id: 'u1', role: 'user', parts: [{ type: 'text', text }] }];
async function chunks(res: Response): Promise<any[]> {
  const out: any[] = [];
  for (const line of (await res.text()).split('\n')) if (line.startsWith('data: ') && line !== 'data: [DONE]') out.push(JSON.parse(line.slice(6)));
  return out;
}
/** The assistant message the stream builds, as the panel would hold it. */
async function message(events: any[]): Promise<UIMessage> {
  let last: UIMessage | undefined;
  const s = new ReadableStream<UIMessageChunk>({ start(c) { for (const e of events) c.enqueue(e); c.close(); } });
  for await (const m of readUIMessageStream({ stream: s })) last = m;
  return last!;
}

describe('retrieval', () => {
  test("the page's prepared query runs at once: no approval, no proposal, its answer and rows in the tool output", async () => {
    const c = people();
    const call1 = call('q1', 'explore_staff', { source: 'staff', measures: ['people'], where: [{ field: 'team', op: 'eq', value: 'Support' }], rows: 20 });
    const events = await chunks(await respond({ model: scripted(call1, say('Two.')), secret: SECRET, now: NOW, messages: ask('Who is in Support?'), page, guard, collections: [], explore: explored(c) }));
    expect(events.some((e) => e.type === 'tool-approval-request')).toBe(false);
    expect(events.some((e) => e.type === 'data-proposal')).toBe(false);
    const out = events.find((e) => e.type === 'tool-output-available' && e.toolCallId === 'q1');
    expect(out.output.address).toBe('/staff');
    expect(out.output.answer).toContain('People: 2 people.');
    expect(out.output.answer.split('\n').filter((l: string) => l.startsWith('- /staff: '))).toEqual(['- /staff: id p_1, name Alice Moreno', '- /staff: id p_2, name Ravi Patel']);
  });

  test('a prepared query drills at most 20 rows, and refuses more', async () => {
    const many = Array.from({ length: 120 }, (_, i) => ({ id: `p_${i + 1}`, name: `Person ${i + 1}`, team: 'Sales' as const }));
    const c = people(many);
    const a = await chunks(await respond({ model: scripted(call('q1', 'explore_staff', { source: 'staff', measures: ['people'], rows: 20 }), say('ok')), secret: SECRET, now: NOW, messages: ask('All'), page, guard, collections: [], explore: explored(c) }));
    const out = a.find((e) => e.type === 'tool-output-available' && e.toolCallId === 'q1');
    expect(out.output.answer).toContain('Rows, in order, 20 of 120:');
    expect(out.output.answer.split('\n').filter((l: string) => l.startsWith('- /staff: '))).toHaveLength(20);
    const b = await chunks(await respond({ model: scripted(call('q2', 'explore_staff', { source: 'staff', measures: ['people'], rows: 21 }), say('ok')), secret: SECRET, now: NOW, messages: ask('All'), page, guard, collections: [], explore: explored(c) }));
    expect(b.some((e) => e.type === 'tool-output-available' && e.toolCallId === 'q2')).toBe(false);
    expect(b.some((e) => /error/.test(e.type) && e.toolCallId === 'q2')).toBe(true);
  });

  test('a thread that carries a write this page does not hand, closed without a decision, is still answered', async () => {
    // A removal asked on another page and expired on a reload: its tool is not handed here, and the thread goes on.
    const c = people();
    const expired = { id: 'a1', role: 'assistant', parts: [{ type: `tool-remove_${c.name}`, toolCallId: 'r1', state: 'output-denied', input: { ids: ['p_3'] }, approval: { id: 'x', approved: false, reason: 'The page was reloaded before anyone approved it.' } }] } as UIMessage;
    const events = await chunks(await respond({ model: scripted(say('ok')), secret: SECRET, now: NOW, messages: [...ask('Remove Amara'), expired, ...ask('What is this page?')], page, guard, collections: [], explore: explored(c) }));
    expect(events.filter((e) => e.type === 'text-delta').map((e) => e.delta).join('')).toBe('ok');
    expect(events.some((e) => e.type === 'error')).toBe(false);
  });

  test('one reply makes at most 8 model steps', async () => {
    const c = people();
    let k = 0;
    const model = scripted(() => call(`loop${++k}`, 'explore_staff', { source: 'staff', measures: ['people'] })());
    await (await respond({ model, secret: SECRET, now: NOW, messages: ask('Loop'), page, guard, collections: [], explore: explored(c) })).text();
    expect(model.calls).toBe(8);
  });
});

describe('mutations', () => {
  test('an update waits for approval with the server\'s preview, and changes nothing until approved', async () => {
    const c = people();
    const events = await chunks(await respond({ model: scripted(call('u1', `update_${c.name}`, { ids: ['p_1', 'p_2'], set: { team: 'Sales' } })), secret: SECRET, now: NOW, messages: ask('Move them'), page, guard, collections: [c] }));
    const preview = events.find((e) => e.type === 'data-proposal');
    expect(preview.id).toBe('u1');
    expect(preview.data).toEqual({ title: 'Change 2 staff', tone: 'neutral', changes: [{ label: 'Alice Moreno', from: 'Support', to: 'Sales' }, { label: 'Ravi Patel', from: 'Support', to: 'Sales' }] });
    expect(events.find((e) => e.type === 'tool-approval-request').toolCallId).toBe('u1');
    expect((await c.query({ where: [{ field: 'team', op: 'eq', value: 'Support' }] })).total).toBe(2);
  });

  test('a remove is critical, a create is neutral, and each names what it touches', async () => {
    const c = people();
    const rm = await chunks(await respond({ model: scripted(call('r1', `remove_${c.name}`, { ids: ['p_3'] })), secret: SECRET, now: NOW, messages: ask('Remove Amara'), page, guard, collections: [c] }));
    expect(rm.find((e) => e.type === 'data-proposal').data).toEqual({ title: 'Remove Amara Okafor', tone: 'critical', changes: [{ label: 'Amara Okafor', from: 'Staff', to: 'Removed' }] });
    const add = await chunks(await respond({ model: scripted(call('c1', `create_${c.name}`, { name: 'Jin Park', team: 'Sales' })), secret: SECRET, now: NOW, messages: ask('Add Jin'), page, guard, collections: [c] }));
    const p = add.find((e) => e.type === 'data-proposal').data;
    expect(p.title).toBe('Add Jin Park');
    expect(p.tone).toBe('neutral');
    expect(p.changes).toEqual([{ label: 'name', from: '—', to: 'Jin Park' }, { label: 'team', from: '—', to: 'Sales' }]);
    expect((await c.query({})).total).toBe(3);
  });

  test('an approved change runs once; an approval whose input was altered is refused', async () => {
    const c = people();
    const first = await message(await chunks(await respond({ model: scripted(call('u1', `update_${c.name}`, { ids: ['p_1'], set: { team: 'Sales' } })), secret: SECRET, now: NOW, messages: ask('Move Alice'), page, guard, collections: [c] })));
    const approve = (m: UIMessage, tamper = false): UIMessage[] => {
      const copy = structuredClone(m);
      for (const p of copy.parts as any[]) if (p.toolCallId === 'u1') { p.state = 'approval-responded'; p.approval = { ...p.approval, approved: true }; if (tamper) p.input = { ids: ['p_2'], set: { team: 'Sales' } }; }
      return [...ask('Move Alice'), copy];
    };
    await (await respond({ model: scripted(say('Done.')), secret: SECRET, now: NOW, messages: approve(first, true), page, guard, collections: [c] })).text();
    expect((await c.query({ where: [{ field: 'team', op: 'eq', value: 'Support' }] })).total).toBe(2);
    await (await respond({ model: scripted(say('Done.')), secret: SECRET, now: NOW, messages: approve(first), page, guard, collections: [c] })).text();
    expect((await c.query({ where: [{ field: 'id', op: 'eq', value: 'p_1' }] })).rows[0].team).toBe('Sales');
    expect((await c.query({ where: [{ field: 'id', op: 'eq', value: 'p_2' }] })).rows[0].team).toBe('Support');
  });
});

describe('hidden fields', () => {
  test("a hidden field never reaches the model: not in a prepared query's rows, not a field to filter on", async () => {
    type Key = { id: string; name: string; secret: string };
    const k = arrayCollection({ name: `vault${++n}`, label: 'Vault', description: 'Keys in a test.', fields: z.object({ name: z.string(), secret: z.string() }), key: 'id', title: (r: Key) => r.name, rows: [{ id: 'k_1', name: 'Production', secret: 'sk-live-123' }], allow: ['remove'], hidden: ['secret'] });
    // The page's author declared the secret anyway: the person's rights leave it out of what is offered and what is drilled.
    const handed = explored(k, { filters: { secret: { ops: ['eq'] } }, facets: [], drill: { columns: ['id', 'name', 'secret'], address: () => '/staff' } });
    const ok = await chunks(await respond({ model: scripted(call('q1', 'explore_staff', { source: 'staff', measures: ['people'], rows: 5 }), say('ok')), secret: SECRET, now: NOW, messages: ask('Keys?'), page, guard, collections: [k], explore: handed }));
    const out = ok.find((e) => e.type === 'tool-output-available' && e.toolCallId === 'q1');
    expect(out.output.answer).toContain('- /staff: id k_1, name Production');
    expect(JSON.stringify(ok)).not.toContain('sk-live-123');
    const bad = await chunks(await respond({ model: scripted(call('q2', 'explore_staff', { source: 'staff', measures: ['people'], where: [{ field: 'secret', op: 'eq', value: 'sk-live-123' }] }), say('ok')), secret: SECRET, now: NOW, messages: ask('Keys?'), page, guard, collections: [k], explore: handed }));
    expect(bad.find((e) => e.type === 'tool-output-available' && e.toolCallId === 'q2').output.answer).toBe('You do not have access to that.');
    expect((await k.query({})).rows[0].secret).toBe('sk-live-123');
  });
});

describe('page-only fields', () => {
  test('a field only a page may set is absent from the write schemas, and refused when sent anyway', () => {
    const { tools } = assistantTools([members], { write() {}, merge() {}, onError: undefined } as never, guard);
    const create = tools.create_members as unknown as { inputSchema: { safeParse: (v: unknown) => { success: boolean } } };
    const update = tools.update_members as unknown as { inputSchema: { safeParse: (v: unknown) => { success: boolean } } };
    const ada = { name: 'Ada Lovelace', email: 'ada.lovelace@example.com', team: 'Design', status: 'Active', joined: '2026-10-01', lastActive: null };
    // The fields stay readable and writable where a page sets them, so an ordinary create and change still pass.
    expect(create.inputSchema.safeParse(ada).success).toBe(true);
    expect(update.inputSchema.safeParse({ ids: ['members_4'], set: { team: 'Sales' } }).success).toBe(true);
    // A role or an add-on cannot be set by an agent: the schema is strict, so naming one is refused and nothing runs.
    expect(create.inputSchema.safeParse({ ...ada, role: 'Admin' }).success).toBe(false);
    expect(create.inputSchema.safeParse({ ...ada, addOns: ['Key manager'] }).success).toBe(false);
    expect(update.inputSchema.safeParse({ ids: ['members_4'], set: { role: 'Admin' } }).success).toBe(false);
    expect(update.inputSchema.safeParse({ ids: ['members_4'], set: { addOns: ['Key manager'] } }).success).toBe(false);
  });
});

describe('the sample\'s tools, as an MCP server would list them', () => {
  test('every tool converts to a name, a description and a JSON Schema object; key creation stays page-only', () => {
    const { tools } = assistantTools(collections, { write() {}, merge() {}, onError: undefined } as never, guard);
    const defs = Object.entries(tools).map(([name, t]: [string, any]) => ({ name, description: t.description, inputSchema: asSchema(t.inputSchema).jsonSchema as { type?: string } }));
    const named = defs.map((d) => d.name);
    for (const t of ['create_members', 'update_members', 'remove_members', 'remove_keys']) expect(named).toContain(t);
    expect(named).not.toContain('create_keys');
    // Reading is the views' and the prepared queries': no collection is a tool to read.
    expect(named.filter((x) => !/^(create|update|remove)_/.test(x))).toEqual([]);
    expect(named.filter((x) => x.endsWith('_requests'))).toEqual([]);
    for (const d of defs) {
      expect(d.description?.length).toBeGreaterThan(10);
      expect(d.inputSchema.type).toBe('object');
    }
  });
});
