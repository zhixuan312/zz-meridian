import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// A Sparkline draws once it knows its width; the size hook is replaced with a stated one.
vi.mock('@/components/charts/use-size', () => ({ useSize: () => [{ current: null }, { width: 120, height: 36 }] }));

import { Sparkline } from '@/components/charts/sparkline';

// I-14 finding 3: a Sparkline says the range it draws. Widened, that is the nice levels that take the data, not the data.

const title = (values: number[], domain?: [number, number]) => render(<Sparkline values={values} domain={domain} />).container.firstElementChild?.getAttribute('title');

describe('a Sparkline\'s title', () => {
  it('names the widened range it draws, as its README says', () => {
    expect(title([42, 55, 48, 61, 128, 66, 63], [0, 100])).toBe('0 to 150, scale widened from 0–100');
  });

  it('names the data\'s own range without a domain', () => {
    expect(title([42, 55, 48, 61, 66, 63])).toBe('42 to 66');
  });
});
