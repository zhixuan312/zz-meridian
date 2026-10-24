// Named cli-* so the payload leaves it out: it is about the sample's own Revenue page, which a product replaces.
import { PassThrough } from 'node:stream';
import type { ReactElement } from 'react';
import { renderToPipeableStream, renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const store = vi.hoisted(() => ({ fail: new Set<string>(), empty: new Set<string>() }));
const cfg = vi.hoisted(() => ({ nextPlanAt: undefined as number | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/business',
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
    readAll: async (name: string, q?: unknown) => { refuse(name); return store.empty.has(name) ? { rows: [], observedAt: new Date().toISOString() } : real.readAll(name, q as never); },
  };
});
// The share that puts a customer close to the next plan, as a test sets it; the product's own otherwise.
vi.mock('@/app.config', async (orig) => {
  const real = await orig<typeof import('@/app.config')>();
  return { ...real, facts: { ...real.facts, get nextPlanAt() { return cfg.nextPlanAt ?? real.facts.nextPlanAt; } } };
});
// Each card the page draws marks where it stands; a tile marks its label too, since the tiles are told apart by it.
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

import RevenuePage from '../app/(dashboard)/business/page';
import RevenueLoading from '../app/(dashboard)/business/loading';
import { facts } from '@/app.config';
import { contextText } from '@/lib/shared-context';
import { revenueTool } from '@/logic/tools';

const OWNER = 'members_1';

beforeEach(() => { jar.value = undefined; store.fail.clear(); store.empty.clear(); cfg.nextPlanAt = undefined; });

/** Revenue as it is served to a person, every boundary resolved. */
async function served(period = '30d', id = OWNER): Promise<Document> {
  jar.value = id;
  const element = (await RevenuePage({ searchParams: Promise.resolve({ period }) })) as ReactElement;
  const html = await new Promise<string>((resolve, reject) => {
    const out = new PassThrough();
    let text = '';
    out.on('data', (chunk) => { text += chunk; });
    out.on('end', () => resolve(text));
    // Every boundary written in place, as the page reads once a browser has run its scripts: a large boundary is otherwise
    // written after the root, outside the frame, and its fallback stands where it will be.
    const stream = renderToPipeableStream(<Tooltip.Provider>{element}</Tooltip.Provider>, { onAllReady: () => stream.pipe(out), onShellError: reject, onError: reject, progressiveChunkSize: Infinity });
  });
  return new DOMParser().parseFromString(html, 'text/html');
}
const cards = (doc: Document) => [...doc.querySelectorAll('[data-card]')].map((e) => (e.getAttribute('data-label') ? `${e.getAttribute('data-card')}:${e.getAttribute('data-label')}` : e.getAttribute('data-card')));
/** The element whose whole text is `title`, and nothing inside it: a part's title. */
function titled(doc: Document, title: string): Element {
  const head = [...doc.body.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent?.trim() === title);
  expect(head, title).toBeTruthy();
  return head!;
}
/** A part: from its title out to the first ancestor that holds `inner`. */
function part(doc: Document, title: string, inner = 'ul, ol'): Element {
  let el = titled(doc, title).parentElement;
  while (el && !el.querySelector(inner)) el = el.parentElement;
  expect(el, title).toBeTruthy();
  return el!;
}
const STAGES = ['On a trial', 'Starter', 'Scale', 'Enterprise'];
/** The part titled "From a trial to Enterprise": out to the ancestor that holds the four stages' lists. */
function ladder(doc: Document): Element {
  let el = titled(doc, 'From a trial to Enterprise').parentElement;
  while (el && !STAGES.every((s) => el!.querySelector(`ul[aria-label="${s}"]`))) el = el.parentElement;
  expect(el, 'From a trial to Enterprise').toBeTruthy();
  return el!;
}
const NEXT_PLAN = /(of what|already pays more than) the smallest (Starter|Scale|Enterprise) customer/;

describe("Revenue's eight parts, in order, from the sample", () => {
  it('draws each part with the card the specification names', async () => {
    const doc = await served();
    // 1. The head: one heading, the title, the period control.
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1')!.textContent).toMatch(/^Revenue: All 24 Enterprise customers sent more this week than last/);
    expect(doc.querySelector('[role="radiogroup"][aria-label="Reporting period"]')).toBeTruthy();
    const all = cards(doc);
    // 2. The Featured metric, first after the head: the period's revenue, with revenue a day as its chart, beside three tiles.
    expect(all.slice(0, 5)).toEqual(['featured-metric', 'trend-chart', 'metric-tile:Against a year ago', 'metric-tile:Best day yet', 'metric-tile:Past due']);
    const featured = doc.querySelector('[data-card="featured-metric"]')!;
    expect(featured.textContent).toContain('$3,300,438.74');
    expect(featured.contains(doc.querySelector('[data-card="trend-chart"]'))).toBe(true);
    // 3. Revenue a day by plan beside who pays; 4. revenue a period, by plan.
    expect(all.slice(5, 8)).toEqual(['trend-chart', 'composition-bar', 'column-chart']);
    // 5. Every customer, the last 14 days: eight compact tiles, the largest first.
    const wall = all.slice(8, 16);
    expect(wall).toHaveLength(8);
    for (const t of wall) expect(t).toMatch(/^metric-tile:/);
    expect(wall[0]).toBe('metric-tile:Northwind Labs');
    // 6. From a trial to Enterprise: a Bar list a stage; 8. what they buy beside where they are.
    expect(all.slice(16)).toEqual(['bar-list', 'bar-list', 'bar-list', 'bar-list', 'bar-list', 'bar-list']);
    // The parts' titles stand in the specification's order.
    const titles = ['Who pays', 'Every customer, the last 14 days', 'From a trial to Enterprise', 'Worth a look', 'What they buy', 'Where they are'].map((t) => titled(doc, t));
    for (let i = 1; i < titles.length; i++) expect(Boolean(titles[i - 1].compareDocumentPosition(titles[i]) & Node.DOCUMENT_POSITION_FOLLOWING), titles[i].textContent ?? '').toBe(true);
  });

  it('opens every customer the wall names, offers three orders, counts who sent more and links to every customer', async () => {
    const doc = await served();
    const wall = part(doc, 'Every customer, the last 14 days', '[data-card="metric-tile"]');
    const tiles = [...wall.querySelectorAll('[data-card="metric-tile"]')];
    expect(tiles).toHaveLength(8);
    for (const tile of tiles) {
      const link = tile.closest('a[href^="/customers/"]') ?? tile.querySelector('a[href^="/customers/"]');
      expect(link, tile.getAttribute('data-label') ?? '').toBeTruthy();
    }
    const orders = [...wall.querySelectorAll('[role="radio"]')].map((r) => r.textContent?.trim());
    expect(orders).toEqual(['Largest', 'Fell this week', 'Growing fastest']);
    expect(wall.textContent).toMatch(/\d+ of \d+ sent more this week than last/);
    expect(wall.querySelector('a[href="/customers"]')).toBeTruthy();
  });

  it('shows two customers a stage and folds the rest, each customer opening its page', async () => {
    const doc = await served();
    const steps = ladder(doc);
    for (const stage of STAGES) {
      const list = steps.querySelector(`ul[aria-label="${stage}"]`);
      expect(list, stage).toBeTruthy();
      const rows = [...list!.children];
      expect(rows.length, stage).toBeLessThanOrEqual(3);
      const named = rows.filter((r) => r.querySelector('a[href^="/customers/"]'));
      expect(named.length, stage).toBeGreaterThanOrEqual(1);
      expect(named.length, stage).toBeLessThanOrEqual(2);
      if (rows.length === 3) expect(rows[2].textContent, stage).toMatch(/\d+ others/);
    }
    // The card's line counts who joined, who moved up and who left in the window it names.
    expect(steps.textContent).toMatch(/joined/);
    expect(steps.textContent).toMatch(/moved up/);
    expect(steps.textContent).toMatch(/left/);
  });

  it('holds worth a look to four lines, the customers past due first', async () => {
    const doc = await served();
    const lines = [...part(doc, 'Worth a look').querySelector('ul, ol')!.children];
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines.length).toBeLessThanOrEqual(4);
    expect(lines[0].textContent).toMatch(/past due/i);
  });
});

describe("Revenue's period control", () => {
  it('moves what is read from the daily records and no card about customers', async () => {
    const [week, month] = [await served('7d'), await served('30d')];
    const tile = (doc: Document) => doc.querySelector('[data-card="featured-metric"]')!.textContent;
    expect(tile(week)).not.toBe(tile(month));
    for (const title of ['Every customer, the last 14 days']) expect(part(week, title, '[data-card]').textContent).toBe(part(month, title, '[data-card]').textContent);
    expect(ladder(week).textContent).toBe(ladder(month).textContent);
  });
});

describe("Revenue's context", () => {
  it('fits its budget at every period', async () => {
    for (const period of ['7d', '30d', '90d', 'all'] as const) {
      jar.value = OWNER;
      const { context } = await revenueTool.read({ period });
      expect(contextText(context).length, period).toBeLessThanOrEqual(2600);
    }
  });
});

describe('the share that puts a customer close to the next plan', () => {
  it('is the configuration', () => {
    expect(facts.nextPlanAt).toBe(0.75);
  });

  it('says a customer is close to the next plan only at or over that share', async () => {
    cfg.nextPlanAt = 0.000001;
    expect(ladder(await served()).textContent).toMatch(NEXT_PLAN);
    cfg.nextPlanAt = 1000;
    expect(ladder(await served()).textContent).not.toMatch(NEXT_PLAN);
  });
});

describe("Revenue's states", () => {
  it('loading: the heading held under its name, and the page announced as busy', () => {
    const doc = new DOMParser().parseFromString(renderToStaticMarkup(<Tooltip.Provider><RevenueLoading /></Tooltip.Provider>), 'text/html');
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1')!.textContent).toMatch(/^Revenue/);
    expect(doc.querySelector('[data-title-pending]')).toBeTruthy();
    expect(doc.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('empty: nothing has arrived yet, said once, and no figure drawn as if it had', async () => {
    for (const name of ['days', 'customers', 'usage']) store.empty.add(name);
    const doc = await served();
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.body.textContent).toMatch(/no customers yet|nothing has arrived|no revenue yet/i);
    expect(cards(doc)).not.toContain('trend-chart');
  });

  it('partial: a read that failed leaves its part saying so, and the rest stands', async () => {
    store.fail.add('usage');
    const doc = await served();
    expect(cards(doc)).toContain('column-chart');
    let card = titled(doc, 'What they buy').parentElement;
    while (card && !/could not be read/i.test(card.textContent ?? '')) card = card.parentElement;
    expect(card, 'the card that says so').toBeTruthy();
    expect(card!.contains(doc.querySelector('[data-card="column-chart"]'))).toBe(false);
  });
});
