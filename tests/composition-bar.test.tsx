import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompositionBar } from '@/components/charts/composition-bar';
import { SERIES_VAR, stackPart } from '@/components/charts/scale';

const PLANS = [{ label: 'Enterprise', value: 62 }, { label: 'Scale', value: 27 }, { label: 'Starter', value: 11 }];
const fills = (container: HTMLElement) => [...container.querySelectorAll('figure > div:first-child > div')].map((d) => (d as HTMLElement).style.background);

/**
 * Found at the end of Phase 6: Revenue drew its plans in the stacked charts' one-hue stack and, in the Who pays bar
 * beside them, in the categorical slots, so one plan was two colours on one page. And in the narrow card beside a chart
 * the legend stood four across by the window's width, which left "Enterprise · 24 customers" three lines.
 */
describe('a composition bar', () => {
  // The palette has six slots: a seventh part named --series-7, which no theme defines, and drew transparent, its share
  // gone from the bar and its swatch blank in the key, while the percentages still added up.
  it('past six parts, draws the first five and Other, the sum of the rest, each in a colour the palette has', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ label: `Plan ${i + 1}`, value: 12 - i }));
    const { container } = render(<CompositionBar label="Plan mix" parts={many} />);
    expect(fills(container)).toEqual([...([1, 2, 3, 4, 5] as const).map((n) => SERIES_VAR(n)), SERIES_VAR('neutral')]);
    expect(container.textContent).toContain('Other');
    expect(container.textContent).not.toContain('Plan 6');
    // Other is the rest, so every share is still of the whole: 12+11+10+9+8 of 78 drawn apart, 28 of 78 (36%) as Other.
    expect(container.textContent).toMatch(/Other\s*36%/);
  });

  // The review of fed2f39: the whole is the sum of the parts above zero, but Other still summed the folded parts signed,
  // so a folded part below zero cancelled the sixth part's share out of the bar and the key.
  it('folds only the parts above zero into Other, and reads a part below zero as a share of 0%', () => {
    const parts = [10, 10, 10, 10, 10, 10, -10].map((value, i) => ({ label: `P${i}`, value }));
    const { container } = render(<CompositionBar label="Mix" parts={parts} />);
    const widths = [...container.querySelectorAll('figure > div:first-child > div')].map((d) => (d as HTMLElement).style.width);
    expect(widths.at(-1)).toBe(`${(10 / 60) * 100}%`);
    expect(container.textContent).toMatch(/Other\s*17%/);
    const signed = render(<CompositionBar label="Signed" parts={[{ label: 'A', value: 12 }, { label: 'B', value: -8 }]} />);
    expect(signed.container.textContent).toMatch(/B\s*0%-8/);
  });

  it('reads a part above zero as a share above none, and a share that rounds to 10% as 10%', () => {
    const tiny = render(<CompositionBar label="Tiny" parts={[{ label: 'A', value: 99999 }, { label: 'B', value: 4 }, { label: 'C', value: 0 }]} />);
    expect(tiny.container.textContent).toMatch(/B\s*<0\.1%4/);
    expect(tiny.container.textContent).toMatch(/C\s*0%0/);
    const edge = render(<CompositionBar label="Edge" parts={[{ label: 'A', value: 9003 }, { label: 'B', value: 997 }]} />);
    expect(edge.container.textContent).toMatch(/B\s*10%997/);
  });

  it('draws its parts in the categorical slots by default', () => {
    const { container } = render(<CompositionBar label="Plan mix" parts={PLANS} />);
    expect(fills(container)).toEqual(([1, 2, 3] as const).map((n) => SERIES_VAR(n)));
  });

  it('stacked, draws a part with no colour as the stacked charts draw the same part: the one-hue stack by its place', () => {
    const { container } = render(<CompositionBar label="Plan mix" stacked parts={[...PLANS.slice(0, 2), { ...PLANS[2], color: 'neutral' }]} />);
    expect(fills(container)).toEqual([stackPart(0, 3), stackPart(1, 3), SERIES_VAR('neutral')]);
  });

  it("counts its legend's columns from its own width, not the window's", () => {
    const { container } = render(<CompositionBar label="Plan mix" parts={PLANS} />);
    const figure = container.querySelector('figure')!;
    expect(figure.className).toContain('@container');
    const legend = figure.querySelector('figcaption')!;
    expect(legend.className).toMatch(/@min-\[\d+rem\]:grid-cols-4/);
    expect(legend.className).not.toMatch(/(^|\s)sm:grid-cols-4/);
  });
});
