import { Suspense } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/base/shell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

/**
 * The first page of a visit rises into place, as feedback that it arrived. A reader who has already watched a skeleton
 * for longer than the arrival lasts gets no feedback from it, only a later page: on a slow phone the rise held the
 * page's own text back by its whole length, and that text was the largest paint (issue #21). So the wait decides: a
 * page that took longer to arrive than its arrival lasts is drawn where it ends.
 */
const shell = () => (
  <Suspense fallback={null}>
    <AppShell rail={<p>The rail</p>} assistant={Promise.resolve(false)}><p>The page</p></AppShell>
  </Suspense>
);

describe('the first page of a visit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.documentElement.style.setProperty('--dur-grow', '820ms');
    document.documentElement.style.setProperty('--dur-enter', '.32s');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty('--dur-grow');
    document.documentElement.style.removeProperty('--dur-enter');
  });

  it('arrives with its motion when it was there quickly', async () => {
    vi.spyOn(performance, 'now').mockReturnValue(400);
    const { container } = await act(async () => render(shell()));
    expect(container.querySelector('main')!.hasAttribute('data-still')).toBe(false);
  });

  it('is drawn where it ends when the reader waited longer than the arrival lasts, and later changes animate again', async () => {
    vi.spyOn(performance, 'now').mockReturnValue(2200);
    const { container } = await act(async () => render(shell()));
    const main = container.querySelector('main')!;
    expect(main.hasAttribute('data-still')).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    expect(main.hasAttribute('data-still')).toBe(false);
  });
});
