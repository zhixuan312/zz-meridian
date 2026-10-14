import fs from 'node:fs';
import path from 'node:path';
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
import { customerFigures } from '@/views/customers-context';
import type { HomeData } from '@/views/home-context';
import { releaseFigures } from '@/views/releases-context';
import { ticketCounts } from '@/views/tickets-context';
import { viewTools } from '@/views/tools';

type Row = Record<string, unknown>;
const all = async (name: string) => (await collections.find((c) => c.name === name)!.query({})).rows as Row[];
const tool = viewTools.find((t) => t.name === 'home')!;
const homeOf = async () => (await tool.read({ period: '30d' })).data as HomeData;
/** A team card's line, by its label. */
const line = (team: HomeData['business'], label: string) => team.lines.find((l) => l.label === label)?.value;
const needs = [...(FEATURES.home.needs as unknown as { allOf: readonly string[] }).allOf];
const services = collections.find((c) => c.name === 'services')!;
const query = services.query;

beforeEach(() => { jar.value = 'members_12'; policy.viewer = null; });
afterEach(() => { services.query = query; });

describe("what Home's two team cards say of the whole product", () => {
  it('Business counts every customer that has not left: how many, on a trial and past due, and what they paid', async () => {
    const every = await all('customers');
    const figures = customerFigures(every as never);
    // A customer that has left keeps its record and is in no count: not the total, not a status.
    const customers = every.filter((c) => c.status !== 'left');
    expect(every.length).toBeGreaterThan(customers.length);
    expect(customers).toHaveLength(figures.customers);
    const { business, customers: tile } = await homeOf();
    expect(line(business, 'Customers')).toBe(String(figures.customers));
    expect(line(business, 'On a trial')).toBe(String(customers.filter((c) => c.status === 'trial').length));
    expect(line(business, 'Past due')).toBe(String(figures.pastDue.length));
    // The card and the tile beside the revenue card count the same customers.
    expect(tile!.count).toBe(figures.customers);
    expect(business.href).toBe('/business');
  });

  it('Engineering counts the services operational, the incidents nobody has resolved, the releases in testing and the open tickets', async () => {
    const [rows, incidents, tickets] = [await all('services'), await all('incidents'), await all('tickets')];
    const { engineering } = await homeOf();
    expect(line(engineering, 'Services operational')).toBe(`${rows.filter((s) => s.status === 'operational').length} of ${rows.length}`);
    expect(line(engineering, 'Incidents open')).toBe(String(incidents.filter((i) => i.state !== 'resolved').length));
    // In testing as the Releases page's own tiles count them: by what the verifications say of a release, not by a state somebody recorded on it.
    expect(line(engineering, 'Releases in testing')).toBe(String(releaseFigures((await readReleases()).rows).testing));
    expect(line(engineering, 'Tickets open')).toBe(String(ticketCounts(tickets as never).open));
    expect(engineering.href).toBe('/engineering');
  });
});

describe('what Home asks to be opened', () => {
  it('names every collection its parts read, and neither members nor keys nor what compute cost', () => {
    for (const grant of ['customers:read', 'days:read', 'usage:read', 'models:read', 'compute:read', 'services:read', 'incidents:read', 'tickets:read', 'releases:read']) expect(needs, grant).toContain(grant);
    expect(needs.filter((g) => /^(members|keys|workspace|costs):/.test(g))).toEqual([]);
    expect(new Set(needs).size).toBe(needs.length);
  });

  it('reads nothing beyond that: a person holding exactly those grants gets every part', async () => {
    policy.viewer = [...needs];
    const data = await homeOf();
    expect(data.unread).toEqual([]);
    for (const team of [data.business, data.engineering]) expect(team.lines.map((l) => l.value)).not.toContain('—');
  });

  it('refuses a person who lacks one of them, before anything is read', async () => {
    policy.viewer = needs.filter((g) => g !== 'tickets:read');
    await expect(tool.read({ period: '30d' })).rejects.toBeTruthy();
  });
});

describe('a part whose data did not arrive', () => {
  it('is missing, not zero, and the rest still answers', async () => {
    services.query = async () => { throw new Error('The store did not answer.'); };
    const data = await homeOf();
    expect(data.services).toBeNull();
    expect(data.unread).toContain('the services');
    expect(line(data.engineering, 'Services operational')).toBe('—');
    expect(line(data.business, 'Customers')).not.toBe('—');
    expect(line(data.engineering, 'Tickets open')).not.toBe('—');
  });
});

describe('Main, as a workspace home', () => {
  it('says who the workspace is for, in the words the declaration holds', () => {
    expect(fs.readFileSync(path.resolve(import.meta.dirname, '../app/(dashboard)/(home)/page.tsx'), 'utf8')).toMatch(/workspaces\.main\.audience/);
  });
});

describe('what the assistant is told of Main', () => {
  it('is the company\'s figures, worked out by the functions the pages they come from use', async () => {
    const { context } = await tool.read({ period: '30d' });
    const fact = (label: string) => context.facts.find((f) => f.label === label)?.value;
    const customers = (await all('customers')).filter((c) => c.status !== 'left');
    const status = (s: string) => customers.filter((c) => c.status === s).length;
    expect(fact('Customers')).toBe(`${customerFigures(customers as never).customers}: ${status('active')} active, ${status('trial')} on a trial, ${status('past due')} past due`);
    const services = await all('services');
    expect(fact('Services')).toMatch(new RegExp(`^${services.filter((s) => s.status === 'operational').length} of ${services.length} operational`));
    const { testing } = releaseFigures((await readReleases()).rows);
    expect(fact('Engineering')).toBe(`Releases in testing ${testing}, tickets open ${ticketCounts(await all('tickets') as never).open}`);
  });
});
