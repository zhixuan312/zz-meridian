// Named cli-* so the payload leaves it out: it is about the sample's own Home, which a product replaces.
import { PassThrough } from 'node:stream';
import type { ReactElement } from 'react';
import { renderToPipeableStream, renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const store = vi.hoisted(() => ({ fail: new Set<string>(), empty: new Set<string>() }));
const cfg = vi.hoisted(() => ({ share: undefined as number | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));
// Every read of the product goes through these two: a collection in `fail` cannot be read, one in `empty` holds nothing yet.
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  const refuse = (name: string) => { if (store.fail.has(name)) throw new Error(`${name} is unavailable`); };
  return {
    ...real,
    read: async (name: string, q?: unknown) => { refuse(name); return store.empty.has(name) ? { rows: [], total: 0, observedAt: new Date().toISOString() } : real.read(name, q as never); },
    readAll: async (name: string) => { refuse(name); return store.empty.has(name) ? { rows: [], observedAt: new Date().toISOString() } : real.readAll(name); },
  };
});
// The share that counts as concentration, as a test sets it; the product's own otherwise.
vi.mock('@/app.config', async (orig) => {
  const real = await orig<typeof import('@/app.config')>();
  return { ...real, facts: { ...real.facts, get concentrationAt() { return cfg.share ?? real.facts.concentrationAt; } } };
});
// Each card Home draws marks where it stands, so the order of the parts and the card each uses can be read; a tile
// marks its label too, since the tiles are told apart by it.
const mark = vi.hoisted(() => async (real: Record<string, unknown>, name: string, card: string) => {
  const { createElement } = await import('react');
  const Real = real[name] as (props: Record<string, unknown>) => ReactElement;
  const Marked = (props: Record<string, unknown>) => createElement('div', { 'data-card': card, 'data-label': card === 'metric-tile' && typeof props.label === 'string' ? props.label : '' }, createElement(Real, props));
  return { ...real, [name]: Marked };
});
vi.mock('@/components/patterns/featured-metric', async (orig) => mark(await orig(), 'FeaturedMetric', 'featured-metric'));
vi.mock('@/components/patterns/metric-tile', async (orig) => mark(await orig(), 'MetricTile', 'metric-tile'));
vi.mock('@/components/charts/column-chart', async (orig) => mark(await orig(), 'ColumnChart', 'column-chart'));
vi.mock('@/components/charts/trend-chart', async (orig) => mark(await orig(), 'TrendChart', 'trend-chart'));
vi.mock('@/components/charts/composition-bar', async (orig) => mark(await orig(), 'CompositionBar', 'composition-bar'));
vi.mock('@/components/charts/bar-list', async (orig) => mark(await orig(), 'BarList', 'bar-list'));

import HomePage from '../app/(dashboard)/(home)/page';
import HomeLoading from '../app/(dashboard)/(home)/loading';
import DashboardError from '../app/(dashboard)/error';
import { contextText } from '@/lib/shared-context';
import { homeTool } from '@/views/tools';

const PERSONAS = { owner: 'members_1', member: 'members_4' };

beforeEach(() => { jar.value = undefined; store.fail.clear(); store.empty.clear(); cfg.share = undefined; });

/** Home as it is served to a person, every boundary resolved. */
async function served(id: string, period = '30d'): Promise<Document> {
  jar.value = id;
  const element = (await HomePage({ searchParams: Promise.resolve({ period }) })) as ReactElement;
  const html = await new Promise<string>((resolve, reject) => {
    const out = new PassThrough();
    let text = '';
    out.on('data', (chunk) => { text += chunk; });
    out.on('end', () => resolve(text));
    const stream = renderToPipeableStream(<Tooltip.Provider>{element}</Tooltip.Provider>, { onAllReady: () => stream.pipe(out), onShellError: reject, onError: reject });
  });
  return new DOMParser().parseFromString(html, 'text/html');
}
/** The cards, in the order they stand, each with its label where it has one. */
const cards = (doc: Document) => [...doc.querySelectorAll('[data-card]')].map((e) => (e.getAttribute('data-label') ? `${e.getAttribute('data-card')}:${e.getAttribute('data-label')}` : e.getAttribute('data-card')));
/** The element whose whole text is `title`, and nothing inside it: a part's title. */
function titled(doc: Document, title: string | RegExp): Element {
  const head = [...doc.body.querySelectorAll('*')].find((e) => e.children.length === 0 && (typeof title === 'string' ? e.textContent?.trim() === title : title.test(e.textContent?.trim() ?? '')));
  expect(head, String(title)).toBeTruthy();
  return head!;
}
/** The part titled `title`, out to the first ancestor that holds a list: a part of the page and its lines. */
function part(doc: Document, title: string): Element {
  let el = titled(doc, title).parentElement;
  while (el && !el.querySelector('ul, ol')) el = el.parentElement;
  expect(el, title).toBeTruthy();
  return el!;
}
const lines = (el: Element) => [...el.querySelector('ul, ol')!.children];
/** Whether `a` stands before `b` in the page. */
const before = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("Home's nine parts, in order, from the sample", () => {
  it('for an Owner, each part drawn with the card the specification names', async () => {
    const doc = await served(PERSONAS.owner);
    // 1. The head: one heading, the title, and the line under it with customers, requests, margin and the services.
    const h1 = doc.querySelectorAll('h1');
    expect(h1).toHaveLength(1);
    expect(h1[0].textContent).toMatch(/^Home: The highest 30 days yet/);
    const masthead = doc.getElementById('content')!;
    for (const said of ['320', '1.1B', '62.4%', 'Inference API']) expect(masthead.textContent, said).toContain(said);
    // 2 to 7: the revenue card and its trend, the three tiles beside it, the row of four, the year's two charts, revenue a period and what we sell.
    expect(cards(doc)).toEqual([
      'featured-metric', 'trend-chart',
      'metric-tile:Customers', 'metric-tile:Tokens served', 'metric-tile:Requests',
      'metric-tile:Days inside the band', 'metric-tile:Compute in use', 'metric-tile:Compute cost', 'metric-tile:Gross margin',
      'column-chart', 'trend-chart',
      'column-chart', 'composition-bar',
    ]);
    expect(doc.querySelector('[data-card="featured-metric"]')!.textContent).toMatch(/Revenue/);
    // 5. The card that states the year.
    const year = titled(doc, /^Requests grew [\d.]+% in a year, and p95 stayed between \d+ and \d+ ?ms$/);
    // 6. A year, counted: at most five facts, each with its kind and a date, and the same line as the context's.
    const counted = part(doc, 'A year, counted');
    expect(lines(counted).length).toBeGreaterThanOrEqual(3);
    expect(lines(counted).length).toBeLessThanOrEqual(5);
    for (const li of lines(counted)) expect(li.textContent).toMatch(/\d{2} [A-Z][a-z]{2,3} \d{4}/);
    jar.value = PERSONAS.owner;
    const { context } = await homeTool.read({ period: '30d' });
    // Each fact of a year is a total, a record or a first, in the line its rule wrote: the same line is in the context.
    const facts = context.insights.map((i) => /^(?:Total|Record|First): (.*)\.$/.exec(i.text)?.[1]).filter((t): t is string => Boolean(t));
    expect(contextText(context).length).toBeLessThanOrEqual(2600);
    for (const li of lines(counted)) expect(facts.some((fact) => li.textContent!.includes(fact)), li.textContent ?? '').toBe(true);
    // 7 to 9 stand in order after it: what we sell, the two workspaces and the way into each, then worth knowing.
    const sold = titled(doc, 'What we sell');
    const business = doc.querySelector('a[href="/business"]')!;
    const engineering = doc.querySelector('a[href="/engineering"]')!;
    const worth = titled(doc, 'Worth knowing across the company');
    expect(business).toBeTruthy();
    expect(engineering).toBeTruthy();
    expect(before(year, titled(doc, 'A year, counted'))).toBe(true);
    expect(before(titled(doc, 'A year, counted'), sold)).toBe(true);
    expect(before(sold, business)).toBe(true);
    expect(before(business, engineering)).toBe(true);
    expect(before(engineering, worth)).toBe(true);
    // 9. Worth knowing: four lines in the order the specification gives, each opening the page where it is handled.
    const known = lines(part(doc, 'Worth knowing across the company'));
    expect(known).toHaveLength(4);
    expect(known[0].textContent).toMatch(/Inference API|latency/i);
    expect(known[1].textContent).toMatch(/Northwind Labs[^]*12\.4%/);
    expect(known[1].querySelector('a')?.getAttribute('href')).toBe('/customers/northwind-labs');
    expect(known[2].querySelector('a')?.getAttribute('href')).toMatch(/^\/releases/);
    expect(known[3].textContent).toMatch(/past due/i);
    expect(known[3].querySelector('a')?.getAttribute('href')).toMatch(/^\/customers/);
    for (const li of known) expect(li.querySelector('a[href]'), li.textContent ?? '').toBeTruthy();
  });

  it('for a Member, the same parts without compute cost and gross margin', async () => {
    const doc = await served(PERSONAS.member);
    expect(cards(doc)).toEqual([
      'featured-metric', 'trend-chart',
      'metric-tile:Customers', 'metric-tile:Tokens served', 'metric-tile:Requests',
      'metric-tile:Days inside the band', 'metric-tile:Compute in use',
      'column-chart', 'trend-chart',
      'column-chart', 'composition-bar',
    ]);
  });
});

describe('Home holds with more in it, by its stated rules', () => {
  it('reads the share that counts as concentration from the configuration', async () => {
    cfg.share = 0.13;
    const known = lines(part(await served(PERSONAS.owner), 'Worth knowing across the company'));
    expect(known).toHaveLength(3);
    for (const li of known) expect(li.textContent).not.toMatch(/Northwind Labs/);
  });

  it('keeps worth knowing to four lines when many customers are over the share', async () => {
    cfg.share = 0.001;
    const known = lines(part(await served(PERSONAS.owner), 'Worth knowing across the company'));
    expect(known.length).toBeLessThanOrEqual(4);
    // The largest is the one named.
    expect(known.some((li) => /Northwind Labs/.test(li.textContent ?? ''))).toBe(true);
  });

  it('keeps a year, counted to five facts at every period', async () => {
    for (const period of ['7d', '30d', '90d', 'all']) {
      expect(lines(part(await served(PERSONAS.owner, period), 'A year, counted')).length, period).toBeLessThanOrEqual(5);
    }
  });
});

describe("Home's states", () => {
  it('loading: the heading held under its name, and the page announced as busy', () => {
    const html = renderToStaticMarkup(<Tooltip.Provider><HomeLoading /></Tooltip.Provider>);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1')!.textContent).toMatch(/^Home/);
    expect(doc.querySelector('[data-title-pending]')).toBeTruthy();
    expect(doc.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('error: what failed, and Retry', () => {
    const html = renderToStaticMarkup(<Tooltip.Provider><DashboardError error={Object.assign(new Error('days'), { digest: 'd1' })} reset={() => {}} /></Tooltip.Provider>);
    expect(html).toMatch(/did not load/);
    expect(html).toMatch(/Retry/);
  });

  it('empty: nothing has arrived yet, said once, and no figure drawn as if it had', async () => {
    for (const name of ['days', 'usage', 'compute', 'costs']) store.empty.add(name);
    const doc = await served(PERSONAS.owner);
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.body.textContent).toMatch(/no requests (have arrived|yet)|nothing has arrived/i);
    expect(cards(doc)).not.toContain('featured-metric');
  });

  it('partial: a read that failed leaves its part saying so, and the rest stands', async () => {
    store.fail.add('usage');
    const doc = await served(PERSONAS.owner);
    expect(cards(doc)).toContain('featured-metric');
    expect(cards(doc)).not.toContain('composition-bar');
    let card = titled(doc, 'What we sell').parentElement;
    while (card && !/could not be read/i.test(card.textContent ?? '')) card = card.parentElement;
    expect(card, 'the card that says so').toBeTruthy();
    expect(card!.contains(doc.querySelector('[data-card="featured-metric"]'))).toBe(false);
    expect(lines(part(doc, 'Worth knowing across the company')).length).toBeGreaterThan(0);
  });
});
