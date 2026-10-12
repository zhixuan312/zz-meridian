import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ replaced: [] as string[] }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/teams',
  // The router's copy of the address: it holds what the router wrote and nothing a page wrote beside it.
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ replace: (to: string) => { router.replaced.push(to); }, push() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { useQueryState } from '@/components/patterns/data-table/use-query-state';

// A key another part of the page keeps in the address without the router (a reporting period written with
// history.replaceState, so the shell reads no search params) is not this hook's to drop: a write rebuilds from the
// address the browser is at (issue #22).
describe('a view\'s state, written to the address', () => {
  beforeEach(() => { router.replaced.length = 0; window.history.replaceState(null, '', '/teams?period=30d'); });

  it('keeps a key it does not own that the router never saw', () => {
    const { result } = renderHook(() => useQueryState({ show: 'all' }));
    act(() => { result.current[1]({ show: 'waiting' }); });
    expect(router.replaced).toEqual(['/teams?period=30d&show=waiting']);
  });

  it('still leaves a key at its default out', () => {
    window.history.replaceState(null, '', '/teams?period=30d&show=waiting');
    const { result } = renderHook(() => useQueryState({ show: 'all' }));
    act(() => { result.current[1]({ show: 'all' }); });
    expect(router.replaced).toEqual(['/teams?period=30d']);
  });
});
