import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Rules about a figure's width are tested at a stated width: the size hook is replaced.
const size = vi.hoisted(() => ({ width: 800, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { Heatmap } from '@/components/charts/heatmap';

/** A week of hours, every hour its own value. */
const week = Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => 100 + d * 24 + h));
/** 52 whole weeks, Monday 6 Oct 2025 to Sunday 4 Oct 2026. */
const DAY = 86_400_000;
const days = Array.from({ length: 364 }, (_, i) => ({ date: new Date(Date.UTC(2025, 9, 6) + i * DAY).toISOString().slice(0, 10), value: 100 + i }));

const hours = () => screen.getByRole('group', { name: /^Requests by weekday and hour/ });
const calendar = () => screen.getByRole('group', { name: /^Requests a day/ });
const readout = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-readout]');
/** The room the readout leaves on each side, as shares of what is left of the row: the columns before its own and the columns after. */
const shares = (c: HTMLElement) => [readout(c)!.previousElementSibling, readout(c)!.nextElementSibling].map((e) => Number((e as HTMLElement).style.flexGrow));
/** The weekday names drawn beside the grid; the hidden table of a week of hours names its rows too. */
const names = () => screen.queryAllByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/).filter((e) => !e.closest('table')).map((e) => e.textContent);
const classes = (e: HTMLElement) => e.className.split(/\s+/);

beforeEach(() => { size.width = 800; size.height = 0; });

describe('a heatmap\'s readout stays inside its grid', () => {
  it('stands in its row of hours between the columns before its own and the columns after: flush at the first column and at the last', () => {
    const { container } = render(<Heatmap label="Requests by weekday and hour" values={week} />);
    expect(readout(container)).toBeNull();
    fireEvent.keyDown(hours(), { key: 'ArrowRight' });
    expect(hours()).toContainElement(readout(container));
    expect(readout(container)).toHaveTextContent('100 requests · Mon 00:00 UTC');
    expect(shares(container)).toEqual([0, 23]);
    fireEvent.keyDown(hours(), { key: 'End' });
    expect(readout(container)).toHaveTextContent('123 requests · Mon 23:00 UTC');
    expect(shares(container)).toEqual([23, 0]);
    fireEvent.keyDown(hours(), { key: 'ArrowDown' });
    fireEvent.keyDown(hours(), { key: 'ArrowLeft' });
    expect(readout(container)).toHaveTextContent('146 requests · Tue 22:00 UTC');
    expect(shares(container)).toEqual([22, 1]);
  });

  it('is placed by no pixel offset, so no column can push it past the figure', () => {
    const { container } = render(<Heatmap label="Requests by weekday and hour" values={week} />);
    fireEvent.keyDown(hours(), { key: 'ArrowRight' });
    fireEvent.keyDown(hours(), { key: 'End' });
    expect(readout(container)).not.toBeNull();
    for (let e: HTMLElement | null = readout(container); e && e !== container; e = e.parentElement) expect(e.style.left).toBe('');
  });

  it('does the same over three-hour blocks on a narrow figure', () => {
    size.width = 400;
    const { container } = render(<Heatmap label="Requests by weekday and hour" values={week} />);
    fireEvent.keyDown(hours(), { key: 'ArrowRight' });
    fireEvent.keyDown(hours(), { key: 'End' });
    expect(readout(container)).toHaveTextContent('Mon 21:00–24:00 UTC');
    expect(shares(container)).toEqual([7, 0]);
  });

  it('lets go of the readout with Escape, on blur and when the pointer leaves', () => {
    const { container } = render(<Heatmap label="Requests by weekday and hour" values={week} />);
    fireEvent.keyDown(hours(), { key: 'ArrowRight' });
    fireEvent.keyDown(hours(), { key: 'Escape' });
    expect(readout(container)).toBeNull();
    fireEvent.keyDown(hours(), { key: 'ArrowRight' });
    fireEvent.blur(hours());
    expect(readout(container)).toBeNull();
    fireEvent.pointerEnter(container.querySelector('[data-cell="2-5"]')!);
    expect(readout(container)).toHaveTextContent('Wed 05:00 UTC');
    fireEvent.pointerLeave(container.querySelector('figure')!);
    expect(readout(container)).toBeNull();
  });

  it('stands over a day of the calendar between the weeks before its own and the weeks after', () => {
    const { container } = render(<Heatmap label="Requests a day" days={days} />);
    fireEvent.keyDown(calendar(), { key: 'ArrowLeft' });
    expect(calendar()).toContainElement(readout(container));
    expect(shares(container)).toEqual([51, 0]);
    fireEvent.keyDown(calendar(), { key: 'Home' });
    expect(shares(container)).toEqual([0, 51]);
  });
});

describe('a heatmap drawn still, for the Atlas', () => {
  it('draws an hour as pointed at, with its ring and its readout', () => {
    const { container } = render(<Heatmap label="Requests by weekday and hour" values={week} data-preview-cell="3-23" />);
    expect(readout(container)).toHaveTextContent('195 requests · Thu 23:00 UTC');
    expect(shares(container)).toEqual([23, 0]);
    expect(classes(container.querySelector<HTMLElement>('[data-cell="3-23"]')!)).toContain('ring-2');
    expect(classes(container.querySelector<HTMLElement>('[data-cell="3-22"]')!)).not.toContain('ring-2');
  });

  it('names an hour, so the cell still resolves where the hours group in threes', () => {
    size.width = 400;
    const { container } = render(<Heatmap label="Requests by weekday and hour" values={week} data-preview-cell="3-23" />);
    expect(readout(container)).toHaveTextContent('582 requests · Thu 21:00–24:00 UTC');
    expect(shares(container)).toEqual([7, 0]);
    expect([...container.querySelectorAll('[data-cell]')].filter((e) => classes(e as HTMLElement).includes('ring-2')).map((e) => e.getAttribute('data-cell'))).toEqual(['3-7']);
  });

  it('says on the figure which cell or day it was asked to draw as pointed at', () => {
    const a = render(<Heatmap label="Requests by weekday and hour" values={week} data-preview-cell="3-23" />);
    expect(a.container.querySelector('figure')).toHaveAttribute('data-preview-cell', '3-23');
    a.unmount();
    const b = render(<Heatmap label="Requests a day" days={days} data-preview-date="2026-10-01" />);
    expect(b.container.querySelector('figure')).toHaveAttribute('data-preview-date', '2026-10-01');
    b.unmount();
    const c = render(<Heatmap label="Requests a day" days={days} />);
    expect(c.container.querySelector('figure')).not.toHaveAttribute('data-preview-date');
  });

  it('draws the focus ring on the grid of either form, and none when not asked', () => {
    const a = render(<Heatmap label="Requests by weekday and hour" values={week} data-preview-state="focus" />);
    expect(classes(hours())).toEqual(expect.arrayContaining(['outline-2', 'outline-offset-4', 'outline-accent']));
    a.unmount();
    const b = render(<Heatmap label="Requests by weekday and hour" values={week} />);
    expect(classes(hours())).not.toContain('outline-2');
    b.unmount();
    const c = render(<Heatmap label="Requests a day" days={days} data-preview-state="focus" />);
    expect(classes(calendar())).toEqual(expect.arrayContaining(['outline-2', 'outline-offset-4', 'outline-accent']));
    c.unmount();
    render(<Heatmap label="Requests a day" days={days} />);
    expect(classes(calendar())).not.toContain('outline-2');
  });

  it('reads the day in progress as so far when that is the day drawn as pointed at', () => {
    const { container } = render(<Heatmap label="Requests a day" days={days} running data-preview-date="2026-10-04" />);
    expect(readout(container)).toHaveTextContent('Sun 4 Oct 2026 · 463 requests so far');
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(/so far/);
  });
});

describe('a heatmap\'s Tab stop is its cells, on either form', () => {
  const inside = (group: HTMLElement) => [...group.querySelectorAll('*')].filter((e) => /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/.test(e.textContent ?? '')).length;

  it('holds every cell and none of the weekday names, so the focus ring encloses what the keys move through', () => {
    const a = render(<Heatmap label="Requests by weekday and hour" values={week} />);
    expect(hours().querySelectorAll('[data-cell]')).toHaveLength(168);
    expect(inside(hours())).toBe(0);
    expect(names()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    a.unmount();
    size.width = 878;
    render(<Heatmap label="Requests a day" days={days} />);
    expect(calendar().querySelectorAll('[data-cell]')).toHaveLength(364);
    expect(inside(calendar())).toBe(0);
    expect(names()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });
});

describe('a heatmap of days: the outline of a day in progress', () => {
  it('is drawn an edge at a time with antialiasing off, not as a dashed border the browser fits round the box', () => {
    const { container } = render(<Heatmap label="Requests a day" days={days} running />);
    const cell = container.querySelector<HTMLElement>('[data-cell][data-running]')!;
    expect(cell.querySelectorAll('svg[shape-rendering="crispEdges"] line')).toHaveLength(4);
    expect(classes(cell)).not.toContain('border-dashed');
    expect(container.querySelectorAll('[data-cell]:not([data-running]) svg')).toHaveLength(0);
  });
});

describe('a heatmap of days: the weekday names', () => {
  it('names all seven where a row is 16px or more', () => {
    // 52 weeks in 878px: (878 - 40 - 8 - 51 × 2) / 52 is a 14px cell, and 2px to the next.
    size.width = 878;
    render(<Heatmap label="Requests a day" days={days} />);
    expect(names()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });

  it('names Monday, Wednesday and Friday one pixel narrower', () => {
    size.width = 877;
    const { container } = render(<Heatmap label="Requests a day" days={days} />);
    expect(names()).toEqual(['Mon', 'Wed', 'Fri']);
    expect(container.querySelector('[data-weeks]')).toBeNull();
  });
});

describe('a heatmap of days with nothing to rank', () => {
  it('draws every day as the empty track and reads More on either scale', () => {
    const zero = days.slice(-28).map((d) => ({ ...d, value: 0 }));
    for (const scale of ['max', 'quantile'] as const) {
      const { container, unmount } = render(<Heatmap label="Requests a day" days={zero} scale={scale} />);
      expect([...container.querySelectorAll('[data-cell]')].map((e) => e.getAttribute('data-step'))).toEqual(Array(28).fill('0'));
      expect(container.querySelector('figcaption')).toHaveTextContent('More');
      expect(container.querySelector('figcaption')).not.toHaveTextContent(/or more/);
      unmount();
    }
  });
});
