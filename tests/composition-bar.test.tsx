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
  it('draws its parts in the categorical slots by default', () => {
    const { container } = render(<CompositionBar label="Plan mix" parts={PLANS} />);
    expect(fills(container)).toEqual([1, 2, 3].map((n) => SERIES_VAR(n)));
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
