import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Which labels show is a rule about the chart's width: the size hook is replaced.
const size = vi.hoisted(() => ({ width: 220, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { ColumnChart } from '@/components/charts/column-chart';

const dates = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'];
const days = ['29 Sept', '30 Sept', '01 Oct', '02 Oct', '03 Oct'].map((label, i) => ({ key: dates[i], label, value: (i + 1) * 8 }));
/** The label under each column, or nothing where the column has none: the element that places it. */
const labels = (c: HTMLElement) => [...c.querySelectorAll(':scope figure > div[aria-hidden]:not([data-plot]) > span')].map((cell) => cell.firstElementChild as HTMLElement | null);
const plot = () => screen.getByRole('group', { name: /^Errors per day/ });

beforeEach(() => { size.width = 220; });

describe('a column chart: the labels under its first and last column', () => {
  it('thins the dates at a narrow width', () => {
    const { container } = render(<ColumnChart label="Errors per day" columns={days} dates={dates} />);
    // Five dates at 220px: every second one is labelled, counted back from the last.
    expect(labels(container).map((l) => l?.textContent ?? null)).toEqual(['29 Sept', null, '01 Oct', null, '03 Oct']);
  });

  it('keeps the last date labelled when pointed at', () => {
    const { container } = render(<ColumnChart label="Errors per day" columns={days} dates={dates} />);
    fireEvent.keyDown(plot(), { key: 'End' });
    expect(labels(container)[4]).toHaveTextContent('03 Oct');
  });

  it('reads the running last column when pointed at', () => {
    const { container } = render(<ColumnChart label="Errors per day" columns={days} dates={dates} running />);
    fireEvent.keyDown(plot(), { key: 'End' });
    expect(container.querySelector(`[data-column="${dates[4]}"] [data-value]`)?.parentElement).toHaveTextContent('40 · so far');
  });
});
