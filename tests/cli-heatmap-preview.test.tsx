// Named cli-* so the payload leaves it out: it reads the Heatmap's own preview, which a product may not keep.
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The specimens are drawn at a stated width: the size hook is replaced. At a 1440px viewport the Atlas's usual column
// leaves a figure about 688px, and a `wide` specimen about 872px.
const size = vi.hoisted(() => ({ width: 688, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import HeatmapPreview from '@/components/charts/heatmap/preview';

const figure = (c: HTMLElement, label: string) => c.querySelector<HTMLElement>(`figure[aria-label="${label}"]`)!;
const columns = (f: HTMLElement) => new Set([...f.querySelectorAll('[data-cell]')].map((e) => e.getAttribute('data-col'))).size;
const steps = (f: HTMLElement) => [...f.querySelectorAll('[data-cell]')].map((e) => e.getAttribute('data-step'));
const names = (f: HTMLElement) => within(f).queryAllByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/).map((e) => e.textContent);
const readout = (f: HTMLElement) => f.querySelector<HTMLElement>('[data-readout]')!;
const shares = (f: HTMLElement) => [readout(f).previousElementSibling, readout(f).nextElementSibling].map((e) => Number((e as HTMLElement).style.flexGrow));
const classes = (e: Element) => e.className.split(/\s+/);

beforeEach(() => { size.width = 688; size.height = 0; });

describe('the Heatmap\'s specimens: the calendar is drawn whole, and large', () => {
  it('draws all 52 weeks of the year at the width a wide specimen has on a desk', () => {
    size.width = 872;
    const { container } = render(<HeatmapPreview />);
    const year = figure(container, 'Requests a day over the last year');
    expect(columns(year)).toBe(52);
    expect(year.querySelector('[data-weeks]')).toBeNull();
  });

  it('draws the latest weeks of the year that fit on a phone, and says how many of how many', () => {
    size.width = 310;
    const { container } = render(<HeatmapPreview />);
    const year = figure(container, 'Requests a day over the last year');
    expect(columns(year)).toBe(18);
    expect(year.querySelector('[data-weeks]')).toHaveTextContent('The latest 18 of 52 weeks');
  });

  it('draws half a year with every week shown and all seven weekdays named, in the usual column', () => {
    const { container } = render(<HeatmapPreview />);
    const half = figure(container, 'Requests a day over the last 26 weeks');
    expect(columns(half)).toBe(26);
    expect(half.querySelector('[data-weeks]')).toBeNull();
    expect(names(half)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });
});

describe('the Heatmap\'s specimens: what is said to be pointed at is drawn pointed at', () => {
  const ringed = (f: HTMLElement) => [...f.querySelectorAll('[data-cell]')].filter((e) => classes(e).includes('ring-2'));

  // A specimen that names a cell its figure does not draw at some width draws nothing pointed at, and says nothing.
  it.each([688, 310])('draws one ring and a readout in every figure asked for a cell or a day, at %ipx', (width) => {
    size.width = width;
    const { container } = render(<HeatmapPreview />);
    const asked = [...container.querySelectorAll<HTMLElement>('figure[data-preview-cell], figure[data-preview-date]')];
    expect(asked).toHaveLength(5);
    for (const f of asked) {
      expect(ringed(f), f.getAttribute('aria-label')!).toHaveLength(1);
      expect(f.querySelector('[data-readout]'), f.getAttribute('aria-label')!).not.toBeNull();
    }
  });

  it('draws the last column pointed at on a phone, where the hours group in threes', () => {
    size.width = 310;
    const { container } = render(<HeatmapPreview />);
    const last = figure(container, 'Requests by weekday and hour, pointed at Thursday 23:00');
    expect(ringed(last).map((e) => e.getAttribute('data-cell'))).toEqual(['3-7']);
    expect(readout(last)).toHaveTextContent(/requests · Thu 21:00–24:00 UTC$/);
    expect(shares(last)).toEqual([7, 0]);
  });
});

describe('the Heatmap\'s specimens: every state is drawn', () => {
  it('labels each specimen', () => {
    render(<HeatmapPreview />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'By hour', 'Grouped', 'A year of days', 'The latest weeks that fit', 'Half a year', 'A day of zero', 'A day in progress',
      'A day pointed at', 'An hour pointed at', 'Focus', 'Empty', 'On the page\'s Meridian', 'One outlier hour',
    ]);
  });

  it('draws days of zero as the empty track among filled cells', () => {
    const { container } = render(<HeatmapPreview />);
    const quiet = figure(container, 'Requests a day, with two days of none');
    expect([...quiet.querySelectorAll('[data-step="0"]')].map((e) => e.getAttribute('data-cell'))).toEqual(['2026-08-11', '2026-08-12']);
    expect(steps(quiet)).toHaveLength(181);
  });

  it('draws the day in progress read, so far, with its outline', () => {
    const { container } = render(<HeatmapPreview />);
    const read = figure(container, 'Requests a day, with today so far and read');
    expect(readout(read)).toHaveTextContent(/^Sat 3 Oct 2026 · .+ requests so far$/);
    expect(shares(read)).toEqual([25, 0]);
    expect(read.querySelectorAll('[data-cell="2026-10-03"][data-running] svg line')).toHaveLength(4);
  });

  it('draws an hour pointed at in the last column and in the first, the readout flush with the grid\'s edge', () => {
    const { container } = render(<HeatmapPreview />);
    const last = figure(container, 'Requests by weekday and hour, pointed at Thursday 23:00');
    expect(readout(last)).toHaveTextContent(/requests · Thu 23:00 UTC$/);
    expect(shares(last)).toEqual([23, 0]);
    size.width = 310;
    const narrow = render(<HeatmapPreview />);
    const first = figure(narrow.container, 'Requests by weekday and three-hour block, pointed at Wednesday 00:00');
    expect(readout(first)).toHaveTextContent(/requests · Wed 00:00–03:00 UTC$/);
    expect(shares(first)).toEqual([0, 7]);
  });

  it('draws the focus ring on a week of hours and on a calendar', () => {
    const { container } = render(<HeatmapPreview />);
    for (const label of ['Requests by weekday and three-hour block, focused', 'Requests a day over the last 26 weeks, focused']) {
      expect(classes(within(figure(container, label)).getByRole('group')), label).toEqual(expect.arrayContaining(['outline-2', 'outline-offset-4', 'outline-accent']));
    }
    expect(classes(within(figure(container, 'Requests by weekday and hour')).getByRole('group'))).not.toContain('outline-2');
  });

  it('draws nothing to rank as the empty track, the legend reading More, on max and on quantile', () => {
    const { container } = render(<HeatmapPreview />);
    for (const label of ['Requests by weekday and three-hour block, with none', 'Requests a day over the last 26 weeks, with none']) {
      const empty = figure(container, label);
      expect(new Set(steps(empty)), label).toEqual(new Set(['0']));
      expect(empty.querySelector('figcaption'), label).toHaveTextContent('More');
      expect(empty.querySelector('figcaption'), label).not.toHaveTextContent(/or more/);
    }
  });

  it('draws a day pointed at on the calendar and marked on the chart that shares the page\'s Meridian', () => {
    const { container } = render(<HeatmapPreview />);
    const calendar = figure(container, 'Requests a day over the last 26 weeks, on the page\'s Meridian');
    expect([...calendar.querySelectorAll('[data-cell]')].filter((e) => classes(e).includes('ring-2')).map((e) => e.getAttribute('data-cell'))).toEqual(['2026-09-24']);
    expect(readout(calendar)).toHaveTextContent(/^Thu 24 Sept? 2026 · .+ requests$/);
    // The Trend chart draws a dot on its series only at the day the Meridian points at.
    const chart = screen.getByRole('img', { name: /^Requests per day over the last 30 days/ });
    expect(chart.querySelectorAll('circle')).toHaveLength(1);
    expect(screen.getByRole('table', { name: 'Requests per day over the last 30 days' }).querySelectorAll('tbody tr')[20]).toHaveTextContent('2026-09-24');
  });
});
