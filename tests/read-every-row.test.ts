// @vitest-environment node
/**
 * A read answers one page. Every read below is one a page, the assistant or a rule stands behind with the word "every":
 * each endpoint, every incident, each service. None of them says how many rows it answered, so none of them may ask for
 * one page — `src/data/README.md` states the rule, and `readAll` is what keeps it.
 *
 * The sample's own endpoints, services and incidents are few, so this test grows the store to more than a page. That is
 * how an adopter's data arrives: same collection, same read, more rows.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {} }));

import { readEndpoints, readIncidents, readServices } from '@/data/metrics';
import { readAll } from '@/data/read';

type Row = Record<string, unknown>;
/** The store one tenant's collection keeps in this process (`src/lib/collection.ts`): the rows the product reads. */
function store(name: string): { rows: Row[]; next: number } {
  const key = Symbol.for('zz-meridian.collections');
  const stores = ((globalThis as Record<symbol, unknown>)[key] ??= new Map()) as Map<string, { rows: Row[]; next: number }>;
  const found = stores.get(JSON.stringify(['demo', name]));
  if (!found) throw new Error(`${name} has no store: import the collection before growing it`);
  return found;
}
/** Adds `n` rows built from the collection's own first row, and answers how many it holds now. */
function grow(name: string, n: number, make: (i: number, base: Row) => Row): number {
  const s = store(name);
  const base = s.rows[0];
  if (!base) throw new Error(`${name} holds no row to build on`);
  for (let i = 0; i < n; i++) s.rows.push(make(i, base));
  return s.rows.length;
}

describe('a read that claims every row', () => {
  it('answers with each endpoint, not the first hundred, in the order it asked for', async () => {
    const total = grow('endpoints', 140, (i, base) => ({ ...base, id: `endpoints_more_${i}`, requests: 100_000 + i }));
    const endpoints = await readEndpoints();
    expect(endpoints).toHaveLength(total);
    // Busiest first, across the page boundary: the rows past the first page are the quiet ones, and they are here.
    const requests = endpoints.map((e) => e.requests);
    expect([...requests].sort((a, b) => b - a)).toEqual(requests);
    expect(requests).toContain(100_139);
    expect(requests).toContain(100_000);
  });

  it('answers with every incident, so the bell and the Services page count the same ones', async () => {
    const before = await readIncidents();
    const total = grow('incidents', 140, (i, base) => ({ ...base, id: `incidents_more_${i}`, state: 'resolved', started: new Date(Date.UTC(2000, 0, 1) + i * 86_400_000).toISOString() }));
    const out = await readIncidents();
    expect(out.all).toHaveLength(total);
    expect(out.past).toHaveLength(before.past.length + 140);
    expect(out.open).toHaveLength(before.open.length);
    // The two reads of the same collection, by the bell and by this page, hold the same records.
    expect((await readAll('incidents')).rows).toHaveLength(out.all.length);
    // Newest first: the appended ones are the oldest of the collection, so the earliest of them is the tail.
    expect(out.all.at(-1)!.id).toBe('incidents_more_0');
  });

  it('answers with each service, in the order the team reads its stack', async () => {
    const total = grow('services', 140, (i, base) => ({ ...base, id: `services_more_${i}`, order: 1000 + i, name: `Service ${i}` }));
    const services = await readServices();
    expect(services).toHaveLength(total);
    expect(services.at(-1)!.name).toBe('Service 139');
  });
});
