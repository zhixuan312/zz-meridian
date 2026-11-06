// @vitest-environment node
/**
 * `readAll` is the read a count, a sum or a claim of "every" starts from (`src/data/README.md`). A read answers one page
 * of at most 500 rows, so `readAll` keeps asking — and it must keep asking for *the same question*, or a caller that
 * needs the rows in an order or with a condition gets the first page of a different one.
 *
 * The request fixtures exercise real product queries; array collections cross both the page and public offset boundaries.
 */
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { readAll, readInScope } from '@/data/read';
import { arrayCollection } from '@/lib/collection';
import { hasSample } from './sample-present';
import type * as Access from '@/data/access';
import { resolveAccess } from '@/data/access';

// The sample's own request log is the fixture four of these cases read; a product that replaced the sample has none of
// it, and the cases about it are then not applicable. The pagination rules below hold over this file's own collections
// and are never skipped (#131).
const sample = hasSample()
  ? (await import(/* @vite-ignore */ new URL('../src/system/fixtures/sample.ts', import.meta.url).pathname)) as { REQUESTS: { id: string; method: string }[] }
  : null;

vi.mock('@/data/access', async (importOriginal) => {
  const real = await importOriginal<typeof Access>();
  return {
    ...real,
    collectionFor: (...args: Parameters<typeof real.collectionFor>) => args[1] === BULK ? bulk : args[1] === LARGE ? large : real.collectionFor(...args),
    can: (...args: Parameters<typeof real.can>) => [BULK, LARGE].includes(args[1]) && args[2] === 'read' ? Promise.resolve(true) : real.can(...args),
  };
});

const BULK = 'read-all-pagination';
const bulkRows = Array.from({ length: 1101 }, (_, rank) => ({ id: `row-${rank}`, rank, lane: rank % 2 ? 'odd' : 'even' }));
const bulk = arrayCollection({
  name: BULK, label: 'Rows', description: 'Pagination regression rows.', key: 'id', title: (row) => String(row.rank),
  fields: z.object({ rank: z.number(), lane: z.string() }), rows: bulkRows, allow: [],
});

const LARGE = 'read-all-offset-boundary';
const largeRows = Array.from({ length: 100502 }, (_, rank) => ({
  id: `row-${String(rank).padStart(6, '0')}`, rank, lane: rank === 100501 ? 'excluded' : 'kept',
}));
const large = arrayCollection({
  name: LARGE, label: 'Rows', description: 'Public offset boundary regression rows.', key: 'id', title: (row) => String(row.rank),
  fields: z.object({ rank: z.number(), lane: z.string() }), rows: largeRows, allow: [],
});

describe('readAll with a question', () => {
  it.skipIf(!sample)('answers with every row the collection holds when no condition is asked', async () => {
    const { rows } = await readAll('requests');
    expect(rows).toHaveLength(sample!.REQUESTS.length);
  });

  it.skipIf(!sample)('keeps the order it was asked for', async () => {
    const { rows } = await readAll('requests', { sort: { field: 'at', dir: 'desc' } });
    expect(rows).toHaveLength(sample!.REQUESTS.length);
    const at = rows.map((r) => String(r.at));
    // Every page holds the newest of what is left, so the whole run descends. A page read without the sort would come
    // back in the key's order instead, and the last row of one page would be newer than the first of the next.
    expect([...at].sort().reverse()).toEqual(at);
  });

  it.skipIf(!sample)('answers with every row a condition keeps, not the first page of a wider one', async () => {
    const { rows } = await readAll('requests', { where: [{ field: 'method', op: 'eq', value: 'POST' }], sort: { field: 'at', dir: 'desc' } });
    expect(rows.map((r) => r.id).sort()).toEqual(sample!.REQUESTS.filter((r) => r.method === 'POST').map((r) => r.id).sort());
    expect(rows.every((r) => r.method === 'POST')).toBe(true);
    const at = rows.map((r) => String(r.at));
    expect([...at].sort().reverse()).toEqual(at);
  });

  it.skipIf(!sample).each([{ limit: 10 }, { offset: 25 }, { offset: 1000 }])('means every matching row despite pagination %j', async (pagination) => {
    const { rows } = await readAll('requests', pagination);
    expect(rows).toHaveLength(sample!.REQUESTS.length);
  });

  it('keeps filters and order across pages without duplicating or losing rows to a caller offset', async () => {
    const { rows } = await readAll(BULK, {
      where: [{ field: 'lane', op: 'eq', value: 'even' }],
      sort: { field: 'rank', dir: 'desc' }, offset: 25, limit: 3,
    });
    expect(rows.map((row) => row.id)).toEqual(bulkRows.filter((row) => row.lane === 'even').reverse().map((row) => row.id));
  });

  it('reads more than 100500 matching rows without widening the public offset limit', async () => {
    const { rows } = await readAll(LARGE, {
      where: [{ field: 'lane', op: 'eq', value: 'kept' }],
      sort: { field: 'rank', dir: 'desc' }, limit: 1, offset: 999999,
    });
    expect(rows.map((row) => row.id)).toEqual(largeRows.slice(0, -1).reverse().map((row) => row.id));
    const scope = await resolveAccess();
    await expect(readInScope(scope, LARGE, { offset: 100001 })).rejects.toThrow('offset must be a whole number from 0 to 100000');
    const page = await readInScope(scope, LARGE, { offset: 100000, limit: 1000, sort: { field: 'rank', dir: 'asc' } });
    expect(page.rows.map((row) => row.id)).toEqual(largeRows.slice(100000, 100500).map((row) => row.id));
    expect(page.total).toBe(largeRows.length);
  }, 30_000);
});
