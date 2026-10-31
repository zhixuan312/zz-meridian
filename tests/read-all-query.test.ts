// @vitest-environment node
/**
 * `readAll` is the read a count, a sum or a claim of "every" starts from (`src/data/README.md`). A read answers one page
 * of at most 500 rows, so `readAll` keeps asking — and it must keep asking for *the same question*, or a caller that
 * needs the rows in an order or with a condition gets the first page of a different one.
 *
 * The request fixtures exercise real product queries; the separate array collection also crosses the 500-row boundary.
 */
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { readAll } from '@/data/read';
import { REQUESTS } from '@/system/fixtures/sample';
import { arrayCollection } from '@/lib/collection';
import type * as Access from '@/data/access';

vi.mock('@/data/access', async (importOriginal) => {
  const real = await importOriginal<typeof Access>();
  return {
    ...real,
    collectionFor: (...args: Parameters<typeof real.collectionFor>) => args[1] === BULK ? bulk : real.collectionFor(...args),
    can: (...args: Parameters<typeof real.can>) => args[1] === BULK && args[2] === 'read' ? Promise.resolve(true) : real.can(...args),
  };
});

const BULK = 'read-all-pagination';
const bulkRows = Array.from({ length: 1101 }, (_, rank) => ({ id: `row-${rank}`, rank, lane: rank % 2 ? 'odd' : 'even' }));
const bulk = arrayCollection({
  name: BULK, label: 'Rows', description: 'Pagination regression rows.', key: 'id', title: (row) => String(row.rank),
  fields: z.object({ rank: z.number(), lane: z.string() }), rows: bulkRows, allow: [],
});

describe('readAll with a question', () => {
  it('answers with every row the collection holds when no condition is asked', async () => {
    const { rows } = await readAll('requests');
    expect(rows).toHaveLength(REQUESTS.length);
  });

  it('keeps the order it was asked for', async () => {
    const { rows } = await readAll('requests', { sort: { field: 'at', dir: 'desc' } });
    expect(rows).toHaveLength(REQUESTS.length);
    const at = rows.map((r) => String(r.at));
    // Every page holds the newest of what is left, so the whole run descends. A page read without the sort would come
    // back in the key's order instead, and the last row of one page would be newer than the first of the next.
    expect([...at].sort().reverse()).toEqual(at);
  });

  it('answers with every row a condition keeps, not the first page of a wider one', async () => {
    const { rows } = await readAll('requests', { where: [{ field: 'method', op: 'eq', value: 'POST' }], sort: { field: 'at', dir: 'desc' } });
    expect(rows.map((r) => r.id).sort()).toEqual(REQUESTS.filter((r) => r.method === 'POST').map((r) => r.id).sort());
    expect(rows.every((r) => r.method === 'POST')).toBe(true);
    const at = rows.map((r) => String(r.at));
    expect([...at].sort().reverse()).toEqual(at);
  });

  it.each([{ limit: 10 }, { offset: 25 }, { offset: 1000 }])('means every matching row despite pagination %j', async (pagination) => {
    const { rows } = await readAll('requests', pagination);
    expect(rows).toHaveLength(REQUESTS.length);
  });

  it('keeps filters and order across pages without duplicating or losing rows to a caller offset', async () => {
    const { rows } = await readAll(BULK, {
      where: [{ field: 'lane', op: 'eq', value: 'even' }],
      sort: { field: 'rank', dir: 'desc' }, offset: 25, limit: 3,
    });
    expect(rows.map((row) => row.id)).toEqual(bulkRows.filter((row) => row.lane === 'even').reverse().map((row) => row.id));
  });
});
