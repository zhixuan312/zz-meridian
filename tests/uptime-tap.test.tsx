import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UptimeBars, type DayState } from '@/components/charts/uptime-bars';

const days: DayState[] = Array.from({ length: 10 }, (_, i) => (i === 4 ? 'degraded' : 'operational'));

describe('an uptime strip under a finger', () => {
  it('reads the day a tap lands on, which sends no pointer move', () => {
    const { container } = render(<UptimeBars days={days} uptime={0.95} end={new Date('2026-10-03T12:00:00Z')} label="Days" />);
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 32, right: 100, bottom: 32, x: 0, y: 0, toJSON() {} });
    fireEvent.pointerDown(svg, { clientX: 45, clientY: 10, pointerType: 'touch' });
    expect(container.querySelector('[data-focus]')?.getAttribute('x')).toBe('4');
  });
});
