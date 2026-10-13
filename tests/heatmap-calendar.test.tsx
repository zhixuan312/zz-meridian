import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A rule about a chart's width is tested at a stated width, one on each side of the threshold: the size hook is replaced.
const size = vi.hoisted(() => ({ width: 1100, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { Heatmap } from '@/components/charts/heatmap';
import { Meridian, useMeridianIndex } from '@/components/charts/meridian';

/** 360 days, Thursday 9 Oct 2025 to Saturday 3 Oct 2026: 52 weeks of Monday to Sunday, the first and the last partial. */
const DAY = 86_400_000;
const START = Date.UTC(2025, 9, 9);
const days = Array.from({ length: 360 }, (_, i) => {
  const date = new Date(START + i * DAY).toISOString().slice(0, 10);
  return { date, value: date === '2026-01-01' ? 0 : date === '2026-10-01' ? 1318 : 100 + i };
});
const cell = (c: HTMLElement, date: string) => c.querySelector(`[data-cell="${date}"]`);
const at = (c: HTMLElement, date: string) => { const e = cell(c, date)!; return [Number(e.getAttribute('data-col')), Number(e.getAttribute('data-row'))]; };
const columns = (c: HTMLElement) => new Set([...c.querySelectorAll('[data-cell]')].map((e) => e.getAttribute('data-col'))).size;
const months = (c: HTMLElement) => [...c.querySelectorAll('[data-month]')].map((e) => [e.textContent, Number(e.getAttribute('data-col'))] as const);
const pointed = () => document.querySelector('output[data-pointed]');
const live = (c: HTMLElement) => c.querySelector('[aria-live="polite"]')!;
const grid = () => screen.getByRole('group', { name: /^Requests a day/ });
const rows = () => [...screen.getByRole('table').querySelectorAll('tbody tr')];

beforeEach(() => { size.width = 1100; size.height = 0; });

describe('a heatmap of days: the grid', () => {
  it('draws a cell a date, a column a week and a row a weekday, Monday first', () => {
    const { container } = render(<Heatmap label="Requests a day" days={days} />);
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(360);
    expect(columns(container)).toBe(52);
    expect(at(container, '2025-10-09')).toEqual([0, 3]);
    expect(at(container, '2025-10-12')).toEqual([0, 6]);
    expect(at(container, '2025-10-13')).toEqual([1, 0]);
    expect(at(container, '2026-09-28')).toEqual([51, 0]);
    expect(at(container, '2026-10-03')).toEqual([51, 5]);
  });

  it('leaves the first and the last column partial', () => {
    const { container } = render(<Heatmap label="Requests a day" days={days} />);
    const inColumn = (col: number) => [...container.querySelectorAll(`[data-cell][data-col="${col}"]`)].length;
    expect([inColumn(0), inColumn(1), inColumn(50), inColumn(51)]).toEqual([4, 7, 7, 6]);
  });

  it('names a month above the column that holds its first day, and the first column when the next name is three columns on or more', () => {
    const { container } = render(<Heatmap label="Requests a day" days={days} />);
    const named = months(container);
    expect(named).toHaveLength(13);
    expect(named.slice(0, 4).map(([text]) => text)).toEqual(['Oct', 'Nov', 'Dec', 'Jan']);
    expect(named[0][1]).toBe(0);
    expect(named[1][1]).toBe(at(container, '2025-11-01')[0]);
    expect(named[3][1]).toBe(at(container, '2026-01-01')[0]);
    expect(named[12]).toEqual(['Oct', at(container, '2026-10-01')[0]]);
  });

  it('draws a day of zero as the empty track and names it in the legend', () => {
    const { container } = render(<Heatmap label="Requests a day" days={days} />);
    expect(cell(container, '2026-01-01')).toHaveAttribute('data-step', '0');
    expect(cell(container, '2026-10-01')).toHaveAttribute('data-step', '5');
    expect(container.querySelector('figcaption')).toHaveTextContent('No requests');
  });

  it('lists every date in the table, whatever is drawn', () => {
    size.width = 320;
    render(<Heatmap label="Requests a day" days={days} />);
    expect(rows()).toHaveLength(360);
    expect(rows()[357]).toHaveTextContent('1,318');
  });
});

describe('a heatmap of days: a cell is never under 12px', () => {
  it('shows every week while they fit beside the 40px of weekdays and its 8px gap, 2px apart', () => {
    size.width = 774;
    const { container } = render(<Heatmap label="Requests a day" days={days} />);
    expect(columns(container)).toBe(52);
    expect(container.querySelector('[data-weeks]')).toBeNull();
  });

  it('shows the latest weeks that fit one pixel narrower, and says how many of how many', () => {
    size.width = 773;
    const { container } = render(<Heatmap label="Requests a day" days={days} />);
    expect(columns(container)).toBe(51);
    expect(cell(container, '2025-10-12')).toBeNull();
    expect(at(container, '2025-10-13')).toEqual([0, 0]);
    expect(container.querySelector('[data-weeks]')).toHaveTextContent(/51 of 52 weeks/);
  });

  it('shows nineteen weeks at the width a phone gives it', () => {
    size.width = 320;
    const { container } = render(<Heatmap label="Requests a day" days={days} />);
    expect(columns(container)).toBe(19);
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(18 * 7 + 6);
    expect(cell(container, '2026-05-24')).toBeNull();
    expect(at(container, '2026-05-25')).toEqual([0, 0]);
    expect(at(container, '2026-10-03')).toEqual([18, 5]);
    expect(container.querySelector('[data-weeks]')).toHaveTextContent(/19 of 52 weeks/);
    // 1 Jun 2026 is a Monday, one column on: the first column gives its name up to it.
    expect(months(container).map(([text]) => text).slice(0, 2)).toEqual(['Jun', 'Jul']);
    expect(months(container)[0][1]).toBe(1);
    expect(months(container)).toHaveLength(5);
  });
});

describe('a heatmap of days: reading a day', () => {
  it('is one Tab stop whose first key points at the latest day, read as its date and its value', () => {
    const { container } = render(<Heatmap label="Requests a day" days={days} />);
    expect([...container.querySelectorAll('[tabindex="0"]')]).toEqual([grid()]);
    expect(live(container).textContent).toBe('');
    fireEvent.keyDown(grid(), { key: 'ArrowLeft' });
    expect(live(container)).toHaveTextContent('Sat 3 Oct 2026');
    expect(live(container)).toHaveTextContent(`${(100 + 359).toLocaleString('en-US')} requests`);
  });

  it('moves a day with Up and Down and a week with Left and Right, and stays where there is no day to go to', () => {
    const { container } = render(<Heatmap label="Requests a day" days={days} />);
    fireEvent.keyDown(grid(), { key: 'ArrowLeft' });
    fireEvent.keyDown(grid(), { key: 'ArrowUp' });
    fireEvent.keyDown(grid(), { key: 'ArrowUp' });
    expect(live(container)).toHaveTextContent('Thu 1 Oct 2026');
    expect(live(container)).toHaveTextContent('1,318 requests');
    fireEvent.keyDown(grid(), { key: 'ArrowDown' });
    fireEvent.keyDown(grid(), { key: 'ArrowDown' });
    fireEvent.keyDown(grid(), { key: 'ArrowDown' });
    expect(live(container)).toHaveTextContent('Sat 3 Oct 2026');
    fireEvent.keyDown(grid(), { key: 'ArrowRight' });
    expect(live(container)).toHaveTextContent('Sat 3 Oct 2026');
    fireEvent.keyDown(grid(), { key: 'ArrowLeft' });
    expect(live(container)).toHaveTextContent(/Sat 26 Sep\w* 2026/);
    fireEvent.keyDown(grid(), { key: 'ArrowDown' });
    expect(live(container)).toHaveTextContent(/Sun 27 Sep\w* 2026/);
    fireEvent.keyDown(grid(), { key: 'ArrowRight' });
    expect(live(container)).toHaveTextContent(/Sun 27 Sep\w* 2026/);
  });

  it('goes to the first and the last week that hold the weekday with Home and End, and lets go with Escape and on blur', () => {
    const { container } = render(<Heatmap label="Requests a day" days={days} />);
    fireEvent.keyDown(grid(), { key: 'ArrowLeft' });
    fireEvent.keyDown(grid(), { key: 'Home' });
    expect(live(container)).toHaveTextContent('Sat 11 Oct 2025');
    fireEvent.keyDown(grid(), { key: 'ArrowUp' });
    fireEvent.keyDown(grid(), { key: 'ArrowUp' });
    fireEvent.keyDown(grid(), { key: 'ArrowUp' });
    expect(live(container)).toHaveTextContent('Thu 9 Oct 2025');
    fireEvent.keyDown(grid(), { key: 'End' });
    expect(live(container)).toHaveTextContent('Thu 1 Oct 2026');
    fireEvent.keyDown(grid(), { key: 'Escape' });
    expect(live(container).textContent).toBe('');
    fireEvent.keyDown(grid(), { key: 'ArrowLeft' });
    expect(live(container)).toHaveTextContent('Sat 3 Oct 2026');
    fireEvent.blur(grid());
    expect(live(container).textContent).toBe('');
  });

  it('marks a day still in progress and says so far, in its readout and in its row of the table', () => {
    const { container } = render(<Heatmap label="Requests a day" days={days} running />);
    expect([...container.querySelectorAll('[data-cell][data-running]')].map((e) => e.getAttribute('data-cell'))).toEqual(['2026-10-03']);
    fireEvent.keyDown(grid(), { key: 'ArrowLeft' });
    expect(live(container)).toHaveTextContent(/so far/i);
    fireEvent.keyDown(grid(), { key: 'ArrowUp' });
    expect(live(container)).not.toHaveTextContent(/so far/i);
    expect(rows()[359]).toHaveTextContent(/so far/i);
    expect(rows()[358]).not.toHaveTextContent(/so far/i);
  });

  it('marks none when every day is complete', () => {
    const { container } = render(<Heatmap label="Requests a day" days={days} />);
    expect(container.querySelectorAll('[data-running]')).toHaveLength(0);
    expect(rows()[359]).not.toHaveTextContent(/so far/i);
  });
});

describe('a heatmap of days: the page\'s Meridian', () => {
  const last30 = days.slice(-30).map((d) => d.date);
  function Pointed() {
    const { index } = useMeridianIndex();
    return <output data-pointed>{index === null ? 'none' : String(index)}</output>;
  }

  it('points it at the day read when asked, clears it for a day it does not hold, and lets it go', () => {
    render(
      <Meridian dates={last30}>
        <Heatmap label="Requests a day" days={days} meridian />
        <Pointed />
      </Meridian>,
    );
    expect(pointed()).toHaveTextContent('none');
    fireEvent.keyDown(grid(), { key: 'ArrowLeft' });
    expect(pointed()).toHaveTextContent('29');
    fireEvent.keyDown(grid(), { key: 'ArrowLeft' });
    expect(pointed()).toHaveTextContent('22');
    fireEvent.keyDown(grid(), { key: 'Home' });
    expect(pointed()).toHaveTextContent('none');
    fireEvent.keyDown(grid(), { key: 'End' });
    expect(pointed()).toHaveTextContent('29');
    fireEvent.keyDown(grid(), { key: 'Escape' });
    expect(pointed()).toHaveTextContent('none');
  });

  it('leaves it alone when not asked', () => {
    render(
      <Meridian dates={last30}>
        <Heatmap label="Requests a day" days={days} />
        <Pointed />
      </Meridian>,
    );
    fireEvent.keyDown(grid(), { key: 'ArrowLeft' });
    expect(pointed()).toHaveTextContent('none');
  });
});
