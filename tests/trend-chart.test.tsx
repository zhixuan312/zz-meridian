import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrendChart } from '@/components/charts/trend-chart';

describe('a stacked trend chart', () => {
  it('reads out each part and the total, for screen readers too', () => {
    render(
      <TrendChart
        label="Calls by attribution"
        stacked
        dates={['2026-10-01', '2026-10-02']}
        series={[
          { key: 'a', label: 'Attributed', values: [80, 90] },
          { key: 'u', label: 'Unattributed', values: [15, null] },
          { key: 'r', label: 'Refused', values: [5, 10] },
        ]}
      />,
    );
    const table = screen.getByRole('table', { name: 'Calls by attribution' });
    expect(table).toHaveTextContent('Total');
    // A missing part is no contribution: 90 + 0 + 10.
    const rows = table.querySelectorAll('tbody tr');
    expect(rows[0].lastElementChild).toHaveTextContent('100');
    expect(rows[1].lastElementChild).toHaveTextContent('100');
  });
});

describe('a trend chart readout', () => {
  afterEach(() => vi.unstubAllGlobals());

  function measure() {
    vi.stubGlobal('ResizeObserver', class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback([{ target, contentRect: { width: 320, height: 200 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      disconnect() {}
    });
  }

  it('keeps a long label and exact extreme values readable through the keyboard path', () => {
    measure();
    const label = 'Metered inference spend after automatic retries';
    const { container } = render(
      <TrendChart label="Spend per day" format="cost" dates={['2026-10-01', '2026-10-02']}
        series={[{ key: 'spend', label, values: [1_234_567_890_123.45, 9_876_543_210_987.65] }]} />,
    );
    const chart = screen.getByRole('img', { name: /Spend per day/ });
    fireEvent.keyDown(chart, { key: 'Home' });
    let readout = container.querySelector('div[aria-hidden]');
    expect(readout).toHaveTextContent(label);
    expect(readout).toHaveTextContent('$1,234,567,890,123.45');
    fireEvent.keyDown(chart, { key: 'End' });
    readout = container.querySelector('div[aria-hidden]');
    expect(readout).toHaveTextContent('$9,876,543,210,987.65');
    expect(screen.getByRole('table', { name: 'Spend per day' })).toHaveTextContent('$1,234,567,890,123.45');
    fireEvent.keyDown(chart, { key: 'Escape' });
    expect(container.querySelector('div[aria-hidden]')).toBeNull();
  });

  it('shows a selected day statically in a specimen', () => {
    measure();
    const { container } = render(
      <TrendChart label="Requests per day" data-preview-index={1} dates={['2026-10-01', '2026-10-02']}
        series={[{ key: 'requests', label: 'Requests', values: [100, 200] }]} />,
    );
    expect(container.querySelector('div[aria-hidden]')).toHaveTextContent('200');
  });
});
