// Named cli-* so the payload leaves it out: it is about the sample's own Now, Home and Revenue, which a product replaces.
import { renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fail = vi.hoisted(() => ({ names: new Set<string>() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/engineering',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));
// A collection named in `fail` cannot be read.
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  const refuse = (name: string) => { if (fail.names.has(name)) throw new Error(`${name} is unavailable`); };
  return {
    ...real,
    read: async (name: string, q?: unknown) => { refuse(name); return real.read(name, q as never); },
    readAll: async (name: string, q?: unknown) => { refuse(name); return real.readAll(name, q as never); },
  };
});

import { verificationOf } from '@/data/verification';
import { ACTIVITY, DEMO_NOW, DEMO_UPDATED_AT, INCIDENTS, MODELS, SERVICES } from '@/system/fixtures/sample';
import { COMPUTE, ENDPOINTS, USAGE } from '@/system/fixtures/company';
import { RELEASES, RUNS, TICKETS } from '@/system/fixtures/sample-engineering';
import { HomeBody } from '@/views/home';
import { NowBody } from '@/views/now';
import { nowContext } from '@/logic/now-context';
import { nowData, type NowReads } from '@/logic/now-parts';
import { RevenueBody } from '@/views/revenue';
import { homeTool, revenueTool } from '@/logic/tools';

beforeEach(() => { fail.names.clear(); });

const reads: NowReads = {
  services: SERVICES, incidents: INCIDENTS.map(({ owner, ticketId: _, ...i }) => ({ ...i, ...(owner ? { owner } : {}) })),
  releases: RELEASES.map((r) => ({ ...r, verification: verificationOf(r, RUNS) })),
  runs: RUNS.map((r) => ({ ...r, release: null })),
  history: null, usage: USAGE, models: MODELS, compute: COMPUTE, endpoints: ENDPOINTS,
  tickets: TICKETS.map((t) => ({ ...t, assignee: null })),
  activity: ACTIVITY, reader: 'members_1', updatedAt: DEMO_UPDATED_AT.toISOString(), now: DEMO_NOW.toISOString(),
};
const today = DEMO_NOW.toISOString().slice(0, 10);
const drawn = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
const now = (r: NowReads) => drawn(renderToStaticMarkup(<Tooltip.Provider><NowBody {...nowData(r)} /></Tooltip.Provider>));

describe('Now names what could not be read, and only that', () => {
  it('says no complete day of compute is recorded yet when the compute was read and holds only today', () => {
    const r = { ...reads, compute: COMPUTE.filter((c) => c.date === today) };
    const data = nowData(r);
    expect(data.compute).toBeNull();
    expect(data.unread).not.toContain('the compute');
    const text = now(r);
    expect(text).not.toMatch(/The compute could not be read/);
    expect(text).toMatch(/No complete day of compute is recorded yet/);
    expect(nowContext(data).unknowns.join(' ')).not.toMatch(/compute/i);
  });

  it('says the compute could not be read when its read failed', () => {
    expect(now({ ...reads, compute: null })).toMatch(/The compute could not be read/);
  });

  it('blames the usage, not the models, when the usage could not be read', () => {
    const data = nowData({ ...reads, usage: null });
    expect(data.unread).toContain('the usage');
    expect(data.unread).not.toContain('the models');
    const text = now({ ...reads, usage: null });
    expect(text).toMatch(/The usage could not be read/);
    expect(text).not.toMatch(/The models could not be read/);
    expect(nowContext(data).unknowns.join(' ')).toMatch(/The usage could not be read, so no model's figures are stated\./);
  });

  it('names both when both could not be read', () => {
    expect(nowData({ ...reads, usage: null, models: null }).unread).toEqual(expect.arrayContaining(['the usage', 'the models']));
    expect(now({ ...reads, usage: null, models: null })).toMatch(/The usage and the models could not be read/);
  });
});

describe("Home's What we sell names what could not be read", () => {
  it('blames the models when the models read failed and the usage was read', async () => {
    fail.names.add('models');
    const { data } = await homeTool.read({ period: '30d' });
    expect(data.unread).toContain('the models');
    expect(data.unread).not.toContain('the usage by model');
    const text = drawn(renderToStaticMarkup(<Tooltip.Provider><HomeBody {...data} /></Tooltip.Provider>));
    expect(text).toMatch(/The models could not be read/);
    expect(text).not.toMatch(/The usage by model could not be read/);
  });

  it('names both when both failed', async () => {
    fail.names.add('models');
    fail.names.add('usage');
    const { data } = await homeTool.read({ period: '30d' });
    expect(data.unread).toEqual(expect.arrayContaining(['the usage by model', 'the models']));
    expect(drawn(renderToStaticMarkup(<Tooltip.Provider><HomeBody {...data} /></Tooltip.Provider>))).toMatch(/The usage by model and the models could not be read/);
  });
});

describe("Revenue's What they buy names what could not be read", () => {
  const revenue = async () => drawn(renderToStaticMarkup(<Tooltip.Provider><RevenueBody {...(await revenueTool.read({ period: '30d' })).data} /></Tooltip.Provider>));

  it('blames the models when the models read failed and the usage was read', async () => {
    fail.names.add('models');
    const text = await revenue();
    expect(text).toMatch(/The models could not be read/);
    expect(text).not.toMatch(/The usage by model could not be read/);
  });

  it('names both when both failed', async () => {
    fail.names.add('models');
    fail.names.add('usage');
    expect(await revenue()).toMatch(/The usage by model and the models could not be read/);
  });
});
