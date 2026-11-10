// @vitest-environment node
// The one filter and rank the Command palette and the Combobox share (src/lib/rank.ts): a label match first, by where the
// query starts; a match in a hint, a description or keywords still finds the item and ranks after every label match.
import { describe, expect, it } from 'vitest';
import { rank } from '../src/lib/rank';

const items = [
  { label: 'Reload' },
  { label: 'Payload' },
  { label: 'Load' },
  { label: 'Overview', hint: 'Payloads' },
  { label: 'Overview two', description: 'Loads the workspace list' },
  { label: 'Nadia Karimi', keywords: 'nadia@zz.example' },
];

describe('rank', () => {
  it('puts a label match first, by where the query starts, then in the order given', () => {
    expect(rank(items.slice(0, 3), 'load').map((x) => x.label)).toEqual(['Load', 'Reload', 'Payload']);
  });

  it('finds a hint, a description or keywords, after every label match and in their own order', () => {
    expect(rank(items, 'load').map((x) => x.label)).toEqual(['Load', 'Reload', 'Payload', 'Overview', 'Overview two']);
  });

  it('matches without case, and trims the query', () => {
    expect(rank(items, '  RELOAD  ').map((x) => x.label)).toEqual(['Reload']);
    expect(rank(items, 'Nadia@ZZ').map((x) => x.label)).toEqual(['Nadia Karimi']);
  });

  it('returns every item in order when nothing is typed', () => {
    expect(rank(items, '   ')).toEqual(items);
    expect(rank([], 'load')).toEqual([]);
  });
});
