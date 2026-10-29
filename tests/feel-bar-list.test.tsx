import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The levels row is measured; the size hook is replaced with a stated width.
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 600, height: 0 }] as const };
});

import { BarList } from '@/components/charts/bar-list';

// The standard sets axis labels at `text-2xs` in `ink-3`, as Diverging bars and the Column chart draw theirs.

describe('a Bar list\'s axis levels', () => {
  it('are written at text-2xs in ink-3, not as a caption', () => {
    const { container } = render(<BarList label="Requests by region" axis items={[{ key: 'a', label: 'Alpha', value: 82 }, { key: 'b', label: 'Beta', value: 40 }]} />);
    const row = container.querySelector('[data-level]')!.parentElement!;
    expect(row.className).toMatch(/(^|\s)text-2xs(\s|$)/);
    expect(row.className).toMatch(/(^|\s)text-ink-3(\s|$)/);
    expect(row.className).not.toMatch(/t-caption/);
  });
});
