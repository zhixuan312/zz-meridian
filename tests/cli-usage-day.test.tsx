// Named cli-* so the payload leaves it out: it is about the sample's own Usage page, which a product replaces.
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/usage',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));
// The page's Meridian marks the day it opens pointed at.
vi.mock('@/components/charts/meridian', async (orig) => {
  const real = await orig<typeof import('@/components/charts/meridian')>();
  const { createElement } = await import('react');
  const Marked = (props: Parameters<typeof real.Meridian>[0]) => createElement('div', { 'data-meridian-day': props.day ?? '' }, createElement(real.Meridian, props));
  return { ...real, Meridian: Marked };
});

import UsagePage from '../app/(dashboard)/usage/page';
import { usageTool } from '@/logic/tools';
import { servedDocument } from './cli-served';

/** Usage as it is served at an address, every boundary resolved. */
async function served(searchParams: { period?: string; day?: string }): Promise<Document> {
  const element = (await UsagePage({ searchParams: Promise.resolve(searchParams) })) as ReactElement;
  return servedDocument(element);
}

describe("Usage opens at the day its context's address names", () => {
  it('the address a pointed context names opens the page pointed at that day', async () => {
    const day = (await usageTool.read({ period: '30d' })).data.days!.series[10].date;
    const { context, data } = await usageTool.read({ period: '30d', day });
    expect(context.address).toBe(`/usage?period=30d&day=${day}`);
    expect(data.day).toBe(day);
    const doc = await served({ period: '30d', day });
    expect(doc.querySelector('[data-meridian-day]')?.getAttribute('data-meridian-day')).toBe(day);
  });

  it('opens unpointed with no day, and with a day that is not one', async () => {
    for (const searchParams of [{ period: '30d' }, { period: '30d', day: 'yesterday' }]) {
      const doc = await served(searchParams);
      expect(doc.querySelector('[data-meridian-day]')?.getAttribute('data-meridian-day'), JSON.stringify(searchParams)).toBe('');
    }
  });
});
