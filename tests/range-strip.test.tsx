import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const size = vi.hoisted(() => ({ width: 720, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { RangeStrip } from '@/components/charts/range-strip';

const items = [
  { key: 'a', label: '/v1/messages', from: 180, to: 391 },
  { key: 'b', label: '/v1/embeddings', from: 90, to: 142 },
];
const ms = (n: number) => `${n}ms`;
const render1 = (props: Partial<Parameters<typeof RangeStrip>[0]> = {}) =>
  render(<RangeStrip label="Lowest and median latency" items={items} format={ms} {...props} />);

/**
 * A range read against a level, row by row. A missing end is the case that matters: drawn from zero it would claim a low
 * end nobody measured, and that is the one thing this chart exists to get right (#126).
 */
describe('RangeStrip', () => {
  beforeEach(() => { size.width = 720; });

  it('states both ends of every row in words, and draws one strip per row', () => {
    const { container } = render1();
    expect(container.querySelectorAll('[data-strip]')).toHaveLength(2);
    for (const row of screen.getAllByRole('listitem')) expect(row.getAttribute('title')).toMatch(/\d+ms to \d+ms/);
  });

  it('draws an open end for a range whose low end was not measured, never one from zero', () => {
    const { container } = render(
      <RangeStrip label="Latency" items={[{ key: 'b', label: '/v1/embeddings', from: null, to: 142 }]} format={ms} />,
    );
    const row = screen.getByRole('listitem');
    expect(row.getAttribute('title')).toContain('up to 142ms');
    // The strip reaches the plot's edge, and the missing end carries no mark.
    expect(container.querySelector('[data-end="from"]')).toBeNull();
    expect(container.querySelector('[data-end="to"]')).not.toBeNull();
  });

  it('draws a range with only its low end to the plot’s edge, and marks no absent end', () => {
    const { container } = render1({ items: [{ key: 'c', label: '/v1/completions', from: 210, to: null }] });
    expect(screen.getByRole('listitem').getAttribute('title')).toContain('from 210ms');
    expect(screen.queryByText(/to null/)).toBeNull();
    expect(container.querySelector('[data-strip]')).not.toBeNull();
    expect(container.querySelector('[data-end="to"]')).toBeNull();
  });

  it('reads every row against the references it is given, and names them once under the chart', () => {
    const { container } = render1({ references: [{ value: 350, label: 'Ceiling' }] });
    expect(container.querySelectorAll('[data-reference-line]')).toHaveLength(1);
    expect(container.textContent).toContain('Ceiling at 350ms');
  });

  it('holds its scale to a stated range, and says the range it drew when a value is outside it', () => {
    const held = render1({ domain: [0, 1500] });
    expect(held.container.querySelector('[data-widened]')).toBeNull();
    held.unmount();
    const widened = render1({ domain: [0, 300] });
    expect(widened.container.querySelector('[data-widened]')?.textContent).toMatch(/^Scale widened from 0ms–300ms to /);
  });

  it('marks the one row the card is about, and says what makes it that row', () => {
    render1({ highlight: 'b', highlightLabel: 'The narrowest range' });
    const [first, second] = screen.getAllByRole('listitem');
    expect(first.getAttribute('title')).not.toContain('The narrowest range');
    expect(second.getAttribute('title')).toContain('The narrowest range');
    expect(within(second).getByText('/v1/embeddings')).toHaveClass('font-medium');
  });

  it('draws no strip for a row that measured nothing', () => {
    const { container } = render(<RangeStrip label="Latency" items={[{ key: 'd', label: '/v1/images', from: null, to: null }]} format={ms} />);
    expect(container.querySelector('[data-strip]')).toBeNull();
    expect(screen.getByRole('listitem').getAttribute('title')).toContain('no value');
  });
});
