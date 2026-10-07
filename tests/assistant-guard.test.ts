// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {} }));

import { members } from '@/data/collections';
import { assistantTools } from '@/lib/assistant/tools';

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
});
