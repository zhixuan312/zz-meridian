// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { exploreSchema, runExplore, type PreparedQuery } from '@/lib/explore';
import { memoryIO, reader } from './explore-io';

const query: PreparedQuery = { sources: { records: {
  collection: 'records', filters: {}, facets: [],
  measures: { amount: { label: 'Amount', unit: 'units', definition: 'The included records only.', agg: 'sum', field: 'amount', where: [{ field: 'included', op: 'eq', value: true }] } },
  drill: { columns: ['id'], address: () => '/records' }, cannot: '',
} } };
const io = () => memoryIO([{ id: 'a', included: true, amount: 10 }, { id: 'b', included: false, amount: 200 }]);

describe('a prepared numeric measure with its own conditions', () => {
  it('keeps those conditions in the aggregate it asks the adapter', async () => {
    const answer = await runExplore(query, { source: 'records', measures: ['amount'] }, reader('records'), io(), '/records');
    expect(answer.answer).toContain('Amount: 10 units.');
  });

  it('withholds a measure whose condition reads a hidden field, even when its numeric field is visible', async () => {
    const rights = { readable: new Set(['records']), hidden: () => ['included'] };
    expect(exploreSchema(query, rights).safeParse({ source: 'records', measures: ['amount'] }).success).toBe(false);
    const reads = { ...io(), aggregate: vi.fn(io().aggregate) };
    expect((await runExplore(query, { source: 'records', measures: ['amount'] }, rights, reads, '/records')).answer).toBe('You do not have access to that.');
    expect(reads.aggregate).not.toHaveBeenCalled();
  });
});
