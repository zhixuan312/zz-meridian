import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { formatDate } from '@/lib/format-date';
import { UptimeBars, type DayState } from '@/components/charts/uptime-bars';

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const end = new Date('2026-10-05T12:00:00Z');
const days: DayState[] = Array.from({ length: 90 }, (_, i) => (i === 80 ? 'outage' : i === 84 ? 'degraded' : i === 10 ? 'none' : 'operational'));

describe('an uptime strip', () => {
  it('is one SVG: a baseline and a mark for each day something happened', () => {
    const { container } = render(<UptimeBars days={days} uptime={0.9981} end={end} label="Gateway, last 90 days" />);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    const marks = container.querySelectorAll('svg [data-day]');
    expect([...marks].map((m) => m.getAttribute('data-state')).sort()).toEqual(['degraded', 'none', 'outage']);
    expect(container.querySelectorAll('table, tr')).toHaveLength(0);
    expect(container.querySelectorAll('span[aria-hidden]').length).toBeLessThan(10);
  });
  it('summarises the period and names only the days that were not fully up', () => {
    const { container } = render(<UptimeBars days={days} uptime={0.9981} end={end} label="Gateway, last 90 days" />);
    const text = container.textContent ?? '';
    expect(text).toMatch(/Gateway, last 90 days: 99\.81% uptime over 90 days/);
    expect(text).toMatch(/Outage/);
    expect(text).toMatch(/Degraded/);
    expect(text).toMatch(/No data/);
    expect(text.match(/Operational/g)?.length ?? 0).toBeLessThanOrEqual(1);
  });
  it('says so when nothing happened', () => {
    const { container } = render(<UptimeBars days={Array(90).fill('operational')} uptime={1} end={end} label="Search" />);
    expect(container.textContent).toMatch(/No incidents/);
    expect(container.querySelectorAll('svg [data-day]')).toHaveLength(0);
  });
  it('still moves a focused day from the keyboard and announces exactly that day', () => {
    render(<UptimeBars days={days} uptime={0.9981} end={end} label="Gateway, last 90 days" />);
    const strip = screen.getByRole('group');
    const live = () => document.querySelector('[aria-live]')?.textContent;
    const dayAgo = (n: number) => formatDate(new Date(end.getTime() - n * 86_400_000));
    strip.focus();
    fireEvent.keyDown(strip, { key: 'End' });
    expect(live()).toBe(`${dayAgo(0)}: Operational`);
    fireEvent.keyDown(strip, { key: 'ArrowLeft' });
    expect(live()).toBe(`${dayAgo(1)}: Operational`);
    for (let i = 0; i < 8; i++) fireEvent.keyDown(strip, { key: 'ArrowLeft' });
    expect(live()).toBe(`${dayAgo(9)}: Outage`);
    fireEvent.keyDown(strip, { key: 'Escape' });
    expect(live()).toBe('');
  });
  it('shows a tip for the incident day under the pointer and drops it when the pointer leaves', () => {
    const { container } = render(<UptimeBars days={days} uptime={0.9981} end={end} label="Gateway, last 90 days" />);
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, right: 90, bottom: 10, width: 90, height: 10, x: 0, y: 0, toJSON() {} });
    fireEvent.pointerMove(svg, { clientX: 84.5 });
    const tip = container.querySelector('[aria-hidden].absolute');
    expect(tip?.textContent).toBe(`Degraded · ${formatDate(new Date(end.getTime() - 5 * 86_400_000))}`);
    expect(container.querySelector('svg [data-focus]')?.getAttribute('x')).toBe('84');
    fireEvent.pointerLeave(container.querySelector('figure')!);
    expect(container.querySelector('[aria-hidden].absolute')).toBeNull();
  });
});
