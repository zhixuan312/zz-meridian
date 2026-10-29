// Named cli-* so the payload leaves it out: it is about the sample's own customer pages, which a product replaces.
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const store = vi.hoisted(() => ({ fail: new Set<string>() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/customers/northwind-labs',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
  notFound: () => { throw new Error('not found'); },
}));
// Every read of the product goes through these two: a collection in `fail` cannot be read.
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  const refuse = (name: string) => { if (store.fail.has(name)) throw new Error(`${name} is unavailable`); };
  return {
    ...real,
    read: async (name: string, q?: unknown) => { refuse(name); return real.read(name, q as never); },
    readAll: async (name: string, q?: unknown) => { refuse(name); return real.readAll(name, q as never); },
  };
});
// Each card the page draws marks where it stands; a tile marks its label too.
const mark = vi.hoisted(() => async (real: Record<string, unknown>, name: string, card: string) => {
  const { createElement } = await import('react');
  const Real = real[name] as (props: Record<string, unknown>) => ReactElement;
  const Marked = (props: Record<string, unknown>) => createElement('div', { 'data-card': card, 'data-label': card === 'metric-tile' && typeof props.label === 'string' ? props.label : '' }, createElement(Real, props));
  return { ...real, [name]: Marked };
});
vi.mock('@/components/patterns/metric-tile', async (orig) => mark(await orig(), 'MetricTile', 'metric-tile'));
vi.mock('@/components/charts/bar-list', async (orig) => mark(await orig(), 'BarList', 'bar-list'));

import CustomerPage from '../app/(dashboard)/customers/[id]/page';
import CustomerLoading from '../app/(dashboard)/customers/[id]/loading';
import RequestsPage from '../app/(dashboard)/requests/page';
import RequestPage from '../app/(dashboard)/requests/[id]/page';
import RevenuePage from '../app/(dashboard)/business/page';
import HomePage from '../app/(dashboard)/(home)/page';
import { readAll } from '@/data/read';
import { NOT_FOUND } from '@/views/not-found';
import type { CustomerRecord } from '@/data/sample';
import { servedDocument } from './served';

const OWNER = 'members_1';

beforeEach(() => { jar.value = OWNER; store.fail.clear(); });

/** A page as it is served, every boundary resolved. */
async function served(page: unknown): Promise<Document> {
  const element = (await page) as ReactElement;
  return servedDocument(element);
}
const customerPage = (id: string) => served(CustomerPage({ params: Promise.resolve({ id }) }));
const cards = (doc: Document) => [...doc.querySelectorAll('[data-card]')].map((e) => (e.getAttribute('data-label') ? `${e.getAttribute('data-card')}:${e.getAttribute('data-label')}` : e.getAttribute('data-card')));
function titled(doc: Document, title: string): Element {
  const head = [...doc.body.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent?.trim() === title);
  expect(head, title).toBeTruthy();
  return head!;
}
/** Every customer the sample keeps, by name. */
async function customers(): Promise<Map<string, CustomerRecord>> {
  jar.value = OWNER;
  const { rows } = await readAll('customers');
  return new Map((rows as CustomerRecord[]).map((c) => [c.name, c]));
}
/** Every element of `scope` whose whole text is a customer's name opens that customer's page. */
function opensEvery(scope: Element, byName: Map<string, CustomerRecord>, where: string): number {
  const named = [...scope.querySelectorAll('*')].filter((e) => e.children.length === 0 && byName.has(e.textContent?.trim() ?? ''));
  for (const e of named) {
    const c = byName.get(e.textContent!.trim())!;
    expect(e.closest('a')?.getAttribute('href'), `${where}: ${c.name}`).toBe(`/customers/${c.id}`);
  }
  return named.length;
}

describe("one customer's page", () => {
  it('for an active customer: the head, why it is worth opening, three tiles, what it asks for and its latest requests', async () => {
    const c = (await customers()).get('Northwind Labs')!;
    jar.value = OWNER;
    const doc = await customerPage(c.id);
    const masthead = doc.getElementById('content')!;
    // The head: the trail Business, Customers; the title; plan, revenue and its share, requests.
    expect(masthead.querySelector('a[href="/business"]')).toBeTruthy();
    expect(masthead.querySelector('a[href="/customers"]')).toBeTruthy();
    expect(doc.querySelector('h1')!.textContent).toMatch(/^Northwind Labs: Northwind Labs paid \$409,206\.80 in 30 days/);
    for (const said of ['Enterprise', '$409,206.80', '12.4%', '68.9M']) expect(masthead.textContent, said).toContain(said);
    // Why it is worth opening: its status, since when, its owner.
    const body = doc.querySelector('[data-page-width]')!;
    expect(body.textContent).toContain(c.owner);
    // Three tiles, then what it asks for.
    expect(cards(doc)).toEqual(['metric-tile:Requests', 'metric-tile:Paid', 'metric-tile:Error rate', 'bar-list']);
    // Its latest requests: the sampled log filtered to it, with the way to all of them.
    titled(doc, 'Its latest requests');
    expect(body.querySelector(`a[href="/requests?q=${encodeURIComponent(c.name)}"]`)).toBeTruthy();
  });

  it('for a customer past due, and one on a trial, the same parts saying since when and until when', async () => {
    const byName = await customers();
    for (const [name, says] of [['Lumen Studio', /past due since \d{2} [A-Z][a-z]{2,3} \d{4}/i], ['Brightline', /trial (that )?ends on \d{2} [A-Z][a-z]{2,3} \d{4}/i]] as const) {
      jar.value = OWNER;
      const doc = await customerPage(byName.get(name)!.id);
      expect(cards(doc), name).toEqual(['metric-tile:Requests', 'metric-tile:Paid', 'metric-tile:Error rate', 'bar-list']);
      expect(doc.querySelector('[data-page-width]')!.textContent, name).toMatch(says);
    }
  });

  it('says in one line that no sampled request is from a customer the sample holds none of', async () => {
    const quiet = [...(await customers()).values()].find((c) => c.status === 'active' && !['Northwind Labs', 'Halcyon Health', 'Atlas Freight', 'Mosaic Learning', 'Quill & Co', 'Parallax AI', 'Fernway Bank', 'Orbit Retail', 'Tessellate', 'Lumen Studio', 'Kestrel Systems', 'Brightline'].includes(c.name))!;
    jar.value = OWNER;
    const doc = await customerPage(quiet.id);
    // The reason too, so a quiet customer is not read as one the log missed: the log is a sample, and the line ends.
    expect(doc.querySelector('[data-page-width]')!.textContent).toContain(`No sampled request is from ${quiet.name}. The log keeps a sample of the requests, not every one.`);
  });

  it('draws the missing-record page for an id that names nobody', async () => {
    const doc = await customerPage('nobody-here');
    expect(doc.querySelector('h1')!.textContent).toContain(NOT_FOUND.sentence.replace(/\.$/, ''));
    expect(cards(doc)).toEqual([]);
  });
});

describe("one customer's states", () => {
  it('loading: the heading held under the feature\'s name, and the page announced as busy', () => {
    const doc = new DOMParser().parseFromString(renderToStaticMarkup(<Tooltip.Provider><CustomerLoading /></Tooltip.Provider>), 'text/html');
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1')!.textContent).toMatch(/^Customer/);
    expect(doc.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('partial: when the sampled log cannot be read, that part says so and the rest stands', async () => {
    const c = (await customers()).get('Northwind Labs')!;
    store.fail.add('requests');
    jar.value = OWNER;
    const doc = await customerPage(c.id);
    expect(cards(doc)).toContain('metric-tile:Paid');
    let card = titled(doc, 'Its latest requests').parentElement;
    while (card && !/could not be read/i.test(card.textContent ?? '')) card = card.parentElement;
    expect(card, 'the card that says so').toBeTruthy();
  });
});

describe('every customer named in the product opens its page', () => {
  it('on the request log, a request and its customer, Revenue and Home', async () => {
    const byName = await customers();
    jar.value = OWNER;
    const log = await served(RequestsPage({ searchParams: Promise.resolve({}) }));
    expect(opensEvery(log.querySelector('table tbody') ?? log.body, byName, '/requests')).toBeGreaterThan(0);
    jar.value = OWNER;
    const { rows } = await readAll('requests');
    const first = rows[0] as { id: string; customer: string };
    jar.value = OWNER;
    const one = await served(RequestPage({ params: Promise.resolve({ id: first.id }) }));
    expect(one.querySelector(`a[href="/customers/${byName.get(first.customer)!.id}"]`), first.id).toBeTruthy();
    opensEvery(one.body, byName, `/requests/${first.id}`);
    jar.value = OWNER;
    const revenue = await served(RevenuePage({ searchParams: Promise.resolve({}) }));
    expect(opensEvery(revenue.querySelector('[data-page-width]')!, byName, '/business')).toBeGreaterThanOrEqual(8);
    jar.value = OWNER;
    const home = await served(HomePage({ searchParams: Promise.resolve({}) }));
    // Home's one line naming a customer is one link, the whole sentence, to the customer it names.
    expect(home.querySelector('[data-page-width] a[href="/customers/northwind-labs"]')).toBeTruthy();
    opensEvery(home.querySelector('[data-page-width]')!, byName, '/');
  });
});
