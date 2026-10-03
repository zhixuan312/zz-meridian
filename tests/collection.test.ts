// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { arrayCollection, queryInput } from '@/lib/collection';

type Person = { id: string; name: string; team: 'Support' | 'Sales'; seats: number; lastActive: string | null };
const ROWS: Person[] = [
  { id: 'p_1', name: 'Alice Moreno', team: 'Support', seats: 3, lastActive: '2026-07-22' },
  { id: 'p_2', name: 'Ravi Patel', team: 'Support', seats: 12, lastActive: '2026-07-04' },
  { id: 'p_3', name: 'Amara Okafor', team: 'Sales', seats: 7, lastActive: null },
];
let n = 0;
/** A collection with a name no other test uses, so the shared store never leaks between tests. */
const people = (rows: Person[] = ROWS, name = `people${++n}`) =>
  arrayCollection({
    name,
    label: 'People',
    description: 'People in a test.',
    fields: z.object({ name: z.string(), team: z.enum(['Support', 'Sales']), seats: z.number(), lastActive: z.string().nullable() }),
    key: 'id',
    title: (r: Person) => r.name,
    rows: structuredClone(rows),
    allow: ['create', 'update', 'remove'],
  });
const names = (r: { rows: Person[] }) => r.rows.map((p) => p.name);

describe('query', () => {
  test('every condition must hold; ISO dates compare by time', async () => {
    const r = await people().query({ where: [{ field: 'team', op: 'eq', value: 'Support' }, { field: 'lastActive', op: 'lt', value: '2026-08-05' }] });
    expect(names(r)).toEqual(['Alice Moreno', 'Ravi Patel']);
    expect(r.total).toBe(2);
  });

  test('numbers compare as numbers, contains ignores case, in takes a list, the key can be queried', async () => {
    const c = people();
    expect(names(await c.query({ where: [{ field: 'seats', op: 'gt', value: 5 }] }))).toEqual(['Ravi Patel', 'Amara Okafor']);
    expect(names(await c.query({ where: [{ field: 'name', op: 'contains', value: 'MOR' }] }))).toEqual(['Alice Moreno']);
    expect(names(await c.query({ where: [{ field: 'team', op: 'in', value: ['Sales'] }] }))).toEqual(['Amara Okafor']);
    expect(names(await c.query({ where: [{ field: 'id', op: 'eq', value: 'p_2' }] }))).toEqual(['Ravi Patel']);
  });

  test('a null field matches only ne', async () => {
    const c = people();
    expect(names(await c.query({ where: [{ field: 'lastActive', op: 'ne', value: '2026-07-22' }] }))).toEqual(['Ravi Patel', 'Amara Okafor']);
    expect(names(await c.query({ where: [{ field: 'lastActive', op: 'lt', value: '2030-01-01' }] }))).toEqual(['Alice Moreno', 'Ravi Patel']);
  });

  test('sort and limit; total counts before the limit; no sort keeps the collection order; no limit returns every row', async () => {
    const c = people();
    const r = await c.query({ sort: { field: 'seats', dir: 'desc' }, limit: 2 });
    expect(names(r)).toEqual(['Ravi Patel', 'Amara Okafor']);
    expect(r.total).toBe(3);
    expect(names(await c.query({}))).toEqual(['Alice Moreno', 'Ravi Patel', 'Amara Okafor']);
  });
});

describe('changes', () => {
  test('create gives the next id after the highest numeric suffix', async () => {
    const c = people();
    const row = await c.create!({ name: 'Jin Park', team: 'Sales', seats: 1, lastActive: null });
    expect(row.id).toBe(`${c.name}_4`);
    expect((await c.query({})).total).toBe(4);
  });

  test('update and remove are all-or-nothing', async () => {
    const c = people();
    await expect(c.update!(['p_1', 'nope'], { team: 'Sales' })).rejects.toThrow(/nope/);
    expect(names(await c.query({ where: [{ field: 'team', op: 'eq', value: 'Support' }] }))).toEqual(['Alice Moreno', 'Ravi Patel']);
    await expect(c.remove!(['p_3', 'gone'])).rejects.toThrow(/gone/);
    expect((await c.query({})).total).toBe(3);
    expect(await c.update!(['p_1'], { team: 'Sales' })).toEqual([{ ...ROWS[0], team: 'Sales' }]);
    expect(await c.remove!(['p_3'])).toBe(1);
    expect(names(await c.query({}))).toEqual(['Alice Moreno', 'Ravi Patel']);
  });

  test('the store is seeded once per name: a second definition sees the first one\'s changes', async () => {
    const first = people(ROWS, 'shared_people');
    await first.update!(['p_2'], { seats: 99 });
    const second = people([], 'shared_people');
    expect((await second.query({ where: [{ field: 'id', op: 'eq', value: 'p_2' }] })).rows[0].seats).toBe(99);
  });

  test('only the allowed operations exist', () => {
    const readOnly = arrayCollection({ name: `readonly${++n}`, label: 'Logs', description: 'd', fields: z.object({ name: z.string() }), key: 'id', title: (r: { id: string; name: string }) => r.name, rows: [], allow: [] });
    expect(readOnly.create).toBeUndefined();
    expect(readOnly.update).toBeUndefined();
    expect(readOnly.remove).toBeUndefined();
  });
});

describe('queryInput', () => {
  test('fields are the key and the record fields; limit is 1 to 100, 50 when absent', () => {
    const schema = queryInput(people());
    expect(schema.parse({}).limit).toBe(50);
    expect(schema.safeParse({ limit: 101 }).success).toBe(false);
    expect(schema.safeParse({ limit: 0 }).success).toBe(false);
    expect(schema.safeParse({ where: [{ field: 'salary', op: 'gt', value: 1 }] }).success).toBe(false);
    expect(schema.safeParse({ where: [{ field: 'id', op: 'eq', value: 'p_1' }, { field: 'lastActive', op: 'lt', value: '2026-08-05' }] }).success).toBe(true);
  });
});
