import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The levels row is measured to keep its words apart; the size hook is replaced with a stated width.
let width = 300;
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width, height: 0 }] as const };
});

import { BarList } from '@/components/charts/bar-list';

// Queued from Phase 1 (AC-1.4): a widened top drawn beside the last held level read "100%112%". A word that would touch
// a word that shows is kept in the row but drawn invisible, from the top inward; the two ends always show.

const pct = (n: number) => `${n}%`;
const draw = (top: number, w: number) => {
  width = w;
  return render(<BarList label="Uptime" max={100} axis format={pct} items={[{ key: 'a', label: 'Alpha', value: 82 }, { key: 'b', label: 'Beta', value: top }]} />).container;
};
const words = (c: HTMLElement) => [...c.querySelectorAll('[data-level]')].map((e) => [e.textContent, e.classList.contains('invisible')]);

describe('the levels of a widened axis', () => {
  it('leave out the word of the last held level when it would touch the widened top, keeping its gridline', () => {
    const c = draw(112, 300);
    expect(words(c)).toEqual([['0%', false], ['25%', false], ['50%', false], ['75%', false], ['100%', true], ['112%', false]]);
    expect(c.querySelectorAll('[data-gridline]')).toHaveLength(6);
  });

  it('leave out a word that would touch the first level', () => {
    expect(words(draw(600, 300))).toEqual([['0%', false], ['25%', true], ['50%', true], ['75%', true], ['100%', false], ['600%', false]]);
  });

  it('show every word when there is room', () => {
    expect(words(draw(112, 600)).every(([, hidden]) => !hidden)).toBe(true);
    expect(words(draw(140, 300)).every(([, hidden]) => !hidden)).toBe(true);
  });

  it('show every word while the row is unmeasured', () => {
    expect(words(draw(112, 0)).every(([, hidden]) => !hidden)).toBe(true);
  });
});
