import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UptimeBars, type DayState } from '@/components/charts/uptime-bars';

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const days: DayState[] = Array.from({ length: 360 }, (_, i) => (i === 300 ? 'degraded' : 'operational'));
const caption = (c: HTMLElement) => c.querySelector('figcaption')?.textContent ?? '';

describe("the end of an uptime strip's caption", () => {
  it('reads Today when the strip ends today', () => {
    const { container } = render(<UptimeBars days={days} uptime={0.997} end={new Date('2026-10-03T12:00:00Z')} label="Days" />);
    expect(caption(container)).toMatch(/Today$/);
  });
  it('names the day a strip of complete days ends on, never Today', () => {
    const { container } = render(<UptimeBars days={days} uptime={0.997} end={new Date('2026-10-02T12:00:00Z')} endLabel="02 Oct 2026" label="Days" />);
    expect(caption(container)).toMatch(/02 Oct 2026$/);
    expect(caption(container)).not.toContain('Today');
  });
});
