// This file is the team's to rewrite when the sample is replaced.
// It shows one pattern: an expected value derived from the data. The page is rendered as a request serves it, and its
// title is asserted against a figure computed over the data module's rows, never against a typed-in sentence.
import { PassThrough } from 'node:stream';
import type { ReactElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
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
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));

import HomePage from '../../app/(dashboard)/(home)/page';
import { clock, collections } from '@/data/collections';
import { formatCost } from '@/lib/format';
import { dayOf } from '@/lib/format-date';
import { against } from '@/logic/fact-insight';

/** The page as one request serves it, every boundary resolved. */
async function served(): Promise<string> {
  const element = (await HomePage({ searchParams: Promise.resolve({ period: '30d' }) })) as ReactElement;
  return new Promise<string>((resolve, reject) => {
    const out = new PassThrough();
    let html = '';
    out.on('data', (chunk) => { html += chunk; });
    out.on('end', () => resolve(html));
    const stream = renderToPipeableStream(<Tooltip.Provider>{element}</Tooltip.Provider>, { onAllReady: () => stream.pipe(out), onShellError: reject, onError: reject });
  });
}

describe("Home's title", () => {
  it('states the revenue of the last 30 days, or its change on the 30 before, as the data computes it', async () => {
    const rows = ((await collections.find((c) => c.name === 'days')!.query({})).rows as { date: string; revenue: number }[]).filter((d) => d.date < dayOf(clock()));
    const total = (from: number, to?: number) => rows.slice(from, to).reduce((sum, d) => sum + d.revenue, 0);
    const now = total(-30), before = total(-60, -30);

    const title = new DOMParser().parseFromString(await served(), 'text/html').querySelector('h1')?.textContent ?? '';
    const change = against(now, before)?.by;
    // A record is stated as the figure; otherwise the title states the change on the period before.
    expect([formatCost(now), change].filter(Boolean).some((stated) => title.includes(stated as string)), title).toBe(true);
  });
});
