import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Meridian, useMeridian } from '@/components/charts/meridian';
import { MetricTile } from '@/components/patterns/metric-tile';

const dates = ['2026-10-01', '2026-10-02', '2026-10-03'];
/** Points the page's Meridian at the second day, which is the day the tile has no number for. */
function Point({ at }: { at: number }) {
  const { setIndex } = useMeridian(dates);
  return <button onClick={() => setIndex(at)}>point</button>;
}
const figure = (c: HTMLElement) => c.querySelector('[data-value]')!.textContent;
const line = (c: HTMLElement) => c.querySelector('[data-value]')!.parentElement!.textContent;

describe('a tile pointed at a day it has no number for', () => {
  it('reads as not measured, never as the period total it was given', () => {
    const { container } = render(
      <Meridian dates={dates}>
        <Point at={1} />
        <MetricTile label="Requests" value={1200} delta={0.4} points={[1100, null, 1300]} />
      </Meridian>,
    );
    // Not pointed: the period's own figure and change, as before.
    expect(figure(container)).toBe('1,200');
    act(() => { container.querySelector('button')!.click(); });
    // Pointed at 2 Oct, which has no measurement: the day's number would be a lie, and so is the period's total.
    expect(figure(container)).toBe('—');
    expect(line(container)).toContain('2 Oct 2026');
    expect(line(container)).toContain('No reading for this day');
    expect(line(container)).not.toContain('40.0%');
  });

  it('still reads a pointed day that does have a number', () => {
    const { container } = render(
      <Meridian dates={dates}>
        <Point at={0} />
        <MetricTile label="Requests" value={1200} delta={0.4} points={[1100, null, 1300]} />
      </Meridian>,
    );
    act(() => { container.querySelector('button')!.click(); });
    expect(figure(container)).toBe('1,100');
    expect(line(container)).toContain('1 Oct 2026');
  });
});
