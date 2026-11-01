// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { arrayCollection } from '@/lib/collection';

import { members } from '@/data/collections';
import { assistantTools, ChangeRefused } from '@/lib/assistant/tools';

const writer = { write() {}, merge() {}, onError: undefined } as never;
type Exec = { execute: (input: unknown, options: unknown) => Promise<unknown> };

describe('an approved assistant write', () => {
  it('is checked again at execution, so an approval made before a revocation does nothing', async () => {
    const invalidated: string[] = [];
    const { tools } = assistantTools([members], writer, { authorize: async () => false, invalidate: (n) => invalidated.push(n) });
    const before = await members.query({});
    const seen: unknown[] = [];
    const off = members.subscribe!((e) => seen.push(e));
    const remove = tools.remove_members as unknown as Exec;
    await expect(remove.execute({ ids: [String(before.rows[0].id)] }, { toolCallId: 'approved-then-revoked', messages: [] })).rejects.toThrow(/no longer have permission/);
    expect((await members.query({})).total).toBe(before.total);
    expect(invalidated).toEqual([]);
    expect(seen).toEqual([]);
    off();
  });
  it('asks with the records it touches, and invalidates its collection after an authorized execution', async () => {
    const asked: unknown[][] = [];
    const invalidated: string[] = [];
    const { tools } = assistantTools([members], writer, { authorize: async (...a) => { asked.push(a); return true; }, invalidate: (n) => invalidated.push(n) });
    const { rows } = await members.query({});
    const id = String(rows[0].id);
    const update = tools.update_members as unknown as Exec;
    await update.execute({ ids: [id], set: { team: 'Design' } }, { toolCallId: 'approved-and-allowed', messages: [] });
    expect(asked).toEqual([['members', 'update', [id]]]);
    expect(invalidated).toEqual(['members']);
  });
  it('is recorded once it commits, by the records\' titles, and a failed record leaves the change in place', async () => {
    const recorded: unknown[] = [];
    const { rows } = await members.query({});
    const [a, b] = [rows[1], rows[2]];
    const { tools } = assistantTools([members], writer, { authorize: async () => true, invalidate: () => {}, record: (c) => { recorded.push(c); } });
    await (tools.update_members as unknown as Exec).execute({ ids: [String(a.id), String(b.id)], set: { status: 'Suspended' } }, { toolCallId: 'recorded', messages: [] });
    expect(recorded).toEqual([{ name: 'members', label: 'Members', op: 'update', titles: [a.name, b.name], set: { status: 'Suspended' } }]);
    const failing = assistantTools([members], writer, { authorize: async () => true, invalidate: () => {}, record: () => { throw new Error('audit store down'); } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await (failing.tools.update_members as unknown as Exec).execute({ ids: [String(a.id)], set: { team: 'Sales' } }, { toolCallId: 'recorded-failing', messages: [] });
    expect((await members.query({ where: [{ field: 'id', op: 'eq', value: String(a.id) }] })).rows[0].team).toBe('Sales');
  });

  it.each(['create', 'update', 'remove'] as const)('keeps a committed %s applied when invalidation throws, and still records it', async (op) => {
    const c = arrayCollection<{ id: string; name: string; secret: string }, 'id'>({
      name: `commit_${op}`, label: 'Items', description: 'Disposable records', key: 'id',
      title: (r: { name: string }) => r.name, fields: z.object({ name: z.string(), secret: z.string().default('private') }),
      rows: [{ id: 'one', name: 'One', secret: 'private' }], hidden: ['secret'], allow: ['create', 'update', 'remove'],
    });
    const record = vi.fn();
    const invalidate = vi.fn(() => { throw new Error('cache failure'); });
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { tools } = assistantTools([c], writer, { authorize: async () => true, invalidate, record });
      const execute = (tools[`${op}_${c.name}`] as unknown as Exec).execute;
      const input = op === 'create' ? { name: 'Two' } : op === 'update' ? { ids: ['one'], set: { name: 'Changed' } } : { ids: ['one'] };
      const options = { toolCallId: `committed-${op}-invalidation`, messages: [] };
      const outcome = await execute(input, options) as { status: string; result: unknown; warning: string };
      expect(outcome.status).toBe('applied');
      expect(outcome.warning).toMatch(/change applied.*cached reads could not be refreshed/i);
      expect(JSON.stringify(outcome)).not.toContain('private');
      const rows = (await c.query({})).rows;
      expect(rows.map((r) => r.name)).toEqual(op === 'create' ? ['One', 'Two'] : op === 'update' ? ['Changed'] : []);
      expect(record).toHaveBeenCalledOnce();
      expect(record).toHaveBeenCalledWith(expect.objectContaining({ name: c.name, op }));
      await expect(execute(input, options)).rejects.toThrow(/already applied/);
      expect((await c.query({})).rows).toEqual(rows);
      expect(invalidate).toHaveBeenCalledOnce();
      expect(record).toHaveBeenCalledOnce();
    } finally {
      logged.mockRestore();
    }
  });

  it('nests protocol-looking record fields under result instead of treating them as an outcome', async () => {
    const c = arrayCollection<{ id: string; status: string; applied: boolean; result: string; warning: string }, 'id'>({
      name: 'outcome_fields', label: 'Records', description: 'Records with ordinary status fields', key: 'id',
      title: (r) => r.result,
      fields: z.object({ status: z.string(), applied: z.boolean(), result: z.string(), warning: z.string() }),
      rows: [], allow: ['create'],
    });
    const { tools } = assistantTools([c], writer, { authorize: async () => true, invalidate: () => {} });
    const record = { status: 'applied', applied: true, result: 'Public dummy record', warning: 'Record text, not a cache warning' };
    const outcome = await (tools.create_outcome_fields as unknown as Exec).execute(record, { toolCallId: 'protocol-looking-record', messages: [] });
    expect(outcome).toEqual({ status: 'applied', result: { id: expect.any(String), ...record } });
    expect(outcome).not.toHaveProperty('warning');
  });

  it('does not report an unfinished mutation as applied, and refuses replay after it commits', async () => {
    const c = arrayCollection<{ id: string; name: string }, 'id'>({
      name: 'pending_outcome', label: 'Items', description: 'Disposable records', key: 'id',
      title: (r: { name: string }) => r.name, fields: z.object({ name: z.string() }), rows: [],
      allow: ['create'],
    });
    const started = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const create = c.create!;
    let writes = 0;
    c.create = async (input) => {
      writes++;
      started.resolve();
      await release.promise;
      return create(input);
    };
    const { tools } = assistantTools([c], writer, { authorize: async () => true, invalidate: () => {} });
    const execute = (tools.create_pending_outcome as unknown as Exec).execute;
    const options = { toolCallId: 'held-mutation-truth', messages: [] };
    const first = execute({ name: 'One' }, options);
    try {
      await started.promise;
      const refusal = await execute({ name: 'One' }, options).catch((error: unknown) => error);
      expect(refusal).toBeInstanceOf(ChangeRefused);
      expect((refusal as Error).message).not.toMatch(/applied/i);
      expect((await c.query({})).rows).toEqual([]);
      expect(writes).toBe(1);
    } finally {
      release.resolve();
      await first;
    }
    await expect(execute({ name: 'One' }, options)).rejects.toThrow(ChangeRefused);
    expect((await c.query({})).rows.map((row) => row.name)).toEqual(['One']);
    expect(writes).toBe(1);
  });

  it('retries a rejected mutation with the same approval without confusing another concurrent call', async () => {
    const c = arrayCollection<{ id: string; name: string }, 'id'>({
      name: 'isolated_commits', label: 'Items', description: 'Disposable records', key: 'id',
      title: (r: { name: string }) => r.name, fields: z.object({ name: z.string() }), rows: [],
      allow: ['create'],
    });
    const { promise: pending, resolve: release } = Promise.withResolvers<void>();
    let attempts = 0;
    const create = c.create!;
    c.create = async (input) => {
      if (input.name === 'Retry' && ++attempts === 1) {
        await pending;
        throw new Error('store refused before commit');
      }
      return create(input);
    };
    const { tools } = assistantTools([c], writer, { authorize: async () => true, invalidate: () => {} });
    const execute = (tools.create_isolated_commits as unknown as Exec).execute;
    const retryOptions = { toolCallId: 'isolated-retry', messages: [] };
    const rejected = execute({ name: 'Retry' }, retryOptions);
    const rejection = expect(rejected).rejects.toThrow('store refused before commit');
    await execute({ name: 'Committed' }, { toolCallId: 'isolated-success', messages: [] });
    await expect(execute({ name: 'Retry' }, retryOptions)).rejects.toThrow(ChangeRefused);
    release();
    await rejection;
    await execute({ name: 'Retry' }, retryOptions);
    await expect(execute({ name: 'Committed' }, { toolCallId: 'isolated-success', messages: [] })).rejects.toThrow(/already applied/);
    expect((await c.query({})).rows.map((r) => r.name)).toEqual(['Committed', 'Retry']);
  });
});
