// The wall's order is view state, and `docs/surfaces.md`'s "Addressable" rule says every view's state is in its address:
// the period, filters, the selected record, the sort, the page. The wall's order was local state, so a link did not open
// the same view, a reload lost it, and an agent could name neither. Measured on the 0.39.8 build.
import { render } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

const url = vi.hoisted(() => ({ params: new URLSearchParams(), replaced: [] as string[] }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/business',
  useSearchParams: () => url.params,
  useRouter: () => ({ replace: (to: string) => url.replaced.push(to), push() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { CUSTOMERS, DAYS, REGIONS, USAGE, demoSeries, demoTotals } from '@/system/fixtures/company';
import { MODELS } from '@/system/fixtures/sample';
import { RevenueBody } from '@/views/revenue';
import { revenueData } from '@/logic/revenue-parts';

function body() {
  const { current, running } = demoSeries('30d');
  const data = revenueData({ period: '30d', days: { series: current, totals: demoTotals('30d'), running }, history: DAYS, customers: CUSTOMERS, usage: USAGE, models: MODELS, regions: REGIONS, updatedAt: '2026-10-03T08:56:00Z', now: '2026-10-03T09:00:00Z' });
  return render(<Tooltip.Provider><RevenueBody {...data} /></Tooltip.Provider>);
}

describe('the wall’s order', () => {
  it('is read from the address, so a link opens the order it names', () => {
    url.params = new URLSearchParams('order=fell');
    const { getByRole } = body();
    expect(getByRole('radio', { name: 'Fell this week' }).getAttribute('aria-checked')).toBe('true');
  });

  it('falls back to the largest when the address names no order or one it does not know', () => {
    for (const q of ['', 'order=nonsense']) {
      url.params = new URLSearchParams(q);
      const { getByRole, unmount } = body();
      expect(getByRole('radio', { name: 'Largest' }).getAttribute('aria-checked')).toBe('true');
      unmount();
    }
  });
});
