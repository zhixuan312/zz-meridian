// Named cli-* so the payload leaves it out: it is about the sample's own Usage page, which a product replaces.
import { fireEvent, render, within } from '@testing-library/react';
import { PassThrough } from 'node:stream';
import type { ReactElement } from 'react';
import { renderToPipeableStream, renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const store = vi.hoisted(() => ({ fail: new Set<string>(), empty: new Set<string>() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/usage',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));
// Every read of Usage goes through these two: a collection in `fail` cannot be read, one in `empty` holds nothing yet.
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  const refuse = (name: string) => { if (store.fail.has(name)) throw new Error(`${name} is unavailable`); };
  return {
    ...real,
    read: async (name: string, q?: unknown) => { refuse(name); return store.empty.has(name) ? { rows: [], total: 0, observedAt: new Date().toISOString() } : real.read(name, q as never); },
    readAll: async (name: string, q?: unknown) => { refuse(name); return store.empty.has(name) ? { rows: [], observedAt: new Date().toISOString() } : real.readAll(name, q as never); },
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
import { contextText } from '@/lib/shared-context';
import { UsageBody } from '@/views/usage';
import { usageTool } from '@/views/tools';

const OWNER = 'members_1';

beforeEach(() => { jar.value = OWNER; store.fail.clear(); store.empty.clear(); });

/** Usage as it is served, every boundary resolved. */
async function served(period = '30d'): Promise<Document> {
  jar.value = OWNER;
  const element = (await UsagePage({ searchParams: Promise.resolve({ period }) })) as ReactElement;
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

describe("Usage's parts, in order, from the sample", () => {
  it('draws each part with the card the specification names', async () => {
    const doc = await served();
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1')!.textContent).toMatch(/^Usage: 1\.1B requests in 30 days/);
    expect(doc.querySelector('[role="radiogroup"][aria-label="Reporting period"]')).toBeTruthy();
    // The Featured metric, first after the head: the period's requests, with requests a day as its chart; a year of
    // requests a day a cell, joined to the Meridian; when they come, by hour; where from beside what is asked for; how it
    // was answered.
    expect(cards(doc)).toEqual(['featured-metric', 'trend-chart', 'heatmap:calendar:max:meridian', 'column-chart', 'bar-list', 'bar-list', 'composition-bar']);
    const featured = doc.querySelector('[data-card="featured-metric"]')!;
    expect(featured.textContent).toContain('1.1B');
    expect(featured.contains(doc.querySelector('[data-card="trend-chart"]'))).toBe(true);
    const titles = ['A year of requests, a day a cell', 'The period, counted', 'When they come', 'Where from', 'What is asked for', 'How it was answered'].map((t) => titled(doc, t));
    for (let i = 1; i < titles.length; i++) expect(Boolean(titles[i - 1].compareDocumentPosition(titles[i]) & Node.DOCUMENT_POSITION_FOLLOWING), titles[i].textContent ?? '').toBe(true);
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

  it('offers when they come by hour, the busiest highlighted, and by weekday and hour on quantile', async () => {
    jar.value = OWNER;
    const { data } = await usageTool.read({ period: '30d' });
    const { container } = render(<Tooltip.Provider><UsageBody {...data} /></Tooltip.Provider>);
    const when = part(container, 'When they come', '[role="radio"]');
    const choices = [...when.querySelectorAll('[role="radio"]')].map((r) => r.textContent?.trim());
    expect(choices).toEqual(['By hour', 'By weekday and hour']);
    expect(cards(when)).toEqual(['column-chart']);
    fireEvent.click(within(when as HTMLElement).getByRole('radio', { name: 'By weekday and hour' }));
    expect(cards(when)).toEqual(['heatmap:hours:quantile']);
  });

  it('keeps its context within the budget at every period', async () => {
    for (const period of ['7d', '30d', '90d', 'all'] as const) {
      jar.value = OWNER;
      const { context } = await usageTool.read({ period });
      expect(contextText(context).length, period).toBeLessThanOrEqual(2600);
    }
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
