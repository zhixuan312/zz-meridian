import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const size = vi.hoisted(() => ({ width: 900, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { IntervalTimeline, type TimelineRow } from '@/components/charts/interval-timeline';

const rows: TimelineRow[] = [
  { key: 'verify', label: 'Verification', runs: [
    { from: '2026-10-01T09:00:00Z', to: '2026-10-01T09:40:00Z', tone: 'neutral', label: 'Build' },
    { from: '2026-10-01T09:20:00Z', to: '2026-10-01T09:22:00Z', tone: 'critical', label: 'Integration' },
  ] },
  { key: 'release', label: 'Release', runs: [
    { from: '2026-10-01T09:10:00Z', to: '2026-10-01T09:15:00Z', tone: 'warning', label: 'Canary' },
  ] },
];
const draw = (props: Partial<Parameters<typeof IntervalTimeline>[0]> = {}) =>
  render(<IntervalTimeline label="What ran this hour" rows={rows} start="2026-10-01T09:00:00Z" end="2026-10-01T10:00:00Z" {...props} />);

/**
 * What ran and when, in one window. A CSS timeline gives each run a minimum width, so a 40-second run is as long as a
 * 40-minute one, and it has no readout (#127).
 */
describe('IntervalTimeline', () => {
  beforeEach(() => { size.width = 900; });

  it('draws one bar per run and one axis for the whole window', () => {
    const { container } = draw();
    expect(container.querySelectorAll('[data-row]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-run]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-tick]').length).toBeGreaterThan(1);
  });

  it('keeps a run’s length proportional, and a very short run as a marker rather than a widened bar', () => {
    const { container } = render(
      <IntervalTimeline
        label="What ran this hour"
        start="2026-10-01T09:00:00Z"
        end="2026-10-01T10:00:00Z"
        rows={[{ key: 'a', label: 'Jobs', runs: [
          { from: '2026-10-01T09:00:00Z', to: '2026-10-01T10:00:00Z', tone: 'neutral', label: 'Long' },
          { from: '2026-10-01T09:30:00Z', to: '2026-10-01T09:30:02Z', tone: 'neutral', label: 'Brief' },
        ] }]}
      />,
    );
    const bars = [...container.querySelectorAll('[data-run]')];
    // The full-hour run spans the plot; the two-second one is a marker, not a bar of the same width.
    expect(Number.parseFloat((bars[0] as HTMLElement).style.width)).toBeCloseTo(100, 1);
    expect(bars[1].getAttribute('data-short')).not.toBeNull();
    expect((bars[1] as HTMLElement).style.width).toBe('');
  });

  it('draws a now line only for a moment the window holds', () => {
    const inside = draw({ now: '2026-10-01T09:30:00Z' });
    expect(inside.container.querySelector('[data-now]')).not.toBeNull();
    inside.unmount();
    for (const now of ['2026-10-01T08:00:00Z', '2026-10-01T11:00:00Z']) {
      const outside = draw({ now });
      expect(outside.container.querySelector('[data-now]'), now).toBeNull();
      outside.unmount();
    }
  });

  it('names every run in words: its tone, its times and how long it took', () => {
    draw();
    expect(screen.getByTitle(/^Build, Completed: .*–.*, 40 min$/)).toBeTruthy();
    expect(screen.getByTitle(/^Integration, Failed: .*–.*, 2 min$/)).toBeTruthy();
  });

  it('steps through the runs with the arrow keys and reads the one found', () => {
    const { container } = draw();
    const plot = screen.getAllByRole('group')[0];
    fireEvent.keyDown(plot, { key: 'Home' });
    expect(container.querySelector('[data-readout]')?.textContent).toContain('Build');
    fireEvent.keyDown(plot, { key: 'ArrowRight' });
    expect(container.querySelector('[data-readout]')?.textContent).toContain('Canary');
    fireEvent.keyDown(plot, { key: 'Escape' });
    expect(container.querySelector('[data-readout]')).toBeNull();
  });

  it('draws the now line and names it when the window holds that moment', () => {
    const { container } = draw({ now: '2026-10-01T09:30:00Z' });
    expect(container.querySelectorAll('[data-now]').length).toBeGreaterThan(0);
    expect(container.querySelector('[data-now-key]')?.textContent).toContain('Now');
    const closed = draw();
    expect(closed.container.querySelector('[data-now-key]')).toBeNull();
  });

  it('draws nothing for a window that is not a range', () => {
    const { container } = render(<IntervalTimeline label="What ran" rows={rows} start="2026-10-01T10:00:00Z" end="2026-10-01T09:00:00Z" />);
    expect(container.querySelector('[data-run]')).toBeNull();
  });
});
