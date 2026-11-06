// @vitest-environment node
import { Tooltip } from 'radix-ui';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import CustomersPage from '../app/(dashboard)/customers/page';
import ServicesPage from '../app/(dashboard)/services/page';
import { CustomersView } from '@/views/customers';
import { hasSample } from './sample-present';

// The Customers tiles are drawn over the sample's own customers; a product that replaced the sample has none, so that
// case is not applicable there rather than failing on an absent module (#131).
type Sample = typeof import('@/system/fixtures/company');
const sample = hasSample()
  ? (await import(/* @vite-ignore */ new URL('../src/system/fixtures/company.ts', import.meta.url).pathname)) as Sample
  : null;
const CUSTOMERS = sample?.CUSTOMERS ?? [];
import { Sparkline } from '@/components/charts/sparkline';
import { served } from './served';

beforeEach(() => { jar.value = 'members_12'; });

/** The buttons a piece of markup holds, by their words. */
const buttons = (html: string) => [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]*>/g, '').trim());

describe('a control that says it did something did it', () => {
  it('Services offers no subscription: nothing would keep one, and nothing sends an update', async () => {
    const html = await served(await ServicesPage());
    // The page drew, its parts and not their placeholders: an empty page would hold no button either. Its heading holds
    // its name before the title's sentence.
    expect(html).toMatch(/<h1[^>]*>(?:<[^>]*>)*Services/);
    expect(html).toContain('Each service, 90 days');
    expect(html).toContain('Incidents');
    expect(buttons(html).filter((b) => /subscribe/i.test(b))).toEqual([]);
  });

  it.skipIf(!sample)('Customers offers no invitation: nothing would write one, and nobody would receive it', async () => {
    const html = renderToStaticMarkup(await CustomersPage());
    expect(html).toMatch(/<h1[^>]*>[^<]*Customers/);
    expect(buttons(html).filter((b) => /invite/i.test(b))).toEqual([]);
  });

  it('Customers, with no customer, promises no invitation either', () => {
    expect(renderToStaticMarkup(<Tooltip.Provider><CustomersView rows={[]} /></Tooltip.Provider>)).not.toMatch(/invite/i);
  });
});

describe.skipIf(!sample)('the Customers tiles', () => {
  it('draw a trend only for a figure a series stands behind: a count of customers and a sum of revenue have none', () => {
    const html = renderToStaticMarkup(<Tooltip.Provider><CustomersView rows={CUSTOMERS} /></Tooltip.Provider>);
    const tiles = html.slice(html.indexOf('data-split="tiles"'), html.indexOf('<table'));
    expect(tiles).toContain('Customers');
    // A sparkline is drawn as a hidden element titled with its range, at whatever height the tile gives it.
    const sparkline = /<div aria-hidden="true" title="/;
    expect(renderToStaticMarkup(<Sparkline values={[1, 2, 3]} />)).toMatch(sparkline);
    expect(tiles).not.toMatch(sparkline);
  });
});
