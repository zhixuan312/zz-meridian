// Named cli-* so the payload leaves it out: it is about the sample's own Revenue page, which a product replaces.
import { render, within } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/business',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import type { Period } from '@/lib/period';
import { CUSTOMERS, DAYS, REGIONS, USAGE, demoSeries, demoTotals } from '@/system/fixtures/company';
import { MODELS } from '@/system/fixtures/sample';
import { RevenueBody } from '@/views/revenue';
import { revenueData } from '@/logic/revenue-parts';

/** Revenue's body as its read builds it from the sample. */
function body(period: Period = '30d') {
  const { current, running } = demoSeries(period);
  const data = revenueData({ period, days: { series: current, totals: demoTotals(period), running }, history: DAYS, customers: CUSTOMERS, usage: USAGE, models: MODELS, regions: REGIONS, updatedAt: '2026-10-03T08:56:00Z', now: '2026-10-03T09:00:00Z' });
  return render(<Tooltip.Provider><RevenueBody {...data} /></Tooltip.Provider>).container;
}
const card = (root: HTMLElement, title: string) => {
  let el: HTMLElement | null = within(root).getByText(title, { selector: 'h2' });
  while (el && !el.querySelector('figure')) el = el.parentElement;
  return el!;
};

describe("Revenue's page reads whole", () => {

  it('says the customers on each plan include its trials, in a label that fits a narrow legend', () => {
    const who = card(body(), 'Who pays');
    expect(who.textContent).toMatch(/trials included/);
    const labels = [...who.querySelectorAll('figcaption > div > div:first-child')].map((d) => d.textContent?.trim());
    expect(labels).toEqual(['Enterprise · 24', 'Scale · 82', 'Starter · 214']);
  });
});
