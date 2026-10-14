// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { createTicket, updateTicket } from '../app/(dashboard)/operations-tickets/actions';
import { readAlerts } from '@/data/alerts';
import { collections } from '@/data/collections';
import { latestRuns } from '@/data/verification';
import { workspaceOf } from '@/views/workspaces';

type Row = Record<string, unknown>;
const ROOT = path.resolve(import.meta.dirname, '..');
const all = async (name: string) => (await collections.find((c) => c.name === name)!.query({})).rows as Row[];
const pathOf = (href: string) => href.split(/[?#]/)[0];

beforeEach(() => { jar.value = 'members_12'; });

describe('the alerts in the shell', () => {
  it('lead with the incident nobody has resolved, as something new', async () => {
    const open = (await all('incidents')).filter((i) => i.state !== 'resolved');
    expect(open.length).toBeGreaterThan(0);
    const { alerts } = await readAlerts();
    expect(alerts[0]).toMatchObject({ href: '/services', tone: 'warning', unread: true });
    expect(open.map((i) => i.title)).toContain(alerts[0].title);
  });

  it('are each a thing somebody can open: one id each, a title, a time no later than the read, and an address the product has', async () => {
    const { alerts, now } = await readAlerts();
    expect(new Set(alerts.map((a) => a.id)).size).toBe(alerts.length);
    for (const a of alerts) {
      expect(a.title.trim().length, a.id).toBeGreaterThan(0);
      expect(a.at <= now, a.id).toBe(true);
      expect(workspaceOf(pathOf(a.href)), a.href).not.toBeNull();
    }
  });

  it('say in one alert how many customers are past due, by name when there is one, and say how many verifications are failing', async () => {
    const { alerts } = await readAlerts();
    const pastDue = (await all('customers')).filter((x) => x.status === 'past due');
    expect(pastDue.length).toBeGreaterThan(1);
    const owing = alerts.filter((a) => pathOf(a.href) === '/customers');
    expect(owing).toHaveLength(1);
    expect(owing[0].title).toBe(`${pastDue.length} customers are past due`);
    // The alert opens the list filtered to them.
    expect(new URL(owing[0].href, 'http://x').searchParams.get('status')).toBe('past due');
    // One customer past due is named: the bell says who, and opens its page.
    const customers = collections.find((c) => c.name === 'customers')!;
    const real = customers.query;
    customers.query = async (q) => {
      const answer = await real(q);
      const rows = answer.rows.filter((c: Row) => c.status !== 'past due' || c.name === 'Lumen Studio');
      return { rows, total: answer.total - (answer.rows.length - rows.length) };
    };
    try {
      expect((await readAlerts()).alerts.filter((a) => a.id === 'customers:past-due').map((a) => [a.title, a.href])).toEqual([['Lumen Studio is past due', '/customers/lumen-studio']]);
    } finally {
      customers.query = real;
    }
    const failing = (latestRuns((await all('tests')) as never) as unknown as Row[]).filter((r) => r.state === 'failed').length;
    const told = alerts.filter((a) => pathOf(a.href) === '/tests');
    expect(told.length).toBe(failing > 0 ? 1 : 0);
    if (failing > 0) expect(told[0].title).toContain(String(failing));
  });

  it('are the same alerts, in the same order, when nothing has changed', async () => {
    const [first, second] = [await readAlerts(), await readAlerts()];
    expect(second.alerts.map((a) => a.id)).toEqual(first.alerts.map((a) => a.id));
  });
});

describe('the alerts follow the data', () => {
  it('gain a high-priority ticket nobody has, and lose it once somebody does', async () => {
    jar.value = 'members_4';
    const title = `Unowned probe ${Math.random().toString(36).slice(2)}`;
    expect(await createTicket({ title, service: 'Edge gateway', priority: 'high', assigneeId: null, summary: '' })).toEqual({ ok: true });
    const id = String((await all('tickets')).at(-1)!.id);
    const told = (await readAlerts()).alerts.find((a) => a.title.includes(title));
    expect(told).toBeTruthy();
    expect(pathOf(told!.href)).toBe('/operations-tickets');
    expect(await updateTicket(id, { assigneeId: 'members_2' })).toEqual({ ok: true });
    expect((await readAlerts()).alerts.some((a) => a.title.includes(title))).toBe(false);
  });

  it('are refused to somebody with no session', async () => {
    jar.value = 'members_999';
    await expect(readAlerts()).rejects.toBeTruthy();
  });
});

describe('the console\'s layout', () => {
  it('draws the alerts it read, and no list somebody typed', () => {
    const layout = fs.readFileSync(path.join(ROOT, 'app/(dashboard)/layout.tsx'), 'utf8');
    expect(layout).toMatch(/\breadAlerts\(/);
    expect(layout).not.toMatch(/\bALERTS\b/);
  });
});
