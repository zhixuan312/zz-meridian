import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Which dates carry an x-axis label is decided from the plot's width, so the width is stated here.
const size = vi.hoisted(() => ({ width: 640, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { TrendChart } from '@/components/charts/trend-chart';

/** The labels the plot draws under it, in plot order. */
const axisLabels = (container: HTMLElement) =>
  [...container.querySelectorAll('svg text[data-x-label]')].map((t) => t.textContent).filter((t): t is string => Boolean(t));

/** An hour of minutes, 09:00 to 10:00: what a monitoring chart reads against. */
const minutes = Array.from({ length: 61 }, (_, i) => {
  const at = new Date(Date.UTC(2026, 9, 1, 9, i));
  return `${String(at.getUTCHours()).padStart(2, '0')}:${String(at.getUTCMinutes()).padStart(2, '0')}`;
});
const series = [{ key: 'p95', label: 'p95', values: minutes.map((_, i) => 200 + (i % 7) * 10) }];

/**
 * TrendChart counted its x labels back from the last date, so an hour of minutes read 09:04 · 09:11 · 09:19, and a year of
 * days could skip the first of the month. `tickAt` names the dates that carry a label; the width rule still thins them so
 * they never collide, and the readout and the table keep every date (#135).
 */
describe('TrendChart with tickAt', () => {
  beforeEach(() => { size.width = 640; });

  it('labels only the dates the caller names, as quarter hours on an hour of minutes', () => {
    const { container } = render(
      <TrendChart label="p95 latency" dates={minutes} series={series} tickAt={(_d, i) => i % 15 === 0} />,
    );
    expect(axisLabels(container)).toEqual(['09:00', '09:15', '09:30', '09:45', '10:00']);
  });

  it('keeps counting back from the last date when no tickAt is given, as before', () => {
    const { container } = render(<TrendChart label="p95 latency" dates={minutes} series={series} />);
    const labels = axisLabels(container);
    expect(labels.at(-1)).toBe('10:00');
    // Every label lands on a date counted back from the last one, so the spacing is even in a way the minutes are not.
    const at = labels.map((l) => minutes.indexOf(l));
    const gaps = at.slice(1).map((v, k) => v - at[k]);
    expect(new Set(gaps).size).toBe(1);
  });

  it('thins the named dates by the same width rule, so a narrow plot never collides', () => {
    size.width = 180;
    const { container } = render(
      <TrendChart label="p95 latency" dates={minutes} series={series} tickAt={(_d, i) => i % 15 === 0} />,
    );
    const labels = axisLabels(container);
    expect(labels.length).toBeLessThan(5);
    expect(labels.length).toBeGreaterThanOrEqual(2);
    // The first and the last chosen dates anchor the range whatever the width.
    expect(labels[0]).toBe('09:00');
    expect(labels.at(-1)).toBe('10:00');
  });

  it('labels month starts on a year of days, which counting back from the last date cannot promise', () => {
    const days = Array.from({ length: 120 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));
    const { container } = render(
      <TrendChart label="Requests a day" dates={days} series={[{ key: 'r', label: 'Requests', values: days.map((_, i) => i) }]} tickAt={(d) => d.endsWith('-01')} />,
    );
    // Four starts in a hundred and twenty days, and every one of them reads: the rule counted back from the last date,
    // which lands on nothing a reader cares about on a year of days.
    expect(axisLabels(container)).toEqual(['01 Jan', '01 Feb', '01 Mar', '01 Apr']);
  });

  it('leaves the readout and the table alone: every date still reads', () => {
    const { container } = render(
      <TrendChart label="p95 latency" dates={minutes} series={series} tickAt={(_, i) => i === 30} />,
    );
    // One label on the plot, and all 61 dates in the table.
    expect(axisLabels(container)).toEqual(['09:30']);
    expect(container.querySelectorAll('table tbody tr')).toHaveLength(minutes.length);
  });
});
