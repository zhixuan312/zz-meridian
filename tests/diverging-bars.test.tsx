import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

// The plot is measured to set the gutters; the size hook is replaced with a stated width.
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 480, height: 0 }] as const };
});

import { DivergingBars, type DivergingItem } from '@/components/charts/diverging-bars';

// FR-12 (AC-1.11, and AC-2.1 for Diverging bars): signed rows about a zero line on a symmetric scale.

const items: DivergingItem[] = [
  { key: 'a', label: 'Alpha', value: 12 },
  { key: 'b', label: 'Beta', value: -8 },
  { key: 'c', label: 'Gamma', value: 30 },
  { key: 'd', label: 'Delta', value: -35 },
  { key: 'e', label: 'Eta', value: 0 },
  { key: 'f', label: 'Theta', value: null },
  { key: 'g', label: 'Iota', value: 12 },
];
type Props = Partial<ComponentProps<typeof DivergingBars>>;
const draw = (props: Props = {}, list: DivergingItem[] = items) => render(<DivergingBars label="Net change by category" items={list} {...props} />).container;
const rows = (c: HTMLElement) => [...c.querySelectorAll('[data-row]')];
const keys = (c: HTMLElement) => rows(c).map((r) => r.getAttribute('data-row'));
const row = (c: HTMLElement, key: string) => c.querySelector(`[data-row="${key}"]`)!;
const bar = (c: HTMLElement, key: string) => row(c, key).querySelector('[data-bar]');
const figure = (c: HTMLElement, key: string) => row(c, key).querySelector('[data-figure]')?.textContent;
const width = (el: Element | null) => (el ? parseFloat((el as HTMLElement).style.width) : 0);
const levels = (c: HTMLElement) => [...c.querySelectorAll('[data-level]')].map((e) => e.textContent);
const SHORTHAND = /(^|;)\s*background\s*:/;

describe('rows', () => {
  it('sort the largest rise first and the largest fall last, equal values in the order given and no data after every value', () => {
    expect(keys(draw())).toEqual(['c', 'a', 'g', 'e', 'b', 'd', 'f']);
  });

  it('keep the order given under order="given"', () => {
    expect(keys(draw({ order: 'given' }))).toEqual(items.map((i) => i.key));
  });

  it('read signed by default: a rise with +, a fall with the true minus, zero as 0, no data as —', () => {
    const c = draw();
    expect(['c', 'b', 'e', 'f'].map((k) => figure(c, k))).toEqual(['+30', '−8', '0', '—']);
  });

  it('draw a rise to the right and a fall to the left, none for no data, each its share of the half-plot', () => {
    const c = draw();
    expect(bar(c, 'c')?.getAttribute('data-side')).toBe('rise');
    expect(bar(c, 'd')?.getAttribute('data-side')).toBe('fall');
    expect(bar(c, 'f')).toBeNull();
    expect(width(bar(c, 'e'))).toBe(0);
    // No domain: symmetric about zero over the last nice level of the largest magnitude, 35, which is 40.
    expect(width(bar(c, 'c'))).toBeCloseTo(75, 6);
    expect(width(bar(c, 'd'))).toBeCloseTo(87.5, 6);
    expect(width(bar(c, 'b'))).toBeCloseTo(20, 6);
  });

  it('draw the neutral population with one accent row, never coloured by sign', () => {
    const c = draw({ highlight: 'd', highlightLabel: 'The largest fall' });
    expect(bar(c, 'd')!.className).toMatch(/\bbg-accent\b/);
    for (const k of ['a', 'b', 'c', 'g']) expect(bar(c, k)!.className, k).toMatch(/\bbg-chart-neutral\b/);
    expect(c.innerHTML).not.toMatch(/\b(?:bg|text)-(?:success|critical|warning)\b/);
    expect(row(c, 'd').getAttribute('title')).toContain('The largest fall');
  });

  it('make a linked row\'s label its one link', () => {
    const c = draw({}, [{ key: 'a', label: 'Alpha', value: 12, href: '/categories/alpha' }, { key: 'b', label: 'Beta', value: -8 }]);
    const links = row(c, 'a').querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toBe('Alpha');
    expect(row(c, 'b').querySelectorAll('a')).toHaveLength(0);
  });
});

describe('the scale', () => {
  it('draws the held levels of its range on the axis, in the format, with a gridline at each', () => {
    const c = draw();
    expect(levels(c)).toEqual(['−40', '−20', '0', '+20', '+40']);
    expect(c.querySelectorAll('[data-gridline]')).toHaveLength(5);
    expect(draw({ axis: false }).querySelectorAll('[data-level]')).toHaveLength(0);
  });

  it('holds a domain it is given, without words', () => {
    const c = draw({ domain: 50 });
    expect(levels(c)).toEqual(['−50', '−25', '0', '+25', '+50']);
    expect(width(bar(c, 'c'))).toBeCloseTo(60, 6);
    expect(c.querySelector('[data-widened]')).toBeNull();
  });

  it('widens to the largest magnitude past the domain, adds it at each end, and names its row', () => {
    const c = draw({ domain: 30 });
    expect(width(bar(c, 'd'))).toBeCloseTo(100, 6);
    expect(width(bar(c, 'c'))).toBeCloseTo((30 / 35) * 100, 6);
    expect(levels(c)).toEqual(['−35', '−30', '−20', '−10', '0', '+10', '+20', '+30', '+35']);
    expect(c.querySelector('[data-widened]')?.textContent).toBe('Scale widened to +35 to show Delta');
  });
});

describe('estimates', () => {
  it('hatch an estimated row\'s bar with its fill a background colour, say so on its row, and write the key once', () => {
    const c = draw({}, items.map((i) => ({ ...i, estimate: i.key === 'b' })));
    expect(bar(c, 'b')!.hasAttribute('data-estimate')).toBe(true);
    expect(bar(c, 'a')!.hasAttribute('data-estimate')).toBe(false);
    expect(bar(c, 'b')!.getAttribute('style') ?? '').not.toMatch(SHORTHAND);
    expect(row(c, 'b').getAttribute('title')).toMatch(/\bestimate\b/);
    expect(c.querySelector('[data-estimate-key]')?.textContent).toBe('Hatched: estimate');
    expect(c.textContent?.match(/Hatched: estimate/g)).toHaveLength(1);
  });

  it('write nothing about estimates when no row is one', () => {
    expect(draw().textContent).not.toMatch(/Hatched/);
  });
});
