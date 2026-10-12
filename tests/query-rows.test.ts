import { describe, expect, test } from 'vitest';
import { queryRows } from '@/lib/collection';

// A collection over a real store that answers with a list filters, sorts and pages it with the same meaning the
// sample's collections have, by calling the function they call (issue #24).
const rows = [
  { id: 'p_1', name: 'Alice Moreno', seats: 3, lastActive: '2026-07-20' as string | null },
  { id: 'p_2', name: 'Ravi Patel', seats: 12, lastActive: null },
  { id: 'p_3', name: 'Amara Okafor', seats: 8, lastActive: '2026-07-22' },
];
const names = (r: { rows: { name: string }[] }) => r.rows.map((x) => x.name);

describe('queryRows', () => {
  test('filters with the collection\'s own meaning: contains ignores case, a missing value matches only ne', () => {
    expect(names(queryRows(rows, 'id', { where: [{ field: 'name', op: 'contains', value: 'MOR' }] }))).toEqual(['Alice Moreno']);
    expect(names(queryRows(rows, 'id', { where: [{ field: 'lastActive', op: 'ne', value: '2026-07-22' }] }))).toEqual(['Alice Moreno', 'Ravi Patel']);
    expect(names(queryRows(rows, 'id', { where: [{ field: 'lastActive', op: 'lt', value: '2030-01-01' }] }))).toEqual(['Alice Moreno', 'Amara Okafor']);
  });

  test('sorts with rows that have no value last, pages, and counts before the page is cut', () => {
    const r = queryRows(rows, 'id', { sort: { field: 'lastActive', dir: 'desc' }, limit: 2 });
    expect(names(r)).toEqual(['Amara Okafor', 'Alice Moreno']);
    expect(r.total).toBe(3);
    expect(names(queryRows(rows, 'id', { sort: { field: 'seats', dir: 'asc' }, offset: 1 }))).toEqual(['Amara Okafor', 'Ravi Patel']);
  });

  test('returns the rows it was given, not copies it made: the caller owns what it hands back', () => {
    expect(queryRows(rows, 'id', {}).rows[0]).toBe(rows[0]);
  });
});
