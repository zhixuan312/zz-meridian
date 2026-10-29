// Named cli-* so the payload leaves it out: it is about the sample's own Now page, which a product replaces.
import { PassThrough } from 'node:stream';
import type { ReactElement } from 'react';
import { renderToPipeableStream, renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
/**
 * Every read of the product goes through `read` and `readAll`: a collection in `fail` cannot be read, one in `empty`
 * holds nothing yet, `extra` adds rows after the sample's, and `only` keeps the rows a test chooses.
 */
const store = vi.hoisted(() => ({
  fail: new Set<string>(),
  empty: new Set<string>(),
  extra: new Map<string, Record<string, unknown>[]>(),
  only: new Map<string, (row: Record<string, unknown>) => boolean>(),
  live: [] as string[],
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/engineering',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  const shape = (name: string, rows: Record<string, unknown>[]) => {
    if (store.empty.has(name)) return [];
    const kept = store.only.has(name) ? rows.filter(store.only.get(name)!) : rows;
    return [...kept, ...(store.extra.get(name) ?? [])];
  };
  const refuse = (name: string) => { if (store.fail.has(name)) throw new Error(`${name} is unavailable`); };
  return {
    ...real,
    read: async (name: string, q?: unknown) => { refuse(name); const r = await real.read(name, q as never); const rows = shape(name, r.rows); return { ...r, rows, total: rows.length }; },
    readAll: async (name: string, q?: unknown) => { refuse(name); const r = await real.readAll(name, q as never); return { ...r, rows: shape(name, r.rows) }; },
  };
});
// What the page asks to be kept live.
vi.mock('@/lib/live', async (orig) => {
  const real = await orig<typeof import('@/lib/live')>();
  return { ...real, useLive: (collections: string[]) => { store.live.push(...collections); return real.useLive(collections); } };
});
// Each card the page draws marks where it stands, with what a test needs of its props.
const mark = vi.hoisted(() => async (real: Record<string, unknown>, name: string, card: string) => {
  const { createElement } = await import('react');
  const Real = real[name] as (props: Record<string, unknown>) => ReactElement;
  const label = (p: Record<string, unknown>): string => {
    if (card === 'metric-tile') return String(p.label ?? '');
    if (card === 'status-list') return String((p.services as unknown[]).length);
    if (card === 'incident-card') return `${(p.incident as { severity: string }).severity}`;
    if (card === 'uptime-bars') return `${(p.days as string[]).length}:${(p.days as string[]).filter((d) => d !== 'operational').length}`;
    if (card === 'bar-list') return String(p.highlight ?? '');
    if (card === 'column-chart') return `${(p.columns as unknown[]).length}${p.running ? ':running' : ''}`;
    if (card === 'activity-feed') return String((p.events as unknown[]).length);
    return '';
  };
  const Marked = (props: Record<string, unknown>) => createElement('div', { 'data-card': card, 'data-label': label(props) }, createElement(Real, props));
  return { ...real, [name]: Marked };
});
vi.mock('@/components/patterns/status-list', async (orig) => mark(await orig(), 'StatusList', 'status-list'));
vi.mock('@/components/patterns/incident-card', async (orig) => mark(await orig(), 'IncidentCard', 'incident-card'));
vi.mock('@/components/charts/uptime-bars', async (orig) => mark(await orig(), 'UptimeBars', 'uptime-bars'));
vi.mock('@/components/charts/bar-list', async (orig) => mark(await orig(), 'BarList', 'bar-list'));
vi.mock('@/components/patterns/metric-tile', async (orig) => mark(await orig(), 'MetricTile', 'metric-tile'));
vi.mock('@/components/charts/column-chart', async (orig) => mark(await orig(), 'ColumnChart', 'column-chart'));
vi.mock('@/components/patterns/activity-feed', async (orig) => mark(await orig(), 'ActivityFeed', 'activity-feed'));
vi.mock('@/components/patterns/featured-metric', async (orig) => mark(await orig(), 'FeaturedMetric', 'featured-metric'));

import NowPage from '../app/(dashboard)/engineering/page';
import NowLoading from '../app/(dashboard)/engineering/loading';
import { contextText } from '@/lib/shared-context';
import { SERVICES } from '@/system/fixtures/sample';
import { nowTool } from '@/logic/tools';

const OWNER = 'members_1';
const VIEWER = 'members_12';

beforeEach(() => { jar.value = OWNER; store.fail.clear(); store.empty.clear(); store.extra.clear(); store.only.clear(); store.live.length = 0; });

/** Now as it is served, every boundary resolved. */
async function served(): Promise<Document> {
  const element = (await NowPage()) as ReactElement;
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
// The cards the page itself draws: a card a card draws inside itself (the strip of each service in the Status list) is that card's.
const cards = (root: ParentNode) => [...root.querySelectorAll('[data-card]')].filter((e) => !e.parentElement?.closest('[data-card]')).map((e) => (e.getAttribute('data-label') ? `${e.getAttribute('data-card')}:${e.getAttribute('data-label')}` : e.getAttribute('data-card')));
function titled(root: ParentNode, title: string | RegExp): Element {
  const head = [...root.querySelectorAll('*')].find((e) => e.children.length === 0 && (typeof title === 'string' ? e.textContent?.trim() === title : title.test(e.textContent?.trim() ?? '')));
  expect(head, String(title)).toBeTruthy();
  return head!;
}
/** A part: from its title out to the first ancestor that holds `inner`. */
function part(root: ParentNode, title: string | RegExp, inner: string): Element {
  let el = titled(root, title).parentElement;
  while (el && !el.querySelector(inner)) el = el.parentElement;
  expect(el, String(title)).toBeTruthy();
  return el!;
}
const TILES = ['Releases out', 'Tickets closed', 'Runs passed', 'Incidents resolved'];
/** A service that has been operational for every day it keeps, under a name of its own and after the team's six. */
const calm = (n: number) => ({ ...SERVICES[0], name: `Service ${n}`, description: `A further service, ${n}`, status: 'operational', days: SERVICES[0].days.map(() => 'operational'), uptime: 1, order: 100 + n });

describe("Now's thirteen parts, in order, from the sample", () => {
  it('draws each part with the card the specification names', async () => {
    const doc = await served();
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1')!.textContent).toBe('Now: Inference API is degraded, and 3 releases are in testing');
    // The line under the title: how long after its start each step of the open incident came, the services, the days inside the band.
    const masthead = doc.getElementById('content')!.textContent ?? '';
    expect(masthead).toMatch(/at the start/);
    expect(masthead).toMatch(/after \d/);
    expect(masthead).toMatch(/357 of 360 days/);
    // The Featured metric, first after the head: the days inside the band over the last 360 complete days.
    expect(doc.querySelector('[data-card="featured-metric"]')!.textContent).toMatch(/357[^]*360/);
    expect(cards(doc)).toEqual([
      'featured-metric',
      'status-list:6',
      'incident-card:minor',
      'uptime-bars:360:3',
      'bar-list:eu-west-1',
      ...TILES.map((t) => `metric-tile:${t}`),
      'column-chart:31:running',
      'activity-feed:5',
    ]);
    const titles = ['Services, now', 'Open incident', '357 of 360 days inside the band', 'Models, now', 'Compute in use', 'Shipping', 'Work', 'Slowest endpoints', ...TILES, 'Verification runs a day, by how they ended', 'Changes'].map((t) => titled(doc, t));
    for (let i = 1; i < titles.length; i++) expect(Boolean(titles[i - 1].compareDocumentPosition(titles[i]) & Node.DOCUMENT_POSITION_FOLLOWING), titles[i].textContent ?? '').toBe(true);
  });

  it('names the incident\'s owner and opens its ticket', async () => {
    const doc = await served();
    const incident = part(doc, 'Open incident', '[data-card="incident-card"]');
    expect(incident.textContent).toContain('Jonas Weber');
    expect(incident.querySelector('a[href^="/operations-tickets?q="]')).toBeTruthy();
  });

  it('lists each model, and the endpoints slowest first', async () => {
    const doc = await served();
    const models = part(doc, 'Models, now', 'table, ul, ol').textContent ?? '';
    for (const m of ['Meridian Large', 'Meridian Swift', 'Meridian Embed', 'No model']) expect(models, m).toContain(m);
    const slowest = part(doc, 'Slowest endpoints', 'table, ul, ol').textContent ?? '';
    expect(slowest.indexOf('/v1/files')).toBeGreaterThan(-1);
    expect(slowest.indexOf('/v1/files')).toBeLessThan(slowest.indexOf('/v1/messages'));
  });

  it("puts what ships and the work in front of the reader, the reader's own ticket marked and a link to all", async () => {
    const doc = await served();
    const shipping = part(doc, 'Shipping', 'ul, ol, table').textContent ?? '';
    for (const v of ['v1.14.0', 'v0.8.3', 'v6.1.0', 'v2.9.0']) expect(shipping, v).toContain(v);
    expect(shipping).toMatch(/\d+ of \d+ required/);
    const work = part(doc, 'Work', 'a[href="/operations-tickets"]');
    expect(work.textContent).toMatch(/Parser rejects PDFs with an embedded font table[^]*Yours|Yours[^]*Parser rejects PDFs with an embedded font table/);
  });

  it('keeps what changed live', async () => {
    await served();
    expect(store.live).toContain('activity');
  });
});

describe('Now with one incident, several and none, and with more than eight services', () => {
  it('several open: a list, the most severe first', async () => {
    const started = new Date(Date.parse('2026-10-03T09:00:00Z') - 40 * 60_000).toISOString();
    store.extra.set('incidents', [{ id: 'inc_2611', title: 'Files uploads fail in us-west-2', service: 'Files', severity: 'major', state: 'investigating', started, updates: [{ at: started, text: 'Uploads over 10 MB fail in us-west-2.' }], owner: null, ticketId: null }]);
    const doc = await served();
    const list = part(doc, 'Open incidents', '[data-card="incident-card"]');
    expect(cards(list)).toEqual(['incident-card:major', 'incident-card:minor']);
  });

  it('none open: the card stays and says when the last one was resolved and how long it lasted', async () => {
    store.only.set('incidents', (row) => row.state === 'resolved');
    const doc = await served();
    expect(cards(doc)).not.toContain('incident-card:minor');
    let card = titled(doc, 'Open incident').parentElement;
    while (card && !/17 Aug 2026/.test(card.textContent ?? '')) card = card.parentElement;
    expect(card, 'the card that names the last one').toBeTruthy();
    // The card itself, not a part beside it that names the same day (the band's facts, the Incidents resolved tile).
    expect(card!.querySelector('[data-card="uptime-bars"], [data-card="metric-tile"]')).toBeNull();
    expect(card!.textContent).toMatch(/2\.4 ?h/);
  });

  it('more than eight services: those not operational, then the three longest runs, then a link to every one', async () => {
    store.extra.set('services', [1, 2, 3, 4].map(calm));
    const doc = await served();
    const services = part(doc, 'Services, now', '[data-card="status-list"]');
    expect(cards(services)).toEqual(['status-list:4']);
    expect(services.textContent).toContain('Inference API');
    expect(services.querySelector('a[href="/services"]')!.textContent).toMatch(/10/);
  });
});

describe("Now's states", () => {
  it('loading: the heading held under its name, and the page announced as busy', () => {
    const doc = new DOMParser().parseFromString(renderToStaticMarkup(<Tooltip.Provider><NowLoading /></Tooltip.Provider>), 'text/html');
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1')!.textContent).toMatch(/^Now/);
    expect(doc.querySelector('[data-title-pending]')).toBeTruthy();
    expect(doc.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('empty: nothing has arrived yet, said once, and no figure drawn as if it had', async () => {
    for (const name of ['services', 'incidents', 'releases', 'tests', 'days', 'usage', 'models', 'compute', 'endpoints', 'tickets', 'activity']) store.empty.add(name);
    const doc = await served();
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    // Headed by the page's name, which a sentence would otherwise follow.
    expect(doc.querySelector('h1')!.textContent!.replace(/:\s*$/, '')).toBe('Now');
    expect(doc.body.textContent).toMatch(/no services yet|nothing has arrived/i);
    expect(cards(doc)).toEqual([]);
  });

  it('partial: a read that failed leaves its part saying so, and the rest stands', async () => {
    store.fail.add('tickets');
    store.fail.add('activity');
    const doc = await served();
    expect(cards(doc)).toContain('status-list:6');
    for (const title of ['Work', 'Changes']) {
      let card = titled(doc, title).parentElement;
      while (card && !/could not be read/i.test(card.textContent ?? '')) card = card.parentElement;
      expect(card, `${title}: the card that says so`).toBeTruthy();
      expect(card!.contains(doc.querySelector('[data-card="status-list"]'))).toBe(false);
    }
  });

  it('keeps its context within the budget for an Owner and a Viewer', async () => {
    for (const id of [OWNER, VIEWER]) {
      jar.value = id;
      const { context } = await nowTool.read({});
      expect(contextText(context).length, id).toBeLessThanOrEqual(2600);
    }
  });
});
