import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarList } from '@/components/charts/bar-list';
import { CompositionBar } from '@/components/charts/composition-bar';

// A quantity reads the same in a tile, a cell and a chart (src/lib/format.ts): a chart that formats on its own default
// printed a rounded-away negative as "-0" where the cell beside it said "0".
describe("a chart's default number format", () => {
  it('is the product count format: a zero carries no sign', () => {
    const { container } = render(<BarList label="Change" items={[{ key: 'a', label: 'Batch', value: -0 }, { key: 'b', label: 'Stream', value: 1200 }]} />);
    expect(container.textContent).toContain('1,200');
    expect(container.textContent).not.toMatch(/-0\b/);
  });

  it('in a composition bar too', () => {
    const { container } = render(<CompositionBar label="Mix" parts={[{ label: 'Batch', value: 2500 }, { label: 'Stream', value: -0 }]} />);
    expect(container.textContent).toContain('2,500');
    expect(container.textContent).not.toMatch(/-0\b/);
  });
});
