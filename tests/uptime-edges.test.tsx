import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UptimeBars, type DayState } from '@/components/charts/uptime-bars';

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const end = new Date('2026-10-05T12:00:00Z');
const days: DayState[] = Array.from({ length: 90 }, () => 'operational');
const tip = (c: HTMLElement) => c.querySelector<HTMLElement>('figure > div[aria-hidden]')!;

describe("an uptime strip's tooltip", () => {
  it('stays inside the figure at both ends: it moves by the share of its own width the day sits at', () => {
    const { container } = render(<UptimeBars days={days} uptime={1} end={end} label="Gateway" />);
    const strip = screen.getByRole('group');
    fireEvent.keyDown(strip, { key: 'Home' });
    expect(tip(container).style.left).toBe(tip(container).style.transform.match(/-([\d.]+%)/)![1]);
    expect(parseFloat(tip(container).style.left)).toBeCloseTo((0.5 / 90) * 100, 3);
    fireEvent.keyDown(strip, { key: 'End' });
    expect(tip(container).style.left).toBe(tip(container).style.transform.match(/-([\d.]+%)/)![1]);
    expect(parseFloat(tip(container).style.left)).toBeCloseTo((89.5 / 90) * 100, 3);
  });
});

describe('an uptime strip with no days', () => {
  it('says there is no history yet, instead of an empty plot between two invented dates', () => {
    const { container } = render(<UptimeBars days={[]} uptime={1} end={end} label="Gateway" />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.textContent).toMatch(/No history yet/);
    expect(container.textContent).not.toMatch(/0 days/);
  });
});
