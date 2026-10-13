import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The Sparkline draws once it knows its width; the size hook is replaced with a stated one.
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 160, height: 40 }] as const };
});

import { Meridian } from '@/components/charts/meridian';
import { MetricTile } from '@/components/patterns/metric-tile';

const days = ['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'];
const points = [3, 5, 4, 6, 8, 7, 9];
const usd = (n: number) => `$${(n / 1000).toFixed(1)}K`;
const dot = (c: HTMLElement) => c.querySelector('[data-finding] [aria-hidden]')!.className;

describe('a metric tile: a finding takes the tone it is given', () => {
  it('stands beside a neutral dot when it is a fact', () => {
    const { container } = render(<MetricTile label="Days inside the band" value={357} finding={{ text: '357 of 360 days', tone: 'neutral' }} />);
    expect(container.querySelector('[data-finding]')).toHaveTextContent('357 of 360 days');
    expect(dot(container)).toContain('bg-ink-3');
    expect(dot(container)).not.toContain('bg-warning');
  });

  it('stands beside the warning dot when it needs a look', () => {
    const { container } = render(<MetricTile label="Error rate" value={0.009} format="percent" finding={{ text: '2.7× usual on 21 and 22 Sept', tone: 'warning' }} />);
    expect(dot(container)).toContain('bg-warning');
    expect(dot(container)).not.toContain('bg-ink-3');
  });

  it('is a button that points the page at its day when it names one, in either tone', () => {
    render(
      <Meridian dates={days}>
        <MetricTile label="Requests" value={42} points={points} finding={{ text: 'The busiest day yet', day: days[4], tone: 'neutral' }} />
      </Meridian>,
    );
    expect(screen.getByRole('button', { name: /The busiest day yet/ })).toHaveAttribute('data-finding');
  });
});

describe('a metric tile: its points', () => {
  it('reads the pointed point, by the prop named for points', () => {
    const { container } = render(
      <Meridian dates={days} day={days[4]}>
        <MetricTile label="Requests" value={42} points={points} format={(n) => String(n)} />
      </Meridian>,
    );
    expect(container.querySelector('[data-value]')).toHaveTextContent('8');
    expect(container.querySelector('svg line')).not.toBeNull();
  });

  it('keeps the period\'s figure, and its Sparkline draws no cursor, when its points are not one for each of the page\'s dates', () => {
    const { container } = render(
      <Meridian dates={days} day={days[1]}>
        <MetricTile label="Requests" value={42} points={[3, 5, 4]} format={(n) => String(n)} />
      </Meridian>,
    );
    expect(container.querySelector('[data-value]')).toHaveTextContent('42');
    expect(container.querySelector('svg path')).not.toBeNull();
    expect(container.querySelector('svg line')).toBeNull();
  });
});

describe('a metric tile: compact, for a wall of many', () => {
  const tile = <MetricTile size="compact" label="Northwind Labs" value={41200} format={usd} delta={0.12} compare="vs last week" note="Scale" points={points} />;

  it('is the name, the change, one line and the Sparkline', () => {
    const { container } = render(tile);
    const compact = container.querySelector('[data-size="compact"]')!;
    expect(compact).toHaveTextContent('Northwind Labs');
    expect(compact).toHaveTextContent('12.0%');
    expect(compact.querySelector('[data-line]')).toHaveTextContent('$41.2K');
    expect(compact.querySelector('[data-line]')).toHaveTextContent('Scale');
    // The Sparkline's own drawing, at the width the size hook states: the change's arrow is a drawing too.
    expect(compact.querySelector('svg[width="160"] path')).not.toBeNull();
  });

  it('has no figure at the figure size, no hint, no icon and no finding', () => {
    const { container } = render(
      <MetricTile size="compact" label="Northwind Labs" value={41200} format={usd} delta={0.12} note="Scale" points={points} hint="What it paid in 14 days." icon={<i data-icon />} finding={{ text: 'Fell this week', tone: 'warning' }} />,
    );
    expect(container.querySelector('[data-value]')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('[data-icon]')).toBeNull();
    expect(container.querySelector('[data-finding]')).toBeNull();
  });

  it('keeps its own figure whatever the page points at', () => {
    const { container } = render(<Meridian dates={days} day={days[4]}>{tile}</Meridian>);
    expect(container.querySelector('[data-line]')).toHaveTextContent('$41.2K');
  });

  it('is not the default', () => {
    const { container } = render(<MetricTile label="Requests" value={42} points={points} />);
    expect(container.querySelector('[data-size="compact"]')).toBeNull();
    expect(container.querySelector('[data-value]')).toHaveTextContent('42');
    expect(container.querySelector('[data-line]')).toBeNull();
  });
});
