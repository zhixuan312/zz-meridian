import { act, fireEvent, render, screen } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/customers',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace() {}, push() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));
const toasts = vi.hoisted(() => [] as { title: string }[]);
vi.mock('@/components/ui/toast', () => ({ UNDO_MS: 8000, toast: (t: { title: string }) => { toasts.push(t); } }));

import CustomersPage from '../app/(dashboard)/customers/page';
import { createTicket } from '../app/(dashboard)/operations-tickets/actions';
import { readAlerts } from '@/logic/alerts';
import { collections } from '@/data/collections';
import { readRuns } from '@/data/engineering';
import { readIncidents } from '@/data/metrics';
import { readTickets } from '@/data/tickets';
import { formatCost } from '@/lib/format';
import { CustomersView } from '@/views/customers';
import { customerFigures, customerRow } from '@/logic/customers-context';
import { ServicesBody } from '@/views/services';
import { servicesContext } from '@/logic/services-context';
import type { HomeData } from '@/logic/home-context';
import { SettingsBody } from '@/views/settings';
import { matchingRuns, testFigures } from '@/logic/tests-context';
import { matchingTickets } from '@/logic/tickets-context';
import { served } from './served';
import { viewTools } from '@/logic/tools';

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

beforeEach(() => { jar.value = 'members_1'; toasts.length = 0; });
afterEach(() => { for (const [name, query] of kept) collection(name).query = query as never; kept.clear(); });

describe('a count opens the records it counts', () => {
  it('failing verifications: the bell\'s link opens the latest run of each, and only the failed ones', async () => {
    const { rows } = await readRuns();
    const { failing } = testFigures(rows);
    expect(failing.length).toBeGreaterThan(0);
    // The sample holds a failed run that a later pass replaced: every failed run is more than the failing ones.
    expect(rows.filter((r) => r.state === 'failed').length).toBeGreaterThan(failing.length);
    const alert = (await readAlerts()).alerts.find((a) => a.id === 'verifications:failing')!;
    const q = asked(alert.href);
    const opened = matchingRuns(rows, { q: q.q ?? '', state: q.state ?? 'all', release: q.release ?? '', runs: q.runs });
    expect(opened.map((r) => r.id).sort()).toEqual(failing.map((r) => r.id).sort());
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
    const { open, past } = await readIncidents();
    expect(open.length).toBe(2);
    expect(open[0].started > open[1].started).toBe(true);
    expect(past.every((i) => i.state === 'resolved')).toBe(true);
    // A page is handed the card's shape: who has the incident by name, and not the id of its ticket.
    expect(open[0].owner).toBe('Jonas Weber');
    expect([...open, ...past].some((i) => 'ticketId' in i || i.owner === null)).toBe(false);
  });

  it('draws them all in one list, the open ones first, and tells the assistant of each', async () => {
    const { data } = await viewTools.find((t) => t.name === 'services')!.read({});
    const d = data as Parameters<typeof ServicesBody>[0];
    const first = d.incidents!.open[0];
    const other = { ...first, id: 'incidents_second', title: 'Webhook deliveries delayed', service: 'Webhooks' };
    const two = { ...d, incidents: { ...d.incidents!, open: [first, other] } };
    const { container } = render(<Tooltip.Provider><ServicesBody {...two} /></Tooltip.Provider>);
    const list = screen.getByRole('region', { name: 'Incidents' });
    const text = list.textContent ?? '';
    // Both open ones, each in its card with how long it has lasted so far, before every resolved one.
    expect(text.indexOf(first.title)).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('Webhook deliveries delayed')).toBeGreaterThan(text.indexOf(first.title));
    expect(text.match(/Open for \S+ so far/g)).toHaveLength(2);
    for (const r of d.incidents!.resolved) expect(text.indexOf(r.title), r.title).toBeGreaterThan(text.indexOf('Webhook deliveries delayed'));
    expect(container.textContent).not.toMatch(/Also open|Past incidents/);
    const said = servicesContext(two).insights.map((i) => i.text);
    expect(said.some((t) => t.startsWith(`Open incident "${first.title}"`))).toBe(true);
    expect(said.some((t) => t.startsWith('Open incident "Webhook deliveries delayed"'))).toBe(true);
  });
});

describe('what Home tells the assistant of the business', () => {
  it('is how many customers there are and how many of each status, the figures the Customers tile and the Business card count', async () => {
    const { context, data } = await viewTools.find((t) => t.name === 'home')!.read({ period: '30d' });
    const { customers, business } = data as HomeData;
    const fact = context.facts.find((f) => f.label === 'Customers')?.value ?? '';
    expect(fact).toBe(`${customers!.count}: ${customers!.active} active, ${customers!.trial} on a trial, ${customers!.pastDue} past due`);
    expect(business.lines.find((l) => l.label === 'Customers')?.value).toBe(String(customers!.count));
  });
});

describe('the Customers page', () => {
  it('counts every customer in its tiles, not a first page of them', async () => {
    const one = (await collection('customers').query({})).rows[0] as Row;
    const many = Array.from({ length: 150 }, (_, i) => ({ ...one, id: `customers_x${i}`, name: `Customer ${i}`, status: 'active' }));
    stub('customers', many);
    const html = await served(await CustomersPage());
    const tiles = html.slice(html.indexOf('data-split="tiles"'), html.indexOf('<table'));
    expect(customerFigures(many as never).customers).toBe(150);
    expect(tiles.replace(/<[^>]*>/g, ' ')).toMatch(/Customers\s[\s\S]*\b150\b/);
  });

  it('and so does its view tool: every customer is read, those that have not left are counted, and those that have are listed under their status', async () => {
    const tool = viewTools.find((t) => t.name === 'customers')!;
    const every = (await collection('customers').query({})).rows as Row[];
    const staying = every.filter((c) => c.status !== 'left');
    // More customers than one read answers, and some of each kind past the first hundred.
    expect(staying.length).toBeGreaterThan(100);
    expect(every.length).toBeGreaterThan(staying.length);
    const fact = (context: { facts: { label: string; value: string }[] }, label: string) => context.facts.find((f) => f.label === label)?.value ?? '';
    const { context } = await tool.read({});
    const figures = customerFigures(every as never);
    expect(fact(context, 'Customers')).toBe(String(staying.length));
    expect(fact(context, 'Revenue, last 30 days')).toBe(formatCost(figures.revenue));
    expect(fact(context, 'Past due')).toMatch(new RegExp(`^${every.filter((c) => c.status === 'past due').length}: `));
    expect(fact(context, 'Shown')).toMatch(new RegExp(`^${staying.length} of ${staying.length}, `));
    for (const plan of ['Enterprise', 'Scale', 'Starter']) {
      const n = staying.filter((c) => c.plan === plan).length;
      expect(fact((await tool.read({ plan })).context, 'Matching'), plan).toMatch(new RegExp(`^${n} of ${staying.length}, `));
    }
    expect(tool.input.safeParse({ status: 'left' }).success).toBe(true);
    const gone = (await tool.read({ status: 'left' })).context;
    const left = every.length - staying.length;
    expect(fact(gone, 'Matching')).toMatch(new RegExp(`^${left} of ${left} that have left, `));
    expect(fact(gone, 'Customers')).toBe(String(staying.length));
    expect(gone.address).toBe('/customers?status=left');
  });

  it('offers the customers that have left under their own status, and lists and counts the others without them', async () => {
    const every = (await collection('customers').query({})).rows as Row[];
    const staying = every.filter((c) => c.status !== 'left').length;
    const { container } = render(<Tooltip.Provider><CustomersView rows={(every as never[]).map(customerRow)} /></Tooltip.Provider>);
    expect(container.textContent).toContain(`${staying} of ${staying}`);
    // The status filter offers them: opened, its list holds Left beside the three statuses of a customer that has not.
    fireEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['All', 'Active', 'Trial', 'Past due', 'Left']);
    // No row of the list as it opens is a customer that has left.
    expect([...container.querySelectorAll('tbody tr')].filter((row) => /\bLeft\b/.test(row.textContent ?? ''))).toEqual([]);
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
