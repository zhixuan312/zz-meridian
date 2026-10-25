import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The chart marks are drawn from a measured width, so the size hook is replaced with one, as the chart tests do.
const size = vi.hoisted(() => ({ width: 720, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { BarList } from '@/components/charts/bar-list';
import { ColumnChart } from '@/components/charts/column-chart';
import { Sparkline } from '@/components/charts/sparkline';
import { TrendChart } from '@/components/charts/trend-chart';
import { ActivityFeed } from '@/components/patterns/activity-feed';
import { Delta } from '@/components/ui/delta';
import { StatusDot } from '@/components/ui/status-dot';

/**
 * A colour, a fill or a size a reader is meant to decode, with nothing on the page to decode it with: the product's own
 * answer was a title at every call site, page by page (issue #94). Each mark now says what it encodes, built from the
 * data the component already holds, so it is right by default.
 */
describe('a mark says what it encodes', () => {
  it('a Bar list row names the row, its figure and its share, and does so without a total too', () => {
    const items = [{ key: 'a', label: 'Checkout', value: 420 }, { key: 'b', label: 'Search', value: 180 }];
    const { container } = render(<BarList label="Requests by route" items={items} total={1000} />);
    const rows = [...container.querySelectorAll('li')];
    expect(rows[0].getAttribute('title')).toBe('Checkout · 420 · 42.0% of 1,000');
    // A row with no total still names itself and its figure: the old title had nothing to say without one.
    expect(render(<BarList label="Requests by route" items={items} />).container.querySelector('li')!.getAttribute('title')).toBe('Checkout · 420');
  });

  it('an accented column says why it is the accent, on the column and in the table', () => {
    const columns = [{ key: 'd1', label: 'Mon', value: 10 }, { key: 'd2', label: 'Tue', value: 30 }];
    const { container } = render(<ColumnChart label="Errors per day" columns={columns} highlight="d2" highlightLabel="The day of the incident" />);
    expect(container.querySelector('[data-column="d2"]')!.getAttribute('title')).toBe('The day of the incident');
    expect(container.querySelector('[data-column="d1"]')!.getAttribute('title')).toBeNull();
    expect(screen.getByRole('table')).toHaveTextContent('Accented: The day of the incident');
  });

  it('a marked day says what it is marked for, where the day itself is read', () => {
    // The readout is where a pointed day is named, and the mark group takes no pointer, so a tooltip on the dot would be
    // markup nothing can reach. Pointed at the marked day, the reading names it.
    const { container } = render(
      <TrendChart
        label="Uptime"
        dates={['2026-10-01', '2026-10-02', '2026-10-03']}
        series={[{ key: 'u', label: 'Uptime', values: [99.9, 97.2, 99.8] }]}
        marks={{ dates: ['2026-10-02'], tone: 'warning', label: 'Dropped below 99%' }}
        data-preview-index={1}
      />,
    );
    expect(container.querySelector('[data-readout]')!.textContent).toContain('02 Oct 2026 · Dropped below 99%');
    // The day beside it is nobody's mark, and the reading says nothing about marks for it.
    document.body.innerHTML = '';
    const other = render(
      <TrendChart
        label="Uptime"
        dates={['2026-10-01', '2026-10-02', '2026-10-03']}
        series={[{ key: 'u', label: 'Uptime', values: [99.9, 97.2, 99.8] }]}
        marks={{ dates: ['2026-10-02'], tone: 'warning', label: 'Dropped below 99%' }}
        data-preview-index={0}
      />,
    );
    expect(other.container.querySelector('[data-readout]')!.textContent).not.toContain('Dropped below 99%');
  });

  it('a sparkline says the range it draws, since it carries no readout', () => {
    const { container } = render(<Sparkline values={[12, 480, 61]} />);
    expect(container.firstElementChild!.getAttribute('title')).toBe('12 to 480');
  });

  it('a delta says whether its colour reads better or worse', () => {
    // Down is good for latency: the number says which way, the colour says whether that is good, and the sentence says both.
    expect(render(<Delta value={-0.12} intent="down" />).container.firstElementChild!.getAttribute('title')).toBe('Down 12.0%, better');
    // Up is good where up is what the page wants, and bad where it is not.
    expect(render(<Delta value={0.12} />).container.firstElementChild!.getAttribute('title')).toBe('Up 12.0%, better');
    expect(render(<Delta value={0.12} intent="down" />).container.firstElementChild!.getAttribute('title')).toBe('Up 12.0%, worse');
    // A neutral intent paints both directions the same, so there is no judgement to state.
    expect(render(<Delta value={0.12} intent="neutral" />).container.firstElementChild!.getAttribute('title')).toBe('Up 12.0%');
    expect(render(<Delta value={0} />).container.firstElementChild!.getAttribute('title')).toBe('Unchanged');
  });

  it('a status dot is a decoration beside a word and an image when it stands alone', () => {
    const { container } = render(<StatusDot tone="critical" label="Failing" />);
    expect(screen.getByRole('img', { name: 'Failing' })).toBeInTheDocument();
    expect(container.firstElementChild!.getAttribute('title')).toBe('Failing');
    // Beside its word it stays out of the way.
    expect(render(<StatusDot tone="critical" />).container.firstElementChild!.getAttribute('aria-hidden')).toBe('true');
  });

  it('an activity\'s tone carries a word, which the dot never did', () => {
    { const { container } = render(<ActivityFeed now={new Date('2026-10-24T10:00:00Z')} events={[{ id: 'e1', at: '2026-10-24T09:58:00Z', actor: 'Meridian', system: true, verb: 'failed to', object: 'sync the catalog', tone: 'critical' }]} />);
      expect(container.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('Failed');
    }
  });
});
