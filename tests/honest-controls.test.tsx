// @vitest-environment node
import { PassThrough } from 'node:stream';
import { Tooltip } from 'radix-ui';
import type { ReactElement } from 'react';
import { renderToPipeableStream, renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace() {}, push() {}, refresh() {} }),
}));

import CustomersPage from '../app/(dashboard)/customers/page';
import ServicesPage from '../app/(dashboard)/services/page';
import * as customers from '@/views/customers';
import { CustomersView } from '@/views/customers';
import * as services from '@/views/services';
import { CUSTOMERS } from '@/system/fixtures/company';

beforeEach(() => { jar.value = 'members_12'; });

/** A page as it is served, every boundary resolved: its parts stream in behind its masthead. */
async function served(page: Promise<unknown>): Promise<string> {
  const element = (await page) as ReactElement;
  return new Promise<string>((resolve, reject) => {
    const out = new PassThrough();
    let text = '';
    out.on('data', (chunk) => { text += chunk; });
    out.on('end', () => resolve(text));
    const stream = renderToPipeableStream(<Tooltip.Provider>{element}</Tooltip.Provider>, { onAllReady: () => stream.pipe(out), onShellError: reject, onError: reject, progressiveChunkSize: Infinity });
  });
}

/** The buttons a piece of markup holds, by their words. */
const buttons = (html: string) => [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]*>/g, '').trim());

describe('a control that says it did something did it', () => {
  it('Services offers no subscription: nothing would keep one, and nothing sends an update', async () => {
    const html = await served(ServicesPage());
    // The page drew, its parts and not their placeholders: an empty page would hold no button either. Its heading holds
    // its name before the title's sentence.
    expect(html).toMatch(/<h1[^>]*>(?:<[^>]*>)*Services/);
    expect(html).toContain('Each service, 90 days');
    expect(html).toContain('Incidents');
    expect(buttons(html).filter((b) => /subscribe/i.test(b))).toEqual([]);
    expect(Object.keys(services)).not.toContain('SubscribeButton');
  });

  it('Customers offers no invitation: nothing would write one, and nobody would receive it', async () => {
    const html = renderToStaticMarkup(await CustomersPage());
    expect(html).toMatch(/<h1[^>]*>[^<]*Customers/);
    expect(buttons(html).filter((b) => /invite/i.test(b))).toEqual([]);
    expect(Object.keys(customers)).not.toContain('InviteCustomer');
  });

  it('Customers, with no customer, promises no invitation either', () => {
    expect(renderToStaticMarkup(<Tooltip.Provider><CustomersView rows={[]} /></Tooltip.Provider>)).not.toMatch(/invite/i);
  });
});

describe('the Customers tiles', () => {
  it('draw a trend only for a figure a series stands behind: a count of customers and a sum of revenue have none', () => {
    const html = renderToStaticMarkup(<Tooltip.Provider><CustomersView rows={CUSTOMERS} /></Tooltip.Provider>);
    const tiles = html.slice(html.indexOf('data-split="tiles"'), html.indexOf('<table'));
    expect(tiles).toContain('Customers');
    // A tile's sparkline is the one element in the row with a height of its own.
    expect(tiles).not.toMatch(/style="height:\s*40px/);
  });
});
