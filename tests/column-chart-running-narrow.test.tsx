import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// A phone's card: six periods in about 300px leave each column some 45px, room for a value but not for "No data so far".
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 300, height: 0 }] as const };
});

import { ColumnChart, type Column } from '@/components/charts/column-chart';

const weeks: Column[] = [
  { key: 'w1', label: '31 Aug', value: 12 },
  { key: 'w2', label: '7 Sept', value: 9 },
  { key: 'w3', label: '14 Sept', value: 14 },
  { key: 'w4', label: '21 Sept', value: 11 },
  { key: 'w5', label: '28 Sept', value: 10 },
  { key: 'w6', label: '5 Oct', value: null },
];

describe('a running period with no data in a narrow column (#71)', () => {
  it('reads So far at rest, never the words cut short, and says them whole in the table and when pointed at', () => {
    const { container } = render(<ColumnChart label="Failed calls per 1,000" running columns={weeks} />);
    const last = container.querySelector<HTMLElement>('[data-column="w6"]')!;
    expect(last.querySelector('[data-value]')).toHaveTextContent(/^So far$/);
    const rows = container.querySelectorAll('table tbody tr');
    expect(rows[5].querySelector('td')).toHaveTextContent(/^No data so far$/);
    fireEvent.keyDown(screen.getByRole('group', { name: /^Failed calls per 1,000/ }), { key: 'End' });
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(/^5 Oct: No data so far$/);
    expect(last.querySelector('[data-value]')).toHaveTextContent(/^No data so far$/);
  });
});
