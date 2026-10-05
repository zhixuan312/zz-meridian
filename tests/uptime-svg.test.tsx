import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  it('still moves a focused day from the keyboard and announces it', () => {
    render(<UptimeBars days={days} uptime={0.9981} end={end} label="Gateway, last 90 days" />);
    const strip = screen.getByRole('group');
    strip.focus();
    fireEvent.keyDown(strip, { key: 'End' });
    fireEvent.keyDown(strip, { key: 'ArrowLeft' });
    expect(document.querySelector('[aria-live]')?.textContent).toMatch(/Operational|Degraded|Outage|No data/);
  });
});
