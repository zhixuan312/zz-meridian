import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MetricTile } from '@/components/patterns/metric-tile';
import { ShellTools, type Alert } from '@/components/patterns/shell-tools';

// A dot that carries a state alone — a tile's finding, an alert's row — named its state in colour only before this: a
// reader who cannot see the colour got nothing, and the two patterns worded the same tone differently (#133).

/** The named dot inside `scope`, if there is one. */
const namedDot = (scope: HTMLElement) => within(scope).queryByRole('img');

describe('a metric tile finding', () => {
  it('names its tone, so the dot is not a colour alone', () => {
    const { container } = render(
      <MetricTile label="Error rate" value={0.009} points={[0.008, 0.009]} finding={{ text: '2.7× usual on 21 and 22 Sept', tone: 'warning' }} format={(n) => `${(n * 100).toFixed(1)}%`} />,
    );
    const dot = namedDot(container);
    expect(dot).toHaveAccessibleName('Needs attention');
    // The pointer reads the same word: the dot's own title is that name.
    expect(dot).toHaveAttribute('title', 'Needs attention');
  });

  it('names a neutral finding as a fact, and not as something to look at', () => {
    const { container } = render(
      <MetricTile label="Requests" value={128000} points={[1, 2]} finding={{ text: '357 of 360 days', tone: 'neutral' }} format={(n) => String(n)} />,
    );
    expect(namedDot(container)).toHaveAccessibleName('For information');
  });

  it('keeps its tone when the finding is a button that points at a day, whose own name replaces what it contains', () => {
    render(
      <MetricTile label="Error rate" value={0.009} points={[0.008, 0.009]} finding={{ text: '2.7× usual', day: '2026-09-21', tone: 'warning' }} format={(n) => `${(n * 100).toFixed(1)}%`} />,
    );
    const button = screen.getByRole('button', { name: /2.7× usual/ });
    expect(button).toHaveAccessibleName('Needs attention: 2.7× usual. Point at 21 Sept 2026');
  });
});

describe('an alert row', () => {
  const alerts: Alert[] = [
    { id: 'a', title: 'Inference API degraded', at: '2026-10-01T10:00:00.000Z', href: '/services', tone: 'critical', unread: true },
    { id: 'b', title: 'Northwind Labs is past due', at: '2026-10-01T09:00:00.000Z', href: '/customers', tone: 'warning' },
    { id: 'c', title: 'Verification passed', at: '2026-10-01T08:00:00.000Z', href: '/tests', tone: 'positive' },
  ];
  const now = new Date('2026-10-01T10:30:00.000Z');
  afterEach(() => sessionStorage.clear());

  it('names each alert’s state, the same words the rest of the product uses for that tone', () => {
    render(<ShellTools alerts={alerts} now={now} />);
    fireEvent.click(screen.getByRole('button', { name: /^Alerts/ }));
    const rows = screen.getByRole('list');
    const names = within(rows).getAllByRole('img').map((dot) => dot.getAttribute('aria-label'));
    expect(names).toEqual(['Failed', 'Needs attention', 'Went well']);
  });
});
