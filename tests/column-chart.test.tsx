import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A rule about a chart's width is tested at a stated width, one on each side of the threshold: the size hook is replaced.
const size = vi.hoisted(() => ({ width: 720, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { ColumnChart } from '@/components/charts/column-chart';
import { Meridian, useMeridianIndex } from '@/components/charts/meridian';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const week = DAYS.map((label, i) => ({ key: `d${i}`, label, value: (i + 1) * 10 }));
const dates = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
const column = (c: HTMLElement, key: string) => c.querySelector(`[data-column="${key}"]`)!;
const active = (c: HTMLElement) => [...c.querySelectorAll('[data-column][data-active]')].map((e) => e.getAttribute('data-column'));
const values = (c: HTMLElement) => [...c.querySelectorAll('[data-value]')];
const pointed = () => document.querySelector('output[data-pointed]');
const live = (c: HTMLElement) => c.querySelector('[aria-live="polite"]')!;
const plot = () => screen.getByRole('group', { name: /^Errors per day/ });
const rows = () => [...screen.getByRole('table').querySelectorAll('tbody tr')];

beforeEach(() => { size.width = 720; size.height = 0; });

describe('a column chart: its values at rest', () => {
  it('writes each column\'s value above it while a column is at least 36px wide', () => {
    size.width = 400;
    const { container } = render(<ColumnChart label="Errors per day" columns={week} />);
    expect(values(container)).toHaveLength(7);
    for (const c of week) expect(column(container, c.key).querySelector('[data-value]')).toHaveTextContent(String(c.value));
  });

  it('keeps them for pointing when a column is narrower', () => {
    size.width = 200;
    const { container } = render(<ColumnChart label="Errors per day" columns={week} />);
    expect(values(container)).toHaveLength(0);
    fireEvent.keyDown(plot(), { key: 'Home' });
    expect(values(container)).toHaveLength(1);
    expect(column(container, 'd0').querySelector('[data-value]')).toHaveTextContent('10');
  });

  it('formats them as the chart formats', () => {
    const { container } = render(<ColumnChart label="Errors per day" columns={week.map((c) => ({ ...c, value: c.value * 100 }))} format={(n) => `${n.toLocaleString('en-US')} errors`} />);
    expect(column(container, 'd6').querySelector('[data-value]')).toHaveTextContent('7,000 errors');
  });
});

describe('a column chart: a period still running', () => {
  it('marks the last column, and no other, as unfinished', () => {
    const { container } = render(<ColumnChart label="Errors per day" columns={week} running />);
    expect([...container.querySelectorAll('[data-column][data-running]')].map((e) => e.getAttribute('data-column'))).toEqual(['d6']);
  });

  it('marks none when every period is complete', () => {
    const { container } = render(<ColumnChart label="Errors per day" columns={week} />);
    expect(container.querySelectorAll('[data-running]')).toHaveLength(0);
  });

  it('says so far when that column is read, and for no other', () => {
    const { container } = render(<ColumnChart label="Errors per day" columns={week} running />);
    fireEvent.keyDown(plot(), { key: 'End' });
    expect(live(container)).toHaveTextContent('Sun');
    expect(live(container)).toHaveTextContent('70');
    expect(live(container)).toHaveTextContent(/so far/i);
    fireEvent.keyDown(plot(), { key: 'Home' });
    expect(live(container)).toHaveTextContent('Mon');
    expect(live(container)).not.toHaveTextContent(/so far/i);
  });

  it('says so far in the last row of the table and in no other', () => {
    render(<ColumnChart label="Errors per day" columns={week} running />);
    expect(rows()).toHaveLength(7);
    expect(rows()[6].querySelector('th')).toHaveTextContent(/so far/i);
    expect(rows()[6].querySelector('td')).toHaveTextContent('70');
    for (const row of rows().slice(0, 6)) expect(row).not.toHaveTextContent(/so far/i);
  });
});

describe('a column chart: its height', () => {
  it('gives the plot the pixels it is told, 200 by default', () => {
    const a = render(<ColumnChart label="Errors per day" columns={week} />);
    expect((a.container.querySelector('[data-plot]') as HTMLElement).style.height).toBe('200px');
    a.unmount();
    const b = render(<ColumnChart label="Errors per day" columns={week} height={160} />);
    expect((b.container.querySelector('[data-plot]') as HTMLElement).style.height).toBe('160px');
  });

  it('fixes no height on fill: the figure grows with its card, never under 220px, as the Trend chart does', () => {
    const { container } = render(<ColumnChart label="Errors per day" columns={week} height="fill" />);
    expect((container.querySelector('[data-plot]') as HTMLElement).style.height).toBe('');
    const figure = container.querySelector('figure')!;
    expect(figure.className).toContain('flex-1');
    expect(figure.className).toContain('min-h-55');
  });
});

describe('a column chart: the keyboard', () => {
  it('is one Tab stop, named for the chart', () => {
    const { container } = render(<ColumnChart label="Errors per day" columns={week} />);
    expect([...container.querySelectorAll('[tabindex="0"]')]).toEqual([plot()]);
  });

  it('moves one cursor with Left, Right, Home and End, from the last column, and clears it with Escape', () => {
    const { container } = render(<ColumnChart label="Errors per day" columns={week} />);
    expect(active(container)).toEqual([]);
    fireEvent.keyDown(plot(), { key: 'ArrowLeft' });
    expect(active(container)).toEqual(['d5']);
    fireEvent.keyDown(plot(), { key: 'Home' });
    expect(active(container)).toEqual(['d0']);
    fireEvent.keyDown(plot(), { key: 'ArrowLeft' });
    expect(active(container)).toEqual(['d0']);
    fireEvent.keyDown(plot(), { key: 'ArrowRight' });
    expect(active(container)).toEqual(['d1']);
    expect(live(container)).toHaveTextContent('Tue');
    expect(live(container)).toHaveTextContent('20');
    fireEvent.keyDown(plot(), { key: 'End' });
    fireEvent.keyDown(plot(), { key: 'ArrowRight' });
    expect(active(container)).toEqual(['d6']);
    fireEvent.keyDown(plot(), { key: 'Escape' });
    expect(active(container)).toEqual([]);
    expect(live(container).textContent).toBe('');
  });

  it('starts at the last column when the first key is Right, and lets go on blur', () => {
    const { container } = render(<ColumnChart label="Errors per day" columns={week} />);
    fireEvent.keyDown(plot(), { key: 'ArrowRight' });
    expect(active(container)).toEqual(['d6']);
    fireEvent.blur(plot());
    expect(active(container)).toEqual([]);
  });

  it('moves the page\'s Meridian when the columns are days', () => {
    function Pointed() {
      const { index } = useMeridianIndex();
      return <output data-pointed>{index === null ? 'none' : String(index)}</output>;
    }
    render(
      <Meridian dates={dates}>
        <ColumnChart label="Errors per day" columns={week} dates={dates} />
        <Pointed />
      </Meridian>,
    );
    expect(pointed()).toHaveTextContent('none');
    fireEvent.keyDown(plot(), { key: 'End' });
    expect(pointed()).toHaveTextContent('6');
    fireEvent.keyDown(plot(), { key: 'ArrowLeft' });
    expect(pointed()).toHaveTextContent('5');
    fireEvent.keyDown(plot(), { key: 'Escape' });
    expect(pointed()).toHaveTextContent('none');
  });
});
