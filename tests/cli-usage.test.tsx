// Named cli-* so the payload leaves it out: it is about the sample's own Usage page, which a product replaces.
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const store = vi.hoisted(() => ({ fail: new Set<string>(), empty: new Set<string>() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/usage',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));
// Every read of Usage goes through these two: a collection in `fail` cannot be read, one in `empty` holds nothing yet.
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  // The real read stamps `observedAt` from `clock()`, the sample's frozen now, never the wall clock: a freshness label
  // built from `new Date()` here read differently on every run.
  const { clock } = await import('@/data/collections');
  const at = () => clock().toISOString();
  const refuse = (name: string) => { if (store.fail.has(name)) throw new Error(`${name} is unavailable`); };
  return {
    ...real,
    read: async (name: string, q?: unknown) => { refuse(name); return store.empty.has(name) ? { rows: [], total: 0, observedAt: at() } : real.read(name, q as never); },
    readAll: async (name: string, q?: unknown) => { refuse(name); return store.empty.has(name) ? { rows: [], observedAt: at() } : real.readAll(name, q as never); },
  };
});
// Each card the page draws marks where it stands; a Heatmap marks its form, its scale and whether it joins the Meridian.
const mark = vi.hoisted(() => async (real: Record<string, unknown>, name: string, card: string) => {
  const { createElement } = await import('react');
  const Real = real[name] as (props: Record<string, unknown>) => ReactElement;
  const Marked = (props: Record<string, unknown>) => {
    const label = card === 'heatmap' ? [props.days ? 'calendar' : 'hours', props.scale ?? 'max', props.meridian ? 'meridian' : ''].filter(Boolean).join(':') : '';
    return createElement('div', { 'data-card': card, 'data-label': label }, createElement(Real, props));
  };
  return { ...real, [name]: Marked };
});
vi.mock('@/components/patterns/metric-tile', async (orig) => mark(await orig(), 'MetricTile', 'metric-tile'));
vi.mock('@/components/charts/column-chart', async (orig) => mark(await orig(), 'ColumnChart', 'column-chart'));
vi.mock('@/components/charts/trend-chart', async (orig) => mark(await orig(), 'TrendChart', 'trend-chart'));
vi.mock('@/components/charts/composition-bar', async (orig) => mark(await orig(), 'CompositionBar', 'composition-bar'));
vi.mock('@/components/charts/bar-list', async (orig) => mark(await orig(), 'BarList', 'bar-list'));
vi.mock('@/components/charts/heatmap', async (orig) => mark(await orig(), 'Heatmap', 'heatmap'));
vi.mock('@/components/patterns/featured-metric', async (orig) => mark(await orig(), 'FeaturedMetric', 'featured-metric'));

import UsagePage from '../app/(dashboard)/usage/page';
import UsageLoading from '../app/(dashboard)/usage/loading';
import { servedDocument } from './served';

const OWNER = 'members_1';

beforeEach(() => { jar.value = OWNER; store.fail.clear(); store.empty.clear(); });

/** Usage as it is served, every boundary resolved. */
async function served(period = '30d'): Promise<Document> {
  jar.value = OWNER;
  const element = (await UsagePage({ searchParams: Promise.resolve({ period }) })) as ReactElement;
  return servedDocument(element);
}
const cards = (root: ParentNode) => [...root.querySelectorAll('[data-card]')].map((e) => (e.getAttribute('data-label') ? `${e.getAttribute('data-card')}:${e.getAttribute('data-label')}` : e.getAttribute('data-card')));
function titled(root: ParentNode, title: string): Element {
  const head = [...root.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent?.trim() === title);
  expect(head, title).toBeTruthy();
  return head!;
}
/** A part: from its title out to the first ancestor that holds `inner`. */
function part(root: ParentNode, title: string, inner = 'ul, ol'): Element {
  let el = titled(root, title).parentElement;
  while (el && !el.querySelector(inner)) el = el.parentElement;
  expect(el, title).toBeTruthy();
  return el!;
}

describe("Usage's figures from the sample", () => {
  it('announces the period and shows its requests and dated findings', async () => {
    const doc = await served();
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1')!.textContent).toMatch(/^Usage: 1\.1B requests in 30 days/);
    expect(doc.querySelector('[role="radiogroup"][aria-label="Reporting period"]')).toBeTruthy();
    const featured = doc.querySelector('[data-card="featured-metric"]')!;
    expect(featured.textContent).toContain('1.1B');
    // The calendar names the busiest day as its badge.
    expect(part(doc, 'A year of requests, a day a cell', '[data-card="heatmap"]').textContent).toMatch(/Busiest[^]*01 Oct/);
    // At most three facts about the period, each with its date.
    const facts = [...part(doc, 'The period, counted').querySelector('ul, ol')!.children];
    expect(facts.length).toBeGreaterThanOrEqual(1);
    expect(facts.length).toBeLessThanOrEqual(3);
    for (const li of facts) expect(li.textContent).toMatch(/\d{2} [A-Z][a-z]{2,3} \d{4}/);
    // What is asked for: the five largest endpoints and the rest in one row.
    const asked = [...part(doc, 'What is asked for', 'ul[aria-label]').querySelector('ul[aria-label]')!.children];
    expect(asked).toHaveLength(6);
    expect(asked[5].textContent).toMatch(/2 others/);
  });

});

describe("Usage's states", () => {
  it('loading: the heading held under its name, and the page announced as busy', () => {
    const doc = new DOMParser().parseFromString(renderToStaticMarkup(<Tooltip.Provider><UsageLoading /></Tooltip.Provider>), 'text/html');
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1')!.textContent).toMatch(/^Usage/);
    expect(doc.querySelector('[data-title-pending]')).toBeTruthy();
    expect(doc.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('empty: nothing has arrived yet, said once, and no figure drawn as if it had', async () => {
    for (const name of ['days', 'hours', 'regions', 'endpoints', 'responses']) store.empty.add(name);
    const doc = await served();
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.body.textContent).toMatch(/no requests (have arrived|yet)|nothing has arrived/i);
    expect(cards(doc)).not.toContain('trend-chart');
  });

  it('partial: a read that failed leaves its part saying so, and the rest stands', async () => {
    store.fail.add('responses');
    const doc = await served();
    expect(cards(doc)).toContain('trend-chart');
    expect(cards(doc)).not.toContain('composition-bar');
    let card = titled(doc, 'How it was answered').parentElement;
    while (card && !/could not be read/i.test(card.textContent ?? '')) card = card.parentElement;
    expect(card, 'the card that says so').toBeTruthy();
    expect(card!.contains(doc.querySelector('[data-card="trend-chart"]'))).toBe(false);
  });
});
