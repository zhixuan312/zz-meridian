// Named cli-* so the payload leaves it out: it is about the sample's own Services page, which a product replaces.
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
/** Every read of the product goes through `read` and `readAll`: a collection in `fail` cannot be read, one in `empty` holds nothing yet, `map` rewrites its rows. */
const store = vi.hoisted(() => ({ fail: new Set<string>(), empty: new Set<string>(), map: new Map<string, (row: Record<string, unknown>) => Record<string, unknown>>() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/services',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  const shape = (name: string, rows: Record<string, unknown>[]) => (store.empty.has(name) ? [] : store.map.has(name) ? rows.map(store.map.get(name)!) : rows);
  const refuse = (name: string) => { if (store.fail.has(name)) throw new Error(`${name} is unavailable`); };
  return {
    ...real,
    read: async (name: string, q?: unknown) => { refuse(name); const r = await real.read(name, q as never); const rows = shape(name, r.rows); return { ...r, rows, total: rows.length }; },
    readAll: async (name: string, q?: unknown) => { refuse(name); const r = await real.readAll(name, q as never); return { ...r, rows: shape(name, r.rows) }; },
    // The resolving reads delegate to these, and a data module that already holds a scope calls them directly — the
    // Services page's uptime answer among them. Both forms are the same read, so both are shaped here, or a figure the
    // test set aside would come back from the collection it really holds.
    readInScope: async (scope: never, name: string, q?: unknown) => { refuse(name); const r = await real.readInScope(scope, name, q as never); const rows = shape(name, r.rows); return { ...r, rows, total: rows.length }; },
    readAllInScope: async (scope: never, name: string, q?: unknown) => { refuse(name); const r = await real.readAllInScope(scope, name, q as never); return { ...r, rows: shape(name, r.rows) }; },
  };
});
// Each card the page draws marks where it stands: the Status list how many services and whether it counts their runs,
// an Incident card its incident's state.
const mark = vi.hoisted(() => async (real: Record<string, unknown>, name: string, card: string) => {
  const { createElement } = await import('react');
  const Real = real[name] as (props: Record<string, unknown>) => ReactElement;
  const label = (p: Record<string, unknown>): string =>
    card === 'status-list' ? `${(p.services as unknown[]).length}${p.run ? ':run' : ''}` : card === 'incident-card' ? String((p.incident as { state: string }).state) : '';
  const Marked = (props: Record<string, unknown>) => createElement('div', { 'data-card': card, 'data-label': label(props) }, createElement(Real, props));
  return { ...real, [name]: Marked };
});
vi.mock('@/components/patterns/status-list', async (orig) => mark(await orig(), 'StatusList', 'status-list'));
vi.mock('@/components/patterns/incident-card', async (orig) => mark(await orig(), 'IncidentCard', 'incident-card'));
vi.mock('@/components/patterns/featured-metric', async (orig) => mark(await orig(), 'FeaturedMetric', 'featured-metric'));

import ServicesPage from '../app/(dashboard)/services/page';
import ServicesLoading from '../app/(dashboard)/services/loading';
import { contextText } from '@/lib/shared-context';
import { servicesTool } from '@/logic/tools';
import { servedDocument } from './cli-served';

beforeEach(() => { jar.value = 'members_1'; store.fail.clear(); store.empty.clear(); store.map.clear(); });

/** Services as it is served, every boundary resolved. */
async function served(): Promise<Document> {
  const element = (await ServicesPage()) as ReactElement;
  return servedDocument(element);
}
const cards = (root: ParentNode) => [...root.querySelectorAll('[data-card]')].map((e) => (e.getAttribute('data-label') ? `${e.getAttribute('data-card')}:${e.getAttribute('data-label')}` : e.getAttribute('data-card')));
function titled(root: ParentNode, title: string): Element {
  const head = [...root.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent?.trim() === title);
  expect(head, title).toBeTruthy();
  return head!;
}

describe("Services' parts, in order, from the sample", () => {
  it('each service in the team\'s order with its strip and its run, then one list of incidents, the open ones first', async () => {
    const doc = await served();
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1')!.textContent).toMatch(/^Services: \d+\.\d{2}% uptime in 90 days/);
    // The Featured metric, first after the head: uptime over 90 days, the figure the title states.
    expect(cards(doc)).toEqual(['featured-metric', 'status-list:6:run', 'incident-card:monitoring', 'incident-card:resolved', 'incident-card:resolved', 'incident-card:resolved']);
    const uptime = /(\d+\.\d{2})% uptime/.exec(doc.querySelector('h1')!.textContent ?? '')![1];
    expect(doc.querySelector('[data-card="featured-metric"]')!.textContent).toContain(`${uptime}%`);
    const each = titled(doc, 'Each service, 90 days');
    const incidents = titled(doc, 'Incidents');
    expect(Boolean(each.compareDocumentPosition(incidents) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    const list = doc.querySelector('[data-card="status-list"]')!.textContent ?? '';
    const order = ['Edge gateway', 'Inference API', 'Embeddings', 'Files', 'Webhooks', 'Dashboard'].map((n) => list.indexOf(n));
    for (let i = 1; i < order.length; i++) expect(order[i], 'the team\'s order').toBeGreaterThan(order[i - 1]);
    expect(list).toMatch(/Operational for \d+ days/);
  });

  it('says how long each incident lasted, the open one so far, and opens the open one\'s ticket', async () => {
    const doc = await served();
    const resolved = [...doc.querySelectorAll('[data-card="incident-card"][data-label="resolved"]')].map((e) => e.textContent ?? '');
    expect(resolved[0]).toMatch(/2\.4 ?h/);
    for (const text of resolved) expect(text).toMatch(/lasted|\d+(\.\d)? ?(h|m|min)\b/);
    const open = doc.querySelector('[data-card="incident-card"][data-label="monitoring"]')!;
    expect(open.textContent).toContain('Jonas Weber');
    expect(open.querySelector('a[href^="/operations-tickets?q="]')).toBeTruthy();
  });

  it('writes an uptime of every day as 100%, never 100.000%', async () => {
    store.map.set('services', (row) => ({ ...row, status: 'operational', days: (row.days as string[]).map(() => 'operational'), uptime: 1 }));
    jar.value = 'members_1';
    const { context } = await servicesTool.read({});
    const text = contextText(context);
    expect(text).toContain('100%');
    expect(text).not.toContain('100.000%');
    const doc = await served();
    expect(doc.querySelector('h1')!.textContent).toBe('Services: 100% uptime in 90 days');
    expect(doc.body.textContent).not.toContain('100.000%');
  });
});

describe("Services' states", () => {
  it('loading: the heading held under its name, and the page announced as busy', () => {
    const doc = new DOMParser().parseFromString(renderToStaticMarkup(<Tooltip.Provider><ServicesLoading /></Tooltip.Provider>), 'text/html');
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1')!.textContent).toMatch(/^Services/);
    expect(doc.querySelector('[data-title-pending]')).toBeTruthy();
    expect(doc.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('empty: no service yet, said once', async () => {
    store.empty.add('services');
    store.empty.add('incidents');
    const doc = await served();
    // Headed by the page's name, which a sentence would otherwise follow.
    expect(doc.querySelector('h1')!.textContent!.replace(/:\s*$/, '')).toBe('Services');
    expect(doc.body.textContent).toMatch(/no services yet/i);
    expect(cards(doc)).toEqual([]);
  });

  it('partial: the incidents could not be read, that part says so, and each service stands', async () => {
    store.fail.add('incidents');
    const doc = await served();
    expect(cards(doc)).toEqual(['featured-metric', 'status-list:6:run']);
    let card = titled(doc, 'Incidents').parentElement;
    while (card && !/could not be read/i.test(card.textContent ?? '')) card = card.parentElement;
    expect(card, 'the card that says so').toBeTruthy();
  });

  it('keeps its context within the budget', async () => {
    const { context } = await servicesTool.read({});
    expect(contextText(context).length).toBeLessThanOrEqual(2600);
  });
});
