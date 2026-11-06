import { describe, expect, it } from 'vitest';
import { toCsv } from '@/lib/csv';

/**
 * A CSV's columns come from every row it writes. Taking them from the first row alone loses a value a later row is the
 * only one to carry, and nothing in the file says so.
 */
describe('toCsv', () => {
  it('writes a column a later row is the only one to hold', () => {
    const csv = toCsv([{ id: 'a', name: 'Northwind' }, { id: 'b', name: 'Halcyon', note: 'past due' }]);
    expect(csv.split('\r\n')[0]).toBe('id,name,note');
    expect(csv).toContain('b,Halcyon,past due');
  });

  it('writes an empty cell for a row that has no value in a column', () => {
    const csv = toCsv([{ id: 'a' }, { id: 'b', note: 'x' }]);
    expect(csv.split('\r\n')[1]).toBe('a,');
  });
});
