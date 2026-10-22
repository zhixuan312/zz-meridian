import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 720, height: 0 }] as const };
});

import { ColumnChart } from '@/components/charts/column-chart';

// A daily net change: rises and falls about zero (#78).
const net = [12, -8, 20, -35, 5].map((value, i) => ({ key: `d${i}`, label: `Day ${i + 1}`, value }));
const box = (c: HTMLElement, key: string) => c.querySelector<HTMLElement>(`[data-column="${key}"] [data-box]`)!;
const ticks = (c: HTMLElement) => [...c.querySelectorAll('[data-tick]')].map((t) => t.textContent);
const level = (c: HTMLElement, text: string) => [...c.querySelectorAll<HTMLElement>('[data-tick]')].find((t) => t.textContent === text)!.parentElement!.style.bottom;

describe('a column chart of a signed series (#78)', () => {
  it('takes its scale under zero, with zero a level, and stands every column on the zero line', () => {
    const { container } = render(<ColumnChart label="Net change a day" columns={net} />);
    // From -35 to 20 in three steps: a step of 20, so the levels run -40 to 20 and zero stands two thirds up.
    expect(ticks(container)).toEqual(['-40', '-20', '0', '20']);
    const pct = (v: string) => parseFloat(v);
    expect(pct(level(container, '0'))).toBeCloseTo(66.667, 2);
    // A rise stands on the zero line; a fall hangs from it, to its own depth.
    expect(pct(box(container, 'd0').style.bottom)).toBeCloseTo(66.667, 2);
    expect(box(container, 'd0').hasAttribute('data-fall')).toBe(false);
    expect(pct(box(container, 'd0').style.height)).toBeCloseTo(20, 2);
    expect(pct(box(container, 'd3').style.top)).toBeCloseTo(33.333, 2);
    expect(box(container, 'd3').hasAttribute('data-fall')).toBe(true);
    expect(pct(box(container, 'd3').style.height)).toBeCloseTo(58.333, 2);
    expect(pct(box(container, 'd1').style.height)).toBeCloseTo(13.333, 2);
  });

  it('writes a fall\'s value under it and rounds its lower end', () => {
    const { container } = render(<ColumnChart label="Net change a day" columns={net} />);
    const fall = box(container, 'd3');
    expect(fall.querySelector('[data-value]')).toHaveTextContent('-35');
    expect(fall.querySelector('[data-value]')!.closest('.top-full')).not.toBeNull();
    expect(fall.querySelector('.rounded-b-\\[4px\\]')).not.toBeNull();
    expect(box(container, 'd0').querySelector('[data-value]')!.closest('.bottom-full')).not.toBeNull();
  });

  it('reads a fall as its value in the table, signed', () => {
    const { container } = render(<ColumnChart label="Net change a day" columns={net} />);
    expect([...container.querySelectorAll('table tbody td')].map((t) => t.textContent)).toEqual(['12', '-8', '20', '-35', '5']);
  });

  it('keeps a scale from zero while no value falls under it', () => {
    const { container } = render(<ColumnChart label="Count a day" columns={net.map((c) => ({ ...c, value: Math.abs(c.value) }))} />);
    expect(ticks(container)[0]).toBe('0');
    expect(level(container, '0')).toBe('0%');
  });

  it('leaves a stacked column\'s parts a whole: a part under zero is no contribution', () => {
    const { container } = render(<ColumnChart label="Calls by region" parts={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]} columns={[{ key: 'x', label: 'X', values: [10, -4] }]} />);
    expect(ticks(container)[0]).toBe('0');
    expect([...container.querySelectorAll('table tbody td')].map((t) => t.textContent)).toEqual(['10', '0', '10']);
  });
});
