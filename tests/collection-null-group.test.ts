import { describe, expect, it } from 'vitest';
import { aggregateRows, queryRows } from '@/lib/collection';

/**
 * A row with no value in a field is a group of its own, keyed null and never "null" (a string a field may really hold),
 * and a condition can name it: `eq null` and `in [..., null]` keep the rows without a value, `ne null` the rows with one.
 */
type Row = Record<string, unknown>;
const ROWS: Row[] = [
  { id: 'a', model: 'large', v: 1 },
  { id: 'b', model: 'large', v: 2 },
  { id: 'c', model: null, v: 4 },
  { id: 'd', v: 8 },
  { id: 'e', model: 'null', v: 16 },
];
const ids = (where: Parameters<typeof queryRows>[2]['where']) => queryRows(ROWS, 'id', { where }).rows.map((r) => r.id);

describe('a field with no value', () => {
  it('groups its rows under the key null, apart from a value that reads "null"', () => {
    const r = aggregateRows(ROWS, { group: { field: 'model' }, measures: [{ name: 's', agg: 'sum', field: 'v' }] });
    expect(r.groups.map((g) => [g.key, g.rows, g.values.s])).toEqual([['null', 1, 16], [null, 2, 12], ['large', 2, 3]]);
  });

  it('is named by eq null, in with null, and left out by ne null', () => {
    expect(ids([{ field: 'model', op: 'eq', value: null }])).toEqual(['c', 'd']);
    expect(ids([{ field: 'model', op: 'in', value: [null, 'large'] }])).toEqual(['a', 'b', 'c', 'd']);
    expect(ids([{ field: 'model', op: 'ne', value: null }])).toEqual(['a', 'b', 'e']);
    // A row without the value still differs from any value it is not.
    expect(ids([{ field: 'model', op: 'ne', value: 'large' }])).toEqual(['c', 'd', 'e']);
    expect(ids([{ field: 'model', op: 'eq', value: 'large' }])).toEqual(['a', 'b']);
  });

  it('is counted by a measure that names it', () => {
    const r = aggregateRows(ROWS, { measures: [{ name: 'none', agg: 'count', where: [{ field: 'model', op: 'eq', value: null }] }] });
    expect(r.total.values.none).toBe(2);
  });
});
