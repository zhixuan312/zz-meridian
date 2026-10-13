import { PassThrough } from 'node:stream';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import type { ReactElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/customers',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace() {}, push() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));
const toasts = vi.hoisted(() => [] as { title: string }[]);
vi.mock('@/components/ui/toast', () => ({ UNDO_MS: 8000, toast: (t: { title: string }) => { toasts.push(t); } }));

import CustomersPage from '../app/(dashboard)/customers/page';
import { createTicket } from '../app/(dashboard)/operations-tickets/actions';
import { readAlerts } from '@/data/alerts';
import { collections } from '@/data/collections';
import { readRuns } from '@/data/engineering';
import { readIncidents } from '@/data/metrics';
import { readTickets } from '@/data/tickets';
import { customerFigures } from '@/views/customers-context';
import { ServicesBody } from '@/views/services';
import { servicesContext } from '@/views/services-context';
import { MainRegions } from '@/views/home';
import { SettingsBody } from '@/views/settings';
import { matchingRuns, testFigures } from '@/views/tests-context';
import { matchingTickets } from '@/views/tickets-context';
import { viewTools } from '@/views/tools';

type Row = Record<string, unknown>;
const collection = (name: string) => collections.find((c) => c.name === name)!;
const kept = new Map<string, unknown>();
/** Serve a collection's reads from `rows`, a page at a time as the store does. */
const stub = (name: string, rows: Row[]) => {
  const c = collection(name);
  kept.set(name, c.query);
  c.query = (async (q: { limit?: number; offset?: number } = {}) => ({ rows: rows.slice(q.offset ?? 0, (q.offset ?? 0) + (q.limit ?? 100)), total: rows.length })) as never;
};
/** What an address asks of a page: its query, as the page's own state reads it. */
const asked = (href: string) => Object.fromEntries(new URL(href, 'http://x').searchParams);
/** The server's HTML once every part of it has arrived. */
const served = (el: ReactElement) => new Promise<string>((resolve, reject) => {
  let html = '';
  const out = new PassThrough();
  out.on('data', (c) => { html += c; });
  out.on('end', () => resolve(html));
  const stream = renderToPipeableStream(el, { onAllReady: () => stream.pipe(out), onShellError: reject, onError: reject });
});

beforeEach(() => { jar.value = 'members_1'; toasts.length = 0; });
afterEach(() => { for (const [name, query] of kept) collection(name).query = query as never; kept.clear(); });

describe('a count opens the records it counts', () => {
  it('failing verifications: the bell\'s link and Main\'s figure open the latest run of each, and only the failed ones', async () => {
    const { rows } = await readRuns();
    const { failing } = testFigures(rows);
    expect(failing.length).toBeGreaterThan(0);
    // The sample holds a failed run that a later pass replaced: every failed run is more than the failing ones.
    expect(rows.filter((r) => r.state === 'failed').length).toBeGreaterThan(failing.length);
    const alert = (await readAlerts()).alerts.find((a) => a.id === 'verifications:failing')!;
    const q = asked(alert.href);
    const opened = matchingRuns(rows, { q: q.q ?? '', state: q.state ?? 'all', release: q.release ?? '', runs: q.runs });
    expect(opened.map((r) => r.id).sort()).toEqual(failing.map((r) => r.id).sort());
    render(<MainRegions summary={{ business: null, operation: null, delivery: { open: 0, waiting: 0, failing: failing.length, live: 0, ready: 0, testing: 0 } } as never} />);
    const figure = screen.getAllByRole('link').find((a) => (a.getAttribute('href') ?? '').startsWith('/tests'))!;
    expect(asked(figure.getAttribute('href')!)).toEqual(q);
  });

  it('a ticket nobody owns: the bell\'s alert opens the list on that ticket, not every high-priority one', async () => {
    const title = `Unowned probe ${Math.random().toString(36).slice(2)}`;
    expect(await createTicket({ title, service: 'Edge gateway', priority: 'high', assigneeId: null, summary: '' })).toEqual({ ok: true });
    const alert = (await readAlerts()).alerts.find((a) => a.title.includes(title))!;
    const q = asked(alert.href);
    const { rows } = await readTickets();
    const opened = matchingTickets(rows, { q: q.q ?? '', state: q.state ?? 'all', priority: q.priority ?? 'all' });
    expect(opened.map((t) => t.title)).toEqual([title]);
  });
});

describe('Services, when more than one incident is open', () => {
  it('reads every incident nobody has resolved, the newest first', async () => {
    const all = (await collection('incidents').query({})).rows as Row[];
    const second = { ...all.find((i) => i.state !== 'resolved')!, id: 'incidents_second', title: 'Webhook deliveries delayed', service: 'Webhooks', started: '2026-10-01T00:00:00.000Z' };
    stub('incidents', [...all, second]);
    const { current, open, past } = await readIncidents();
    expect(open.length).toBe(2);
    expect(current).toEqual(open[0]);
    expect(past.every((i) => i.state === 'resolved')).toBe(true);
  });

  it('draws them all, and tells the assistant of each', async () => {
    const { data } = await viewTools.find((t) => t.name === 'services')!.read({});
    const d = data as Parameters<typeof ServicesBody>[0];
    const other = { ...d.current!, id: 'incidents_second', title: 'Webhook deliveries delayed', service: 'Webhooks' };
    const two = { ...d, alsoOpen: [other] };
    const { container } = render(<ServicesBody {...two} />);
    expect(container.textContent).toContain(d.current!.title);
    expect(container.textContent).toContain('Webhook deliveries delayed');
    expect(screen.getByText('Also open')).toBeTruthy();
    expect(servicesContext(two).insights.some((i) => i.text.includes('Webhook deliveries delayed'))).toBe(true);
  });
});

describe('what Main tells the assistant of the business', () => {
  it('is every figure the Business region draws: how many, by status, by plan, and what they paid', async () => {
    const { context, data } = await viewTools.find((t) => t.name === 'home')!.read({ period: '30d' });
    const business = (data as { summary: { business: { byStatus: Record<string, number>; byPlan: Record<string, number> } } }).summary.business;
    const fact = (label: string) => context.facts.find((f) => f.label === label)?.value ?? '';
    for (const [status, n] of Object.entries(business.byStatus)) expect(fact('By status'), status).toContain(`${n} ${status}`);
    for (const [plan, n] of Object.entries(business.byPlan)) expect(fact('By plan'), plan).toContain(`${n} ${plan}`);
    expect(fact('Revenue, last 30 days')).toMatch(/\d/);
  });
});

describe('the Customers page', () => {
  it('counts every customer in its tiles, not a first page of them', async () => {
    const one = (await collection('customers').query({})).rows[0] as Row;
    const many = Array.from({ length: 150 }, (_, i) => ({ ...one, id: `customers_x${i}`, name: `Customer ${i}`, status: 'active' }));
    stub('customers', many);
    const html = await served(<Tooltip.Provider>{await CustomersPage()}</Tooltip.Provider>);
    const tiles = html.slice(html.indexOf('data-split="tiles"'), html.indexOf('<table'));
    expect(customerFigures(many as never).customers).toBe(150);
    expect(tiles.replace(/<[^>]*>/g, ' ')).toMatch(/Customers\s[\s\S]*\b150\b/);
  });
});

describe('a ticket action', () => {
  it('shows the person the boundary\'s own sentence, and nothing of an error that is not one', async () => {
    expect(await createTicket({ title: '', service: 'Edge gateway', priority: 'high', assigneeId: null, summary: '' })).toEqual({ ok: false, error: expect.stringMatching(/title of 1 to 160 characters/) });
    const tickets = collection('tickets');
    kept.set('tickets', tickets.query);
    const create = tickets.create;
    tickets.create = (async () => { throw new TypeError("Cannot read properties of undefined (reading 'rows')"); }) as never;
    try {
      expect(await createTicket({ title: 'A real title', service: 'Edge gateway', priority: 'high', assigneeId: null, summary: '' })).toEqual({ ok: false, error: 'The change did not go through.' });
    } finally { tickets.create = create; }
  });
});

describe('saving the workspace', () => {
  it('leaves the field holding the name as it was stored, without the space around it', async () => {
    render(<SettingsBody may={{ workspaceRead: true, workspaceUpdate: true }} workspace={{ name: 'Acme', slug: 'acme' }} save={async () => ({ ok: true })} />);
    const name = screen.getByLabelText(/^Name/) as HTMLInputElement;
    fireEvent.change(name, { target: { value: '  Acme Staging  ' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save changes' })); });
    expect(name.value).toBe('Acme Staging');
  });
});
