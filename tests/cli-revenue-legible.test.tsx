// Named cli-* so the payload leaves it out: it is about the sample's own Revenue page, which a product replaces.
import { render, within } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/business',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { stackPart } from '@/components/charts/scale';
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

/**
 * Found by looking at the page at the end of Phase 6. A tile's note is one line: at 1440px a four-up tile holds about
 * 32 characters of it, and "against 08 Oct to 06 Nov 2025, the first 30 days kept" was cut at "the …". Who pays drew the
 * plans in other colours than the two stacked charts above and below it, and counted the trials on a plan with it, which
 * the ladder below counts apart, without saying so.
 */
describe("Revenue's page reads whole", () => {
  it("keeps every tile's note within one line of a four-up tile, at every period", () => {
    for (const period of ['7d', '30d', '90d', 'all'] as const) {
      const root = body(period);
      for (const label of ['Against a year ago', 'Best day yet', 'Past due']) {
        let tile: HTMLElement | null = within(root).getAllByText(label)[0];
        while (tile && !tile.querySelector('[data-value]')) tile = tile.parentElement;
        const note = tile!.querySelector('[data-value] ~ div [data-note]')?.textContent ?? '';
        expect(note, `${period}: ${label}`).not.toBe('');
        expect(note.length, `${period}: ${label}: ${note}`).toBeLessThanOrEqual(32);
      }
    }
  });

  it('draws Who pays in the colours the stacked charts draw each plan', () => {
    const who = card(body(), 'Who pays');
    const fills = [...who.querySelectorAll('figure > div:first-child > div')].map((d) => (d as HTMLElement).style.background);
    expect(fills).toEqual([0, 1, 2].map((k) => stackPart(k, 3)));
  });

  it('says the customers on each plan include its trials, in a label that fits a narrow legend', () => {
    const who = card(body(), 'Who pays');
    expect(who.textContent).toMatch(/trials included/);
    const labels = [...who.querySelectorAll('figcaption > div > div:first-child')].map((d) => d.textContent?.trim());
    expect(labels).toEqual(['Enterprise · 24', 'Scale · 82', 'Starter · 214']);
  });
});
