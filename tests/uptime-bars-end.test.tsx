import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UptimeBars, type DayState } from '@/components/charts/uptime-bars';

const days: DayState[] = Array.from({ length: 360 }, (_, i) => (i === 300 ? 'degraded' : 'operational'));
const caption = (c: HTMLElement) => c.querySelector('figcaption')?.textContent ?? '';
/** The screen-reader summary, which dates every day from `end`: the part of the component `end` decides. */
const summary = (c: HTMLElement) => [...c.querySelectorAll('p')].map((p) => p.textContent ?? '').join(' ');

describe("the end of an uptime strip's caption", () => {
  it('reads Today when the strip ends today, and dates its days from that end', () => {
    const { container } = render(<UptimeBars days={days} uptime={0.997} end={new Date('2026-10-03T12:00:00Z')} label="Days" />);
    expect(caption(container)).toMatch(/Today$/);
    // The caption alone said nothing about the date: `end` is what dates the days, and the summary runs to it. Without
    // this the case passed for any `end` at all, including a wrong one, and would keep passing in 2030.
    expect(summary(container)).toMatch(/to 03 Oct 2026\./);
  });
  it('names the day a strip of complete days ends on, never Today', () => {
    const { container } = render(<UptimeBars days={days} uptime={0.997} end={new Date('2026-10-02T12:00:00Z')} endLabel="02 Oct 2026" label="Days" />);
    expect(caption(container)).toMatch(/02 Oct 2026$/);
    expect(caption(container)).not.toContain('Today');
  });
});
