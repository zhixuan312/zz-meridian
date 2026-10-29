import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// A Sparkline draws once it knows its width; the size hook is replaced with a stated one.
vi.mock('@/components/charts/use-size', () => ({ useSize: () => [{ current: null }, { width: 120, height: 36 }] }));

import { Sparkline } from '@/components/charts/sparkline';
import { MetricTile } from '@/components/patterns/metric-tile';
import { formatBy } from '@/lib/format';

// A Sparkline says the range it draws. Widened, that is the nice levels that take the data, not the data.

const title = (values: number[], domain?: [number, number]) => render(<Sparkline values={values} domain={domain} />).container.firstElementChild?.getAttribute('title');

describe('a Sparkline\'s title', () => {
  it('names the widened range it draws, as its README says', () => {
    expect(title([42, 55, 48, 61, 128, 66, 63], [0, 100])).toBe('0 to 150, scale widened from 0–100');
  });

  it('names the data\'s own range without a domain', () => {
    expect(title([42, 55, 48, 61, 66, 63])).toBe('42 to 66');
  });

  it("reads its range in the figure's own format, so a share is not titled a count", () => {
    const percent = (n: number) => formatBy('percent', n);
    expect(render(<Sparkline values={[0.62, 0.71, 0.66]} format={percent} />).container.firstElementChild?.getAttribute('title')).toBe(`${percent(0.62)} to ${percent(0.71)}`);
  });

  it("is titled by its tile's format", () => {
    const { container } = render(<MetricTile label="Gross margin" value={0.66} format="percent" points={[0.62, 0.71, 0.66]} />);
    expect(container.querySelector('[title*=" to "]')?.getAttribute('title')).toBe(`${formatBy('percent', 0.62)} to ${formatBy('percent', 0.71)}`);
  });
});
