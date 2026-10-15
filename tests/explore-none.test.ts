// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { aggregateRows, queryRows, type AggregateQuery, type Query } from '@/lib/collection';
import { exploreSchema, runExplore, type ExploreIO, type ExploreRights, type PreparedQuery } from '@/lib/explore';

/**
 * A group of the rows with no value reads as the source's own word for it ("no model"), never "null", and a call can
 * narrow to it by naming null, which the input admits only for a field the source has a word for.
 */
type Row = Record<string, unknown>;
const ROWS: Row[] = [
  ...Array.from({ length: 5 }, (_, i) => ({ id: `l${i}`, model: 'large', status: 200 })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: `n${i}`, model: null, status: i ? 200 : 500 })),
];
const QUERY: PreparedQuery = {
  sources: {
    requests: {
      collection: 'requests',
      filters: { model: { ops: ['eq', 'ne', 'in'] }, status: { ops: ['eq', 'in'] } },
      facets: ['model', 'status'],
      measures: { requests: { label: 'Requests', unit: 'requests', definition: 'Requests in the log.', agg: 'count' } },
      drill: { columns: ['id', 'model'], address: (r) => `/requests/${String(r.id)}` },
      cannot: '',
      none: { model: 'no model' },
    },
  },
};
const OWNER: ExploreRights = { readable: new Set(['requests']), hidden: () => [] };
const io: ExploreIO = {
  aggregate: async (_: string, q: AggregateQuery) => aggregateRows(ROWS, q),
  read: async (_: string, q: Query) => queryRows(ROWS, 'id', q),
  today: '2026-10-13',
};
const ask = async (input: unknown) => (await runExplore(QUERY, input, OWNER, io, '/requests')).answer;

describe('the rows with no value', () => {
  it("read as the source's word for them when grouped", async () => {
    const answer = await ask({ source: 'requests', measures: ['requests'], by: 'model' });
    expect(answer).toMatch(/^- no model: 3 requests$/m);
    expect(answer).not.toContain('null');
  });

  it('are narrowed to by naming null, and the answer says which they are', async () => {
    const answer = await ask({ source: 'requests', measures: ['requests'], where: [{ field: 'model', op: 'eq', value: null }] });
    expect(answer).toContain('Requests: 3 requests.');
    expect(answer).toContain('where model eq null (no model)');
    const listed = await ask({ source: 'requests', measures: ['requests'], where: [{ field: 'model', op: 'in', value: [null, 'large'] }] });
    expect(listed).toContain('Requests: 8 requests.');
  });

  it('are offered as null only where the source has a word for them', async () => {
    const schema = exploreSchema(QUERY, OWNER);
    expect(JSON.stringify(z.toJSONSchema(schema))).toContain('model eq|ne|in, null for no model');
    expect(schema.safeParse({ source: 'requests', measures: ['requests'], where: [{ field: 'model', op: 'eq', value: null }] }).success).toBe(true);
    const refused = schema.safeParse({ source: 'requests', measures: ['requests'], where: [{ field: 'status', op: 'eq', value: null }] });
    expect(refused.success).toBe(false);
    expect(refused.error?.issues.map((i) => i.message)).toContain('status always has a value, so it is never null.');
  });
});
