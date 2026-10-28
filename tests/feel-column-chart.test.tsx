import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// A chart draws from a measured width; the size hook is replaced with a stated one.
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 720, height: 0 }] as const };
});

import { ColumnChart } from '@/components/charts/column-chart';

// I-14 finding 8: the table's caption names the highlight the way the mark draws it. Stacked, the column wears the ink
// ring, as grouped does, so it is "Ringed"; plain, it takes the accent, so it is "Accented".

const caption = async () => (await waitFor(() => screen.getByRole('table'))).querySelector('caption')!.textContent;

describe('a highlighted column\'s caption', () => {
  it('says Ringed for a stacked column', async () => {
    render(<ColumnChart label="Requests by region" parts={[{ key: 'a', label: 'East' }, { key: 'b', label: 'West' }]} columns={[{ key: 'd1', label: 'Mon', values: [3, 4] }, { key: 'd2', label: 'Tue', values: [6, 2] }]} highlight="d2" highlightLabel="The busiest day" />);
    expect(await caption()).toBe('Requests by region. Ringed: The busiest day');
  });

  it('says Accented for a plain column', async () => {
    render(<ColumnChart label="Errors per day" columns={[{ key: 'd1', label: 'Mon', value: 10 }, { key: 'd2', label: 'Tue', value: 30 }]} highlight="d2" highlightLabel="The day of the incident" />);
    expect(await caption()).toBe('Errors per day. Accented: The day of the incident');
  });
});
