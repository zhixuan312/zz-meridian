// @vitest-environment node
/**
 * `readAll` is the read a count, a sum or a claim of "every" starts from (`src/data/README.md`). A read answers one page
 * of at most 500 rows, so `readAll` keeps asking — and it must keep asking for *the same question*, or a caller that
 * needs the rows in an order or with a condition gets the first page of a different one.
 *
 * The requests log is the sample's one collection larger than a page: 240 rows.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {} }));

import { readAll } from '@/data/read';

describe('readAll with a question', () => {
  it('answers with every row the collection holds when no condition is asked', async () => {
    const { rows } = await readAll('requests');
    expect(rows).toHaveLength(240);
  });

  it('keeps the order it was asked for across the page boundary', async () => {
    const { rows } = await readAll('requests', { sort: { field: 'at', dir: 'desc' } });
    expect(rows).toHaveLength(240);
    const at = rows.map((r) => String(r.at));
    // Every page holds the newest of what is left, so the whole run descends. A page read without the sort would come
    // back in the key's order instead, and the last row of one page would be newer than the first of the next.
    expect([...at].sort().reverse()).toEqual(at);
  });

  it('answers with every row a condition keeps, not the first page of a wider one', async () => {
    const { rows } = await readAll('requests', { where: [{ field: 'method', op: 'eq', value: 'POST' }], sort: { field: 'at', dir: 'desc' } });
    expect(rows.length).toBeGreaterThan(100);
    expect(rows.every((r) => r.method === 'POST')).toBe(true);
    const at = rows.map((r) => String(r.at));
    expect([...at].sort().reverse()).toEqual(at);
  });

  it('means every row even when the caller passes a limit', async () => {
    const { rows } = await readAll('requests', { limit: 10 });
    expect(rows).toHaveLength(240);
  });
});
