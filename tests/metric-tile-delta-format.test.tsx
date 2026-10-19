import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricTile } from '@/components/patterns/metric-tile';
import { Delta } from '@/components/ui/delta';

describe('a tile whose figure is a share (#74)', () => {
  it('reads its change in points under deltaFormat="points", with the same arrow, colour and word', () => {
    const { container } = render(<MetricTile label="Share refused" value={0.464} format="percent" delta={0.134} deltaFormat="points" intent="down" />);
    const change = container.querySelector('.t-num.inline-flex')!;
    expect(change).toHaveTextContent(/^up 13\.4 pts$/);
    expect(change).toHaveClass('text-critical-ink');
  });
  it('still reads a change as a percentage of the earlier value without it', () => {
    const { container } = render(<MetricTile label="Requests" value={1200} delta={0.406} />);
    expect(container.querySelector('.t-num.inline-flex')).toHaveTextContent(/^up 40\.6%$/);
  });
});

describe('a Delta with no change', () => {
  it('reads it in its format, never a literal 0%', () => {
    expect(render(<Delta value={0} format="points" />).container).toHaveTextContent(/^unchanged 0\.0 pts$/);
    expect(render(<Delta value={0} format={(n) => `${n.toFixed(2)} ms`} />).container).toHaveTextContent(/^unchanged 0\.00 ms$/);
    expect(render(<Delta value={0} />).container).toHaveTextContent(/^unchanged 0%$/);
  });
});
