import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FilterBar } from '@/components/patterns/filter-bar';

/**
 * A bar with more facets than room gave its search whatever the facets left: 129px at a 1440px window on a 2x display,
 * where the placeholder needs 134, so the same page read "Headline, address, ru" on a Retina screen and the whole hint
 * on a laptop (issue #93). The field now has a floor, and the facets truncate their own labels instead.
 */
const facets = ['Headline', 'Address', 'Route', 'Status', 'Owner'].map((label, i) => ({
  key: `facet-${i}`,
  label,
  value: 'all',
  options: [{ value: 'all', label: 'All' }, { value: 'some', label: label }],
  onChange: () => {},
}));

describe('a filter bar beside five facets', () => {
  it('gives its search a floor, and still lets it grow to its cap', () => {
    const { container } = render(<FilterBar filters={facets} search={{ value: '', onChange: () => {}, placeholder: 'Headline, address, route' }} result={<span>214 requests</span>} />);
    const field = [...container.querySelectorAll('*')].find((el) => /\bmin-w-40\b/.test(el.className))!;
    expect(field, 'the search field').toBeDefined();
    expect(field.className).toMatch(/\bflex-1\b/);
    expect(field.className).toMatch(/@min-\[52rem\]:max-w-72/);
    // Ten rem at Meridian's 14px root is 140px: the 134px hint and nothing cut off it.
    expect(field.className).not.toMatch(/\bmin-w-0\b/);
    expect(container.querySelectorAll('[aria-label]')).toHaveLength(5);
  });
});

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
