import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FilterBar } from '@/components/patterns/filter-bar';

const facets = ['Headline', 'Address', 'Route', 'Status', 'Owner'].map((label, i) => ({
  key: `facet-${i}`,
  label,
  value: 'all',
  options: [{ value: 'all', label: 'All' }, { value: 'some', label: label }],
  onChange: () => {},
}));

describe("the phone's Filters count", () => {
  it('counts the filters set, not the search text, which is not in the sheet; Clear still shows for the search', () => {
    const { getByRole } = render(<FilterBar filters={facets} search={{ value: 'timeout', onChange: () => {} }} onClear={() => {}} />);
    expect(getByRole('button', { name: 'Filters' })).toBeTruthy();
    expect(getByRole('button', { name: 'Clear' })).toBeTruthy();
  });
  it('counts a filter that is set', () => {
    const set = facets.map((f, i) => (i === 1 ? { ...f, value: 'some' } : f));
    const { getByRole } = render(<FilterBar filters={set} search={{ value: 'timeout', onChange: () => {} }} />);
    expect(getByRole('button', { name: 'Filters 1' })).toBeTruthy();
  });
});
