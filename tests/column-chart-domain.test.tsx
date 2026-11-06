import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A chart's scale is decided by its data and its props, not by a width, so the size hook is stated once here.
const size = vi.hoisted(() => ({ width: 640, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { ColumnChart, type Column } from '@/components/charts/column-chart';
import { scaleOf } from '@/components/charts/column-chart/shared';

const af = (n: number) => n.toLocaleString('en-US');

/**
 * A scale held to a stated range, as the Trend chart holds its own: three charts read side by side share their levels and
 * compare by height. A column is read by its height, so the range is drawn from zero; a value outside it widens the scale
 * rather than being cropped, and the chart says which range it drew instead (#136).
 */
describe('scaleOf with a held domain', () => {
  it('ends its levels at both ends of the range while every value is inside it', () => {
    const held = scaleOf([20, 60], true, false, af, [0, 100]);
    expect(held.ticks[0]).toBe(0);
    expect(held.ticks.at(-1)).toBe(100);
    expect(held.widened).toBe('');
    // The same column drawn held and unheld has a different height, which is the whole point: 60 of 100 is 60% of the
    // plot, and on its own scale, which tops out at 60, 100%.
    const own = scaleOf([20, 60], true, false, af);
    expect(held.at100(60)).toBeCloseTo(60, 6);
    expect(own.at100(60)).toBeCloseTo(100, 6);
  });

  it('draws two charts of different values on the same levels, so equal heights read equal', () => {
    const a = scaleOf([42], true, false, af, [0, 100]);
    const b = scaleOf([84], true, false, af, [0, 100]);
    expect(a.ticks).toEqual(b.ticks);
    expect(b.at100(84)).toBeCloseTo(84, 6);
    expect(a.at100(84)).toBeCloseTo(84, 6);
    // Alone, each chart takes its own top, so the same two values stand at unrelated heights: 42 of 100 is 42%, and 42 of
    // its own top of 60 is 70%.
    expect(a.at100(42)).toBeCloseTo(42, 6);
    expect(scaleOf([42], true, false, af).at100(42)).toBeCloseTo(70, 6);
  });

  it('widens to take a value outside the range, names the range it drew, and never crops', () => {
    const held = scaleOf([20, 160], true, false, af, [0, 100]);
    expect(held.ticks.at(-1)).toBeGreaterThanOrEqual(160);
    expect(held.widened).toBe('Scale widened from 0–100 to 0–200');
    expect(held.at100(160)).toBeLessThanOrEqual(100);
  });

  it('is the unheld scale when the domain is not a range', () => {
    const own = scaleOf([10, 40], true, false, af);
    const notARange: [number, number][] = [[50, 50], [90, 20]];
    for (const domain of notARange) {
      const held = scaleOf([10, 40], true, false, af, domain);
      expect({ ticks: held.ticks, low: held.low, top: held.top, widened: held.widened }).toEqual({ ticks: own.ticks, low: own.low, top: own.top, widened: '' });
    }
  });

  it('keeps a whole count scale whole at both its ends', () => {
    const held = scaleOf([3, 7], true, true, af, [0, 10]);
    expect(held.ticks.every(Number.isInteger)).toBe(true);
    expect(held.ticks[0]).toBe(0);
    expect(held.ticks.at(-1)).toBe(10);
  });
});

const columns: Column[] = [
  { key: 'a', label: 'Mon', value: 42 },
  { key: 'b', label: 'Tue', value: 84 },
];

describe('ColumnChart with a domain', () => {
  beforeEach(() => { size.width = 640; });

  it('draws its levels at the held range and says nothing, since the range was enough', () => {
    const { container } = render(<ColumnChart columns={columns} label="Requests a day" domain={[0, 100]} format={af} />);
    const ticks = [...container.querySelectorAll('[data-tick]')].map((t) => t.textContent);
    expect(ticks).toEqual(['0', '25', '50', '75', '100']);
    expect(container.querySelector('[data-widened]')).toBeNull();
  });

  it('says the range it drew when a column stands outside the held one', () => {
    const { container } = render(<ColumnChart columns={columns} label="Requests a day" domain={[0, 50]} format={af} />);
    expect(container.querySelector('[data-widened]')?.textContent).toBe('Scale widened from 0–50 to 0–100');
  });

  it('holds the grouped form too, and leaves the range alone when the parts are inside it', async () => {
    const { container } = render(
      <ColumnChart grouped columns={[{ key: 'a', label: 'Mon', values: [10, 40] }]} parts={[{ key: 'in', label: 'In' }, { key: 'out', label: 'Out' }]} label="Flow" domain={[0, 100]} format={af} />,
    );
    // The grouped form is a chunk of its own, so it arrives a frame later than the plain one.
    await waitFor(() => expect(container.querySelectorAll('[data-column]')).toHaveLength(1));
    expect([...container.querySelectorAll('[data-tick]')].map((t) => t.textContent)).toEqual(['0', '25', '50', '75', '100']);
    expect(container.querySelector('[data-widened]')).toBeNull();
  });
});
