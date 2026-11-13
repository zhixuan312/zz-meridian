// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the sample's personas and records, which a product replaces.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
/** `times` repeats a collection's rows, each copy a record of its own, so a context is read with more in it than the sample holds. */
const store = vi.hoisted(() => ({ times: new Map<string, number>() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  const more = (name: string, rows: Record<string, unknown>[]) => {
    const k = store.times.get(name) ?? 1;
    return rows.flatMap((row) => Array.from({ length: k }, (_, i) => (i === 0 ? row : { ...row, id: `${String(row.id)}_${i}`, ...(typeof row.name === 'string' ? { name: `${row.name} ${i + 1}` } : {}) })));
  };
  return {
    ...real,
    read: async (name: string, q?: unknown) => { const r = await real.read(name, q as never); const rows = more(name, r.rows as Record<string, unknown>[]); return { ...r, rows, total: rows.length }; },
    readAll: async (name: string, q?: unknown) => { const r = await real.readAll(name, q as never); return { ...r, rows: more(name, r.rows as Record<string, unknown>[]) }; },
  };
});

import { contextText, type SharedContext } from '@/lib/shared-context';
import { readAll } from '@/data/read';
import { PERIODS } from '@/lib/period';
import { viewTools } from '@/logic/tools';
import { homeContext, type HomeData } from '@/logic/home-context';
import { usageContext, type UsageData } from '@/logic/usage-context';
import { settingsContext } from '@/views/settings';

const BUDGET = 2600;
const PERSONAS = { owner: 'members_1', admin: 'members_2', member: 'members_4', keyManager: 'members_5', viewer: 'members_12' } as const;
const tool = (name: string) => viewTools.find((t) => t.name === name)!;

/** What a view is read with: every period it takes, every record it names, every day it may be pointed at. */
async function inputsOf(name: string): Promise<Record<string, unknown>[]> {
  const shape = tool(name).input.shape as Record<string, unknown>;
  if (name === 'request') return ((await readAll('requests')).rows as { id: string }[]).slice(0, 40).map((r) => ({ id: r.id }));
  if (name === 'customer') return ((await readAll('customers')).rows as { id: string }[]).map((c) => ({ id: c.id }));
  const periods = 'period' in shape ? PERIODS.map((period) => ({ period })) : [{}];
  return periods;
}

/** A context's length, or null when the persona may not read the view at all. */
async function lengthOf(name: string, input: Record<string, unknown>): Promise<{ length: number; context: SharedContext } | null> {
  try {
    const { context } = await tool(name).read(input as never);
    return { length: contextText(context).length, context };
  } catch (e) {
    if (/do not have access/i.test((e as Error).message)) return null;
    throw e;
  }
}

/** The period's complete days the tool points at, in the order its own read names them. */
function daysOf(name: string, data: unknown): { date: string }[] {
  const shaped = data as { series?: { date: string }[]; days?: { series: { date: string }[] } };
  return shaped.series ?? shaped.days?.series ?? [];
}

/**
 * The index into the series the view's own `read` works out for `day`: Home counts the period's days, Usage the period's
 * days and then the day in progress (`src/logic/tools.ts`).
 */
function indexOf(name: string, data: unknown, date: string): number {
  const shaped = data as { series?: { date: string }[]; days?: { series: { date: string }[]; running?: { date: string } } };
  const series = name === 'home' ? shaped.series ?? [] : [...(shaped.days?.series ?? []), ...(shaped.days?.running ? [shaped.days.running] : [])];
  return series.findIndex((x) => x.date === date);
}

/**
 * The context the view's own `read` would return pointed at `day`, built from the one read of its period: a read with a
 * day differs from one without it only in the `day` field the page reads, and the context is the same function of the
 * index into the series the tool passes it. The case below proves the two contexts are the same.
 */
function contextAt(name: string, data: unknown, date: string): SharedContext {
  const index = indexOf(name, data, date);
  return name === 'home' ? homeContext(data as HomeData, index >= 0 ? index : null) : usageContext(data as UsageData, index >= 0 ? index : null);
}

beforeEach(() => { jar.value = undefined; store.times.clear(); });

/** One view read as one persona, or null when that persona may not read the view at all. */
type Read = { name: string; input: Record<string, unknown>; got: { length: number; context: SharedContext } | null };

/**
 * Every view read once as each persona, computed once for the file: the reads are the expensive half of every case
 * below, and they are all made with only the persona's own access in the jar. Each case asserts the results of its own
 * persona, and the run's cases are read-only.
 */
const reads = new Map<string, Read[]>();
beforeAll(async () => {
  for (const [persona, id] of Object.entries(PERSONAS)) {
    jar.value = id;
    const out: Read[] = [];
    for (const t of viewTools) for (const input of await inputsOf(t.name)) out.push({ name: t.name, input, got: await lengthOf(t.name, input) });
    reads.set(persona, out);
  }
  jar.value = undefined;
}, 240_000);

describe(`every view's context fits ${BUDGET} characters and names its address`, () => {
  for (const [persona] of Object.entries(PERSONAS)) {
    it(`for the ${persona}, at every period and for every record it names`, () => {
      let read = 0;
      for (const { name, input, got } of reads.get(persona)!) {
        if (!got) continue;
        read++;
        expect(got.length, `${name} ${JSON.stringify(input)}`).toBeLessThanOrEqual(BUDGET);
        expect(got.context.address, `${name} names its address`).toMatch(/^\//);
      }
      expect(read).toBeGreaterThan(0);
    }, 120_000);
  }

  // One read a (view, period, persona) and each day built from its index, rather than a read a day: the tool re-reads
  // the collections for a day it was already handed, and a period holds 127 days.
  it('pointed at a day: each view that takes a day, at every day of every period, for an Owner and a Viewer', async () => {
    const pointed = viewTools.filter((t) => 'day' in (t.input.shape as Record<string, unknown>)).map((t) => t.name);
    for (const id of [PERSONAS.owner, PERSONAS.viewer]) {
      jar.value = id;
      for (const name of pointed) {
        for (const period of PERIODS.filter((p) => p !== 'all')) {
          const { data } = await tool(name).read({ period } as never);
          const days = daysOf(name, data);
          expect(days.length, `${name} ${period} has days`).toBeGreaterThan(0);
          for (const { date } of days) {
            const context = contextAt(name, data, date);
            expect(contextText(context).length, `${name} ${period} ${date}`).toBeLessThanOrEqual(BUDGET);
            expect(context.address).toContain(`day=${date}`);
          }
        }
      }
    }
  }, 240_000);

  // The shortcut above is the tool's own answer, not a second one: for one day of each view and persona, the context
  // built from the period's read is exactly the context the tool returns for that day.
  it('builds the same context the tool returns for a day', async () => {
    const pointed = viewTools.filter((t) => 'day' in (t.input.shape as Record<string, unknown>)).map((t) => t.name);
    for (const id of [PERSONAS.owner, PERSONAS.viewer]) {
      jar.value = id;
      for (const name of pointed) {
        const { data } = await tool(name).read({ period: '30d' } as never);
        const date = daysOf(name, data)[Math.floor(daysOf(name, data).length / 2)].date;
        const { context } = await tool(name).read({ period: '30d', day: date } as never);
        expect(contextAt(name, data, date), `${name} ${date}`).toEqual(context);
        expect(contextText(contextAt(name, data, date)), `${name} ${date}`).toBe(contextText(context));
      }
    }
  }, 60_000);

  it("Settings, whose values the page reports: with every section's line at its longest", () => {
    const long = 'x'.repeat(400);
    const context = settingsContext({ Workspace: long, Appearance: long, Assistant: long, 'Agents and MCP': long });
    expect(contextText(context).length).toBeLessThanOrEqual(BUDGET);
    expect(context.address).toBe('/settings');
  });
});

describe('a context holds with more in it than the sample has', () => {
  // Each list a context states is capped and counted: with four to eight times the sample's records, every view still fits.
  const MORE: Record<string, number> = { incidents: 6, services: 4, keys: 8, members: 4, tickets: 4, releases: 4, tests: 4, activity: 4, customers: 4 };

  for (const [persona, id] of Object.entries({ owner: PERSONAS.owner, member: PERSONAS.member })) {
    it(`for the ${persona}`, async () => {
      for (const [name, k] of Object.entries(MORE)) store.times.set(name, k);
      jar.value = id;
      for (const t of viewTools) {
        if (t.name === 'request' || t.name === 'customer') continue;
        for (const input of await inputsOf(t.name)) {
          const got = await lengthOf(t.name, input);
          if (!got) continue;
          expect(got.length, `${t.name} ${JSON.stringify(input)} with more records`).toBeLessThanOrEqual(BUDGET);
        }
      }
    }, 240_000);
  }
});
