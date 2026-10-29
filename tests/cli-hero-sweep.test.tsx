// Named cli-* so the payload leaves it out: it is about the sample's own front door.
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hero } from '@/system/hero';
import { demoSeries } from '@/system/fixtures/company';

const series = demoSeries('30d').current;

// jsdom has no matchMedia; the sweep asks it whether the person has asked for less motion.
window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;

/**
 * The front door's demonstration sweeps the cursor once and rests. Its two timers are the effect's: a start it held, and
 * an interval the start created. The cleanup cleared only the start, so a page left mid-sweep kept ticking from a
 * component that no longer existed.
 */
describe('the front door’s sweep', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('is over when the page it belongs to is gone', () => {
    vi.useFakeTimers();
    const { unmount } = render(<Hero series={series} routes={[]} />);
    act(() => { vi.advanceTimersByTime(1200); });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
