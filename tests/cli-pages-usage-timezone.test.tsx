// Named cli-* so the payload leaves it out: it is about the sample's own Usage page, which a product replaces.
import { fireEvent, render, screen } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/usage',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));
// A product that reports in its own zone: its days are cut at that midnight, and so are its hours.
vi.mock('@/app.config', async (orig) => {
  const real = await orig<typeof import('@/app.config')>();
  return { ...real, app: { ...real.app, timezone: 'Asia/Singapore' } };
});

import { contextText } from '@/lib/shared-context';
import { UsageBody } from '@/views/usage';
import { usageContext } from '@/views/usage-context';
import { usageTool } from '@/views/tools';
import { usageExplore } from '@/views/usage-explore';

describe("Usage names the product's reporting timezone wherever it names a zone", () => {
  it('in the cards, the Heatmap of hours and the context, never UTC', async () => {
    const { data } = await usageTool.read({ period: '30d' });
    const { container } = render(<Tooltip.Provider><UsageBody {...data} /></Tooltip.Provider>);
    expect(container.textContent).toMatch(/Every weekday summed, Asia\/Singapore, over the last 30 complete days/);
    fireEvent.click(screen.getByRole('radio', { name: 'By weekday and hour' }));
    expect(container.textContent).toMatch(/Each weekday and hour, Asia\/Singapore, over the last 30 complete days/);
    expect(container.querySelector('figure[aria-label="Requests by weekday and hour"] thead th')).toHaveTextContent('Day (Asia/Singapore)');
    expect(container.textContent).not.toMatch(/UTC/);
    const context = contextText(usageContext(data));
    expect(context).toMatch(/Asia\/Singapore/);
    expect(context).not.toMatch(/UTC/);
  });

  it("in Usage's prepared query, whose hours and their measure say the same zone", () => {
    const hours = usageExplore.sources.hours;
    expect(hours.labels?.hour['22']).toBe('22:00 Asia/Singapore');
    expect(hours.measures.requests.definition).toMatch(/Asia\/Singapore hour/);
    expect(JSON.stringify(hours)).not.toMatch(/UTC/);
  });
});
