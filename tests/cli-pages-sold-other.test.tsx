// Named cli-* so the payload leaves it out: it is about the sample's own Home, which a product replaces.
import { renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));
// The sample sells four models; this product sells six: two more, each billed half of what Meridian Embed is, day by day.
const MORE = [{ id: 'meridian-mini', label: 'Meridian Mini' }, { id: 'meridian-tiny', label: 'Meridian Tiny' }];
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  return {
    ...real,
    readAll: async (name: string, q?: unknown) => {
      const answer = await real.readAll(name, q as never);
      if (name === 'models') return { ...answer, rows: [...answer.rows, ...MORE.map((m) => ({ ...m, serves: '/v1/messages', inputPrice: 0.2, outputPrice: 1, callPrice: null }))] };
      if (name === 'usage') {
        const embed = (answer.rows as { id: string; model: string; revenue: number }[]).filter((u) => u.model === 'meridian-embed');
        return { ...answer, rows: [...answer.rows, ...MORE.flatMap((m) => embed.map((u) => ({ ...u, id: `${u.id}-${m.id}`, model: m.id, revenue: u.revenue / 2 })))] };
      }
      return answer;
    },
  };
});

import { formatPercent } from '@/lib/format';
import { HomeBody } from '@/views/home';
import { homeTool } from '@/logic/tools';

describe('What we sell, with more models than the bar has slots', () => {
  it('folds the rest into one Other part, and the page and the context state the same shares of the whole', async () => {
    const { data, context } = await homeTool.read({ period: '30d' });
    const sold = data.sold!;
    expect(sold.map((m) => m.label)).toHaveLength(5);
    expect(sold.at(-1)!.label).toBe('Other');
    // Every model is in a part: the parts add up to the whole, and their shares to one.
    expect(sold.reduce((a, m) => a + m.share, 0)).toBeCloseTo(1, 9);

    const doc = new DOMParser().parseFromString(renderToStaticMarkup(<Tooltip.Provider><HomeBody {...data} /></Tooltip.Provider>), 'text/html');
    const bar = doc.querySelector('figure[aria-label="Revenue by model"]')!;
    const legend = [...bar.querySelectorAll('figcaption > div')].map((d) => ({ label: d.children[0].textContent, share: parseFloat(d.children[1].children[0].textContent!) }));
    expect(legend.map((l) => l.label)).toEqual(sold.map((m) => m.label));
    // The bar writes a share of a tenth or more to the whole percent: each is within its rounding of the context's.
    for (const [i, l] of legend.entries()) expect(Math.abs(l.share - sold[i].share * 100), l.label!).toBeLessThanOrEqual(0.5);

    const stated = context.facts.find((f) => f.label === 'What we sell')!.value;
    expect(stated).toBe(sold.map((m) => `${m.label} ${formatPercent(m.share, 1)}`).join(', '));
  });
});
