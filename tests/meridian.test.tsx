import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Meridian, useMeridian, useMeridianIndex } from '@/components/charts/meridian';

const dates = ['2026-10-01', '2026-10-02', '2026-10-03'];
function Pointer() {
  const { setIndex } = useMeridian(dates);
  return <button onClick={() => setIndex(1)}>point</button>;
}
function Readout({ name }: { name: string }) {
  const { index, dates: held } = useMeridianIndex();
  return <p data-testid={name}>{index === null ? 'none' : held[index]}</p>;
}

describe('the Meridian', () => {
  it('shares one cursor between every reader on a page', () => {
    render(<Meridian dates={dates}><Pointer /><Readout name="a" /><Readout name="b" /></Meridian>);
    expect(screen.getByTestId('a').textContent).toBe('none');
    act(() => screen.getByText('point').click());
    expect(screen.getByTestId('a').textContent).toBe('2026-10-02');
    expect(screen.getByTestId('b').textContent).toBe('2026-10-02');
  });
  it('gives a chart outside a provider its own cursor', () => {
    render(<><Pointer /><Readout name="c" /></>);
    act(() => screen.getByText('point').click());
    expect(screen.getByTestId('c').textContent).toBe('none');
  });
  it('takes a new address day without making the unchanged address control the local cursor', () => {
    const view = render(<Meridian dates={dates} day={dates[0]}><Pointer /><Readout name="day" /></Meridian>);
    expect(screen.getByTestId('day').textContent).toBe(dates[0]);
    act(() => screen.getByText('point').click());
    expect(screen.getByTestId('day').textContent).toBe(dates[1]);
    view.rerender(<Meridian dates={[...dates]} day={dates[0]}><Pointer /><Readout name="day" /></Meridian>);
    expect(screen.getByTestId('day').textContent).toBe(dates[1]);
    view.rerender(<Meridian dates={dates} day={dates[2]}><Pointer /><Readout name="day" /></Meridian>);
    expect(screen.getByTestId('day').textContent).toBe(dates[2]);
    view.rerender(<Meridian dates={dates}><Pointer /><Readout name="day" /></Meridian>);
    expect(screen.getByTestId('day').textContent).toBe('none');
  });

  it('keeps the selected date when its position changes, and clears it when the frame loses it', () => {
    const view = render(<Meridian dates={dates} day={dates[0]}><Pointer /><Readout name="day" /></Meridian>);
    act(() => screen.getByText('point').click());
    view.rerender(<Meridian dates={['2026-09-30', ...dates]} day={dates[0]}><Readout name="day" /></Meridian>);
    expect(screen.getByTestId('day').textContent).toBe(dates[1]);
    view.rerender(<Meridian dates={[dates[0]]} day={dates[0]}><Readout name="day" /></Meridian>);
    expect(screen.getByTestId('day').textContent).toBe('none');
    view.rerender(<Meridian dates={dates} day={dates[0]}><Readout name="day" /></Meridian>);
    expect(screen.getByTestId('day').textContent).toBe('none');
  });
});
