import fs from 'node:fs';
import path from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const policy = vi.hoisted(() => ({ viewer: null as string[] | null }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
// A Viewer holding exactly the grants a test names, where it names any: the way to ask what a page reads beyond its need.
vi.mock('@/data/roles', async (original) => {
  const actual = await original<typeof import('@/data/roles')>();
  return { ...actual, effective: (role: string, addOns: never) => (role === 'Viewer' && policy.viewer ? new Set(policy.viewer) : actual.effective(role as never, addOns)) };
});

import { collections } from '@/data/collections';
import { FEATURES } from '@/data/features';
import { readReleases } from '@/data/engineering';
import { latestRuns } from '@/data/verification';
import { customerFigures } from '@/views/customers-context';
import { MainRegions } from '@/views/overview';
import { releaseFigures } from '@/views/releases-context';
import { ticketCounts } from '@/views/tickets-context';
import { viewTools } from '@/views/tools';

type Row = Record<string, unknown>;
const all = async (name: string) => (await collections.find((c) => c.name === name)!.query({})).rows as Row[];
const tool = viewTools.find((t) => t.name === 'overview')!;
const summaryOf = async () => ((await tool.read({ period: '30d' })).data as { summary: Record<'business' | 'operation' | 'delivery', Record<string, unknown> | null> }).summary;
const needs = [...(FEATURES.overview.needs as unknown as { allOf: readonly string[] }).allOf];
const services = collections.find((c) => c.name === 'services')!;
const query = services.query;

beforeEach(() => { jar.value = 'members_12'; policy.viewer = null; });
afterEach(() => { services.query = query; });

describe('what Main says of the whole product', () => {
  it('counts the business from every customer: how many, by status and by plan, and what they spent', async () => {
    const customers = await all('customers');
    const figures = customerFigures(customers as never);
    const { business } = await summaryOf();
    expect(business!.customers).toBe(figures.customers);
    // The same sum in whatever order the rows were read: a sum of fractions differs in its last digit with the order.
    expect(business!.spend).toBeCloseTo(figures.spend, 6);
    const count = (field: string) => Object.fromEntries([...new Set(customers.map((c) => String(c[field])))].map((v) => [v, customers.filter((c) => c[field] === v).length]));
    expect(business!.byStatus).toEqual(count('status'));
    expect(business!.byPlan).toEqual(count('plan'));
  });

  it('names the services that are not well and the incidents nobody has resolved', async () => {
    const [rows, incidents] = [await all('services'), await all('incidents')];
    const { operation } = await summaryOf();
    expect(operation!.degraded).toEqual(rows.filter((s) => s.status === 'degraded').map((s) => s.name));
    expect(operation!.outage).toEqual(rows.filter((s) => s.status === 'outage').map((s) => s.name));
    expect((operation!.incidents as Row[]).map((i) => i.id).sort()).toEqual(incidents.filter((i) => i.state !== 'resolved').map((i) => i.id).sort());
  });

  it('counts delivery from every ticket, the latest run of each verification and every release', async () => {
    const [tickets, runs] = [await all('tickets'), await all('tests')];
    const counts = ticketCounts(tickets as never);
    const { delivery } = await summaryOf();
    expect(delivery).toMatchObject({ open: counts.open, waiting: counts.waiting });
    expect(delivery!.failing).toBe((latestRuns(runs as never) as unknown as Row[]).filter((r) => r.state === 'failed').length);
    // Live, ready and in testing as the Releases page's own tiles count them: by what the verifications say of a release,
    // not by a state somebody recorded on it.
    const figures = releaseFigures((await readReleases()).rows);
    expect(delivery).toMatchObject({ live: figures.live.length, ready: figures.ready, testing: figures.testing });
    expect(figures.ready + figures.testing).toBeGreaterThan(0);
  });
});

describe('what Main asks to be opened', () => {
  it('names every collection its summaries read, and neither members nor keys', () => {
    for (const grant of ['customers:read', 'days:read', 'services:read', 'incidents:read', 'tickets:read', 'tests:read', 'releases:read']) expect(needs, grant).toContain(grant);
    expect(needs.filter((g) => /^(members|keys|workspace):/.test(g))).toEqual([]);
    expect(new Set(needs).size).toBe(needs.length);
  });

  it('reads nothing beyond that: a person holding exactly those grants gets all three summaries', async () => {
    policy.viewer = [...needs];
    const summary = await summaryOf();
    expect(summary.business).not.toBeNull();
    expect(summary.operation).not.toBeNull();
    expect(summary.delivery).not.toBeNull();
  });

  it('refuses a person who lacks one of them, before anything is read', async () => {
    policy.viewer = needs.filter((g) => g !== 'tickets:read');
    await expect(tool.read({ period: '30d' })).rejects.toBeTruthy();
  });
});

describe('a summary whose data did not arrive', () => {
  it('is missing, not zero, and the other two still answer', async () => {
    services.query = async () => { throw new Error('The store did not answer.'); };
    const summary = await summaryOf();
    expect(summary.operation).toBeNull();
    expect(summary.business).not.toBeNull();
    expect(summary.delivery).not.toBeNull();
  });
});

describe('the three regions on the page', () => {
  const summary = {
    business: { customers: 12, byStatus: { active: 9, trial: 2, 'past due': 1 }, byPlan: { Enterprise: 3, Scale: 5, Starter: 4 }, spend: 48210.5 },
    operation: { degraded: ['Inference API'], outage: [], incidents: [{ id: 'inc_1', title: 'Elevated latency in eu-west-1' }] },
    delivery: { open: 4, waiting: 3, failing: 2, live: 3, ready: 1, testing: 3 },
  };
  const hrefs = (region: HTMLElement) => within(region).getAllByRole('link').map((a) => a.getAttribute('href') ?? '');
  const region = (name: string) => screen.getByRole('region', { name });

  it('are Business, Operation and Delivery, each with its figures and a way into its detail', () => {
    render(<MainRegions summary={summary as never} />);
    expect(region('Business').textContent).toContain('12');
    expect(hrefs(region('Business')).some((h) => h.startsWith('/customers'))).toBe(true);
    expect(hrefs(region('Business')).some((h) => h.startsWith('/analytics'))).toBe(true);
    expect(region('Operation').textContent).toContain('Inference API');
    expect(region('Operation').textContent).toContain('Elevated latency in eu-west-1');
    expect(hrefs(region('Operation')).every((h) => h.startsWith('/health'))).toBe(true);
    for (const page of ['/operations-tickets', '/tests', '/releases']) expect(hrefs(region('Delivery')).some((h) => h.startsWith(page)), page).toBe(true);
  });

  it('say that a summary is unavailable, and draw no figure for it', () => {
    render(<MainRegions summary={{ ...summary, delivery: null } as never} />);
    expect(region('Delivery').textContent).toMatch(/unavailable/i);
    expect(within(region('Delivery')).queryAllByRole('link')).toEqual([]);
    expect(region('Business').textContent).toContain('12');
  });
});

describe('Main, as a workspace home', () => {
  it('says who the workspace is for, in the words the declaration holds', () => {
    expect(fs.readFileSync(path.resolve(import.meta.dirname, '../app/(dashboard)/(overview)/page.tsx'), 'utf8')).toMatch(/workspaces\.main\.audience/);
  });
});

describe('what the assistant is told of Main', () => {
  it('is the same figures, under the labels the pages they come from use', async () => {
    const { context, data } = await tool.read({ period: '30d' });
    const summary = (data as { summary: Record<string, Record<string, unknown>> }).summary;
    const fact = (label: string) => context.facts.find((f) => f.label === label)?.value;
    expect(fact('Customers')).toBe(String(summary.business.customers));
    expect(fact('Open tickets')).toBe(String(summary.delivery.open));
    expect(fact('Waiting tickets')).toBe(String(summary.delivery.waiting));
    expect(fact('Failing now')).toBe(String(summary.delivery.failing));
    expect(fact('Live versions')).toBe(String(summary.delivery.live));
    expect(fact('Ready to release')).toBe(String(summary.delivery.ready));
    expect(fact('In testing')).toBe(String(summary.delivery.testing));
  });
});
