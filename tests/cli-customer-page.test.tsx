// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own page, which a product replaces.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const spy = vi.hoisted(() => ({ reads: [] as string[] }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/customers/nobody-here',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));
// A policy holding only `days:read` makes the refusal reachable, as in tests/page-gates.test.tsx.
vi.mock('@/data/roles', async (orig) => {
  const real = await orig<typeof import('@/data/roles')>();
  const GRANTS = { ...real.GRANTS, Viewer: ['days:read'] } as unknown as typeof real.GRANTS;
  const effective = (role: Parameters<typeof real.effective>[0], addOns: Parameters<typeof real.effective>[1]) =>
    new Set([...GRANTS[role], ...addOns.flatMap((addOn) => GRANTS[addOn])]);
  return { ...real, GRANTS, effective };
});
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  return { ...real, read: async (name: string, q?: unknown) => { spy.reads.push(name); return real.read(name, q as never); } };
});

import CustomerPage, { generateMetadata } from '../app/(dashboard)/customers/[id]/page';
import RevenuePage from '../app/(dashboard)/business/page';

beforeEach(() => { jar.value = undefined; spy.reads.length = 0; });

// The root layout's providers hold the tooltips' one provider, which a page drawn alone has to be given.
const markup = async (node: Promise<unknown>) => renderToStaticMarkup(<Tooltip.Provider>{(await node) as never}</Tooltip.Provider>);
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("a customer's page", () => {
  it('draws the customer for a person who may read customers', async () => {
    jar.value = 'members_1';
    const html = await markup(CustomerPage(params('northwind-labs')));
    expect(html).toContain('Northwind Labs');
    expect(html).not.toContain('data-no-access');
    expect(await generateMetadata(params('northwind-labs'))).toEqual({ title: 'Northwind Labs' });
  });

  it('draws a customer that has left as a record with its status and nothing counted', async () => {
    jar.value = 'members_1';
    const html = await markup(CustomerPage(params('ambervale-motors')));
    expect(html).toContain('Ambervale Motors');
    expect(html).toMatch(/>Left on \d{2} [A-Z][a-z]{2,3} \d{4}</);
    // Its 30 days hold nothing: no requests and no revenue, drawn as zeros and never as a dash or a blank.
    const text = html.replace(/<[^>]*>/g, ' ');
    expect(text).toMatch(/Scale · \$0 in 30 days · 0\.0% of revenue · 0 requests/);
    expect(text).toMatch(/Requests\s+0\s/);
    expect(text).toMatch(/Paid\s+\$\s*0\s/);
    // Fourteen days of nothing still draw: a flat line, and no figure that is not a number.
    expect(html).not.toMatch(/NaN|Infinity/);
    expect(await generateMetadata(params('ambervale-motors'))).toEqual({ title: 'Ambervale Motors' });
  });

  it('draws the missing-record page in the first HTML for an id that names no customer', async () => {
    jar.value = 'members_1';
    const html = await markup(CustomerPage(params('nobody-here')));
    expect(html).not.toContain('Northwind Labs');
    expect(html).toContain('nobody-here');
    expect(await generateMetadata(params('nobody-here'))).toEqual({ title: 'Not found', robots: { index: false } });
  });

  it('refuses a person who may not read customers before any read, and tells their metadata nothing about the record', async () => {
    jar.value = 'members_12';
    expect(await markup(CustomerPage(params('northwind-labs')))).toContain('data-no-access');
    expect(await markup(RevenuePage())).toContain('data-no-access');
    expect(await generateMetadata(params('northwind-labs'))).toEqual({ title: 'Customer' });
    expect(spy.reads).toEqual([]);
  });
});
