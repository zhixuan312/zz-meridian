import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Segmented } from '@/components/ui/segmented';

const PERIODS = [{ value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: '90d', label: '90D' }, { value: 'all', label: 'All' }];

/**
 * A segmented control is as wide as its options, wherever it stands. In a column of a card it was stretched across the
 * card, an empty track beside its options. On a phone each option's 44px hit square reached past a 36px option and past
 * the track's 2px padding, so the track scrolled by 2px and its fade hid the last option's edge with room to spare.
 */
describe('a segmented control', () => {
  it('keeps to its options in a column that would stretch it', () => {
    const { container } = render(<div className="flex flex-col"><Segmented label="Reporting period" value="30d" onChange={() => {}} options={PERIODS} /></div>);
    expect(container.querySelector('[aria-label="Reporting period"]')!.className).toMatch(/(^|\s)w-fit(\s|$)/);
  });

  it('makes each option its own 44px target on touch, so no hit square reaches past the track', () => {
    render(<Segmented label="Reporting period" value="30d" onChange={() => {}} options={PERIODS} />);
    for (const option of screen.getAllByRole('radio')) expect(option.className).toMatch(/(^|\s)pointer-coarse:min-w-\[44px\](\s|$)/);
  });
});
