import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FilterBar } from '@/components/patterns/filter-bar';

const facet = { key: 'status', label: 'Status', value: 'all', options: [{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }], onChange: () => {} };
const view = <button type="button">Table</button>;
const hiddenNarrow = (el: HTMLElement) => !!el.closest('[class*="@max-[52rem]:hidden"]');

describe("a filter bar's view control on a narrow bar", () => {
  it('stays in the row when the bar has no filters, since there is no Filters sheet to move it into', () => {
    render(<FilterBar search={{ value: '', onChange: () => {} }} view={view} />);
    expect(hiddenNarrow(screen.getByRole('button', { name: 'Table' }))).toBe(false);
  });

  it('moves into the Filters sheet when there are filters', () => {
    render(<FilterBar filters={[facet]} view={view} />);
    expect(hiddenNarrow(screen.getByRole('button', { name: 'Table' }))).toBe(true);
    expect(screen.getByRole('button', { name: /Filters/ })).toBeTruthy();
  });
});
