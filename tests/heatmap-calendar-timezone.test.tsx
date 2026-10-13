import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 800, height: 0 }] as const };
});
// A product west of UTC: a date read as an instant at midnight UTC would print as the day before, in the row above.
vi.mock('@/app.config', async (original) => {
  const actual = await original<typeof import('@/app.config')>();
  return { ...actual, app: { ...actual.app, timezone: 'America/Los_Angeles' } };
});

import { Heatmap } from '@/components/charts/heatmap';

const days = Array.from({ length: 10 }, (_, i) => ({ date: new Date(Date.UTC(2026, 8, 24 + i)).toISOString().slice(0, 10), value: 10 + i }));

describe('a heatmap of days in a product west of UTC', () => {
  it('reads a date as the day it names, and puts it in that day\'s row', () => {
    const { container } = render(<Heatmap label="Requests a day" days={days} />);
    const row = (date: string) => container.querySelector(`[data-cell="${date}"]`)!.getAttribute('data-row');
    expect([row('2026-09-28'), row('2026-10-01'), row('2026-10-03')]).toEqual(['0', '3', '5']);
    fireEvent.keyDown(screen.getByRole('group', { name: /^Requests a day/ }), { key: 'ArrowLeft' });
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('Sat 3 Oct 2026');
    fireEvent.keyDown(screen.getByRole('group', { name: /^Requests a day/ }), { key: 'ArrowUp' });
    fireEvent.keyDown(screen.getByRole('group', { name: /^Requests a day/ }), { key: 'ArrowUp' });
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('Thu 1 Oct 2026');
  });
});
