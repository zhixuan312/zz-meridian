import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// A chart draws once it knows its width; the size hook is replaced with a stated one.
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 640, height: 248 }] as const };
});

import { TrendChart, type TrendSeries } from '@/components/charts/trend-chart';

const dates = ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'];
const requests: TrendSeries = { key: 'requests', label: 'Requests', values: [120, 140, 130, 60], kind: 'area' };
const running = (c: HTMLElement) => [...c.querySelectorAll('[data-running]')];
const readout = (c: HTMLElement) => c.querySelector('div[aria-hidden]');
const rows = () => [...screen.getByRole('table').querySelectorAll('tbody tr')];

describe('a trend chart whose last point is still running', () => {
  it('draws the segment into that point as a dashed stroke of its own', () => {
    const { container } = render(<TrendChart label="Requests per day" dates={dates} series={[requests]} running />);
    expect(running(container)).toHaveLength(1);
    expect(running(container)[0].getAttribute('stroke-dasharray')).toBeTruthy();
  });

  it('draws nothing of the kind when every point is complete', () => {
    const { container } = render(<TrendChart label="Requests per day" dates={dates} series={[requests]} />);
    expect(running(container)).toHaveLength(0);
  });

  it('leaves a reference line as it was, and gives every line of equal standing its own', () => {
    const before: TrendSeries = { key: 'before', label: 'The 30 days before', values: [100, 110, 105, 108], kind: 'dashed' };
    const a = render(<TrendChart label="Requests per day" dates={dates} series={[requests, before]} running />);
    expect(running(a.container)).toHaveLength(1);
    a.unmount();
    const lines: TrendSeries[] = [{ key: 'p50', label: 'p50', values: [80, 82, 81, 79], kind: 'line' }, { key: 'p95', label: 'p95', values: [290, 300, 310, 305], kind: 'line' }];
    const b = render(<TrendChart label="Latency per day" dates={dates} series={lines} running />);
    expect(running(b.container)).toHaveLength(2);
  });

  it('dashes the total of a stack once', () => {
    const parts: TrendSeries[] = [{ key: 'us', label: 'US', values: [60, 70, 65, 30] }, { key: 'eu', label: 'EU', values: [40, 45, 44, 20] }, { key: 'ap', label: 'AP', values: [20, 25, 21, 10] }];
    const { container } = render(<TrendChart label="Requests by region" stacked dates={dates} series={parts} running />);
    expect(running(container)).toHaveLength(1);
    expect(rows()[3]).toHaveTextContent(/so far/i);
  });

  it('says so far in the readout of that point and of no other', () => {
    const { container } = render(<TrendChart label="Requests per day" dates={dates} series={[requests]} running />);
    const chart = screen.getByRole('img', { name: /Requests per day/ });
    fireEvent.keyDown(chart, { key: 'End' });
    expect(readout(container)).toHaveTextContent(/so far/i);
    expect(readout(container)).toHaveTextContent('60');
    fireEvent.keyDown(chart, { key: 'Home' });
    expect(readout(container)).toHaveTextContent('120');
    expect(readout(container)).not.toHaveTextContent(/so far/i);
  });

  it('says so far in the last row of the table and in no other', () => {
    const a = render(<TrendChart label="Requests per day" dates={dates} series={[requests]} running />);
    expect(rows()[3]).toHaveTextContent(/so far/i);
    expect(rows()[3]).toHaveTextContent('60');
    for (const row of rows().slice(0, 3)) expect(row).not.toHaveTextContent(/so far/i);
    a.unmount();
    render(<TrendChart label="Requests per day" dates={dates} series={[requests]} />);
    for (const row of rows()) expect(row).not.toHaveTextContent(/so far/i);
  });

  it('has no segment to dash for a single point or a missing last value, and still says so far', () => {
    const one = render(<TrendChart label="Requests per day" dates={['2026-10-03']} series={[{ ...requests, values: [60] }]} running />);
    expect(running(one.container)).toHaveLength(0);
    expect(rows()[0]).toHaveTextContent(/so far/i);
    one.unmount();
    const gap = render(<TrendChart label="Requests per day" dates={dates} series={[{ ...requests, values: [120, 140, 130, null] }]} running />);
    expect(running(gap.container)).toHaveLength(0);
    expect(rows()[3]).toHaveTextContent(/so far/i);
  });
});
