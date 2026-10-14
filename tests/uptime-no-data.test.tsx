import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UptimeBars, type DayState } from '@/components/charts/uptime-bars';

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const end = new Date('2026-10-05T12:00:00Z');
const days: DayState[] = Array.from({ length: 30 }, (_, i) => (i === 10 || i === 11 ? 'none' : i === 20 ? 'outage' : 'operational'));

/** The days the healthy baseline's rects cover. */
function underBaseline(container: HTMLElement): Set<number> {
  const covered = new Set<number>();
  for (const r of container.querySelectorAll('svg rect:not([data-day]):not([data-focus])')) {
    const x = Number(r.getAttribute('x')), w = Number(r.getAttribute('width'));
    for (let i = x; i < x + w; i++) covered.add(i);
  }
  return covered;
}

describe('an uptime strip with days that have no data', () => {
  it('draws no healthy baseline under a day with no data, since its mark is translucent', () => {
    const { container } = render(<UptimeBars days={days} uptime={0.97} end={end} label="Gateway, last 30 days" />);
    const covered = underBaseline(container);
    expect(covered.has(10)).toBe(false);
    expect(covered.has(11)).toBe(false);
    // Every other day keeps it, an outage's included: its mark is opaque.
    for (let i = 0; i < 30; i++) if (i !== 10 && i !== 11) expect(covered.has(i), String(i)).toBe(true);
  });

  it('keeps one baseline rect across a period with a day of data on every day', () => {
    const { container } = render(<UptimeBars days={Array(30).fill('operational')} uptime={1} end={end} label="Search" />);
    expect(container.querySelectorAll('svg rect:not([data-day]):not([data-focus])')).toHaveLength(1);
  });
});
