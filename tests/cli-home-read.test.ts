// @vitest-environment node
// Named cli-* so the payload leaves it out: it holds the sample's own figures, which a product replaces.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const fail = vi.hoisted(() => ({ names: new Set<string>() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
// A collection named in `fail` cannot be read: every read of the product goes through these two functions.
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  const refuse = (name: string) => { if (fail.names.has(name)) throw new Error(`${name} is unavailable`); };
  return {
    ...real,
    read: async (name: string, q?: unknown) => { refuse(name); return real.read(name, q as never); },
    readAll: async (name: string, q?: unknown) => { refuse(name); return real.readAll(name, q as never); },
  };
});

import { formatCompact, formatCost, formatPercent } from '@/lib/format';
import { readAll } from '@/data/read';
import { contextText } from '@/lib/shared-context';
import { homeTool } from '@/logic/tools';
import { PERIODS } from '@/lib/period';
import type { CustomerRecord } from '@/data/sample';

const PERSONAS = { owner: 'members_1', admin: 'members_2', member: 'members_4', viewer: 'members_12' };

beforeEach(() => { jar.value = undefined; fail.names.clear(); });

/** Home's read as one person. */
const as = async (id: string, input: Parameters<typeof homeTool.read>[0] = { period: '30d' }) => { jar.value = id; return homeTool.read(input); };
/** Every key of a value, at any depth. */
const keys = (v: unknown): string[] => (v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)]) : []);
/**
 * The customers that have not left and what they paid, from the rows Home's read reads: the largest, and the share of
 * the revenue it pays. The concentration line is worked out from these, so the figure is the data's and not a pin.
 */
async function company(): Promise<{ largest: string; share: string }> {
  jar.value = PERSONAS.owner;
  const { rows } = await readAll('customers');
  const kept = (rows as CustomerRecord[]).filter((c) => c.status !== 'left');
  const revenue = kept.reduce((n, c) => n + Math.round(c.revenue * 100), 0) / 100;
  const largest = [...kept].sort((a, b) => b.revenue - a.revenue)[0]!;
  return { largest: largest.name, share: formatPercent(largest.revenue / revenue, 1) };
}

describe('what Home is handed from the product', () => {
  it('writes a count in trillions with its own step', () => {
    expect(formatCompact(2_234_100_000_000)).toBe('2.2T');
    expect(formatCompact(999_960_000_000)).toBe('1.0T');
    expect(formatCompact(1_101_098_030)).toBe('1.1B');
  });
});

describe("Home's context states the company", () => {
  it("for an Owner, with the figures of Home's parts", async () => {
    const { largest, share } = await company();
    const { context, data } = await as(PERSONAS.owner);
    const text = contextText(context);
    // Revenue, customers that have not left and the active ones, the services, and gross margin and compute cost.
    for (const said of [formatCost(data.revenue!.value), String(data.customers!.count), String(data.customers!.active), formatPercent(data.grossMargin!.value, 1), formatCost(data.computeCost!.value)]) {
      expect(text, said).toContain(said);
    }
    expect(text).toContain(`${data.services!.operational} of ${data.services!.of} operational`);
    expect(text).toMatch(/gross margin/i);
    expect(text).toMatch(/compute cost/i);
    // Worth knowing: the customer at or over the configured share, with its share.
    expect(text).toContain(`${largest} pays ${share}`);
  });

  // Its budget, at every period and with a day pointed at, is held in tests/cli-context-budget.test.ts.
  it('names the day pointed at', async () => {
    // 2026-09-21 is the test's own input, written as the product writes a day.
    const pointed = contextText((await as(PERSONAS.owner, { period: '30d', day: '2026-09-21' })).context);
    expect(pointed).toContain('21 Sept');
  });

  it('names a customer as concentrated only at the configured share', async () => {
    const { largest, share } = await company();
    vi.resetModules();
    vi.doMock('@/app.config', async (load) => {
      const real = await load<typeof import('@/app.config')>();
      return { ...real, facts: { ...real.facts, concentrationAt: 0.13 } };
    });
    const { homeTool: tool } = await import('@/logic/tools');
    jar.value = PERSONAS.owner;
    const { context, data } = await tool.read({ period: '30d' });
    vi.doUnmock('@/app.config');
    vi.resetModules();
    // A share under 13% is not concentrated, and every other figure stands.
    expect(contextText(context)).not.toContain(`${largest} pays ${share}`);
    expect(contextText(context)).toContain(formatCost(data.revenue!.value));
  });
});

describe('compute cost and gross margin', () => {
  it('reach an Owner and an Admin', async () => {
    for (const id of [PERSONAS.owner, PERSONAS.admin]) {
      const { context, data } = await as(id);
      expect(contextText(context), id).toMatch(/gross margin/i);
      expect(keys(data).some((k) => /cost|margin/i.test(k)), id).toBe(true);
    }
  });

  it('reach nobody else, with nothing in their place', async () => {
    const cost = formatCost((await as(PERSONAS.owner)).data.computeCost!.value);
    for (const id of [PERSONAS.member, PERSONAS.viewer]) {
      for (const period of PERIODS) {
        const { context, data } = await as(id, { period });
        const text = contextText(context);
        expect(text, `${id} ${period}`).not.toMatch(/compute cost|gross margin|\bmargin\b/i);
        expect(text, `${id} ${period}`).not.toContain(cost);
        // Not a null or a dash under the name: no key of the data names a cost or a margin.
        expect(keys(data).filter((k) => /cost|margin/i.test(k)), `${id} ${period}`).toEqual([]);
      }
      // Compute in use is every role's.
      expect(contextText((await as(id)).context), id).toMatch(/compute in use/i);
    }
  });
});

describe('a read that fails', () => {
  it('leaves the rest of Home standing and the context saying what could not be read', async () => {
    fail.names.add('usage');
    const { context, data } = await as(PERSONAS.owner);
    const text = contextText(context);
    expect(text).toContain(formatCost(data.revenue!.value));
    expect(text).toMatch(/could not be read/i);
  });

  it('of the days still answers, as Home, saying the days could not be read', async () => {
    fail.names.add('days');
    const { context } = await as(PERSONAS.owner);
    expect(context.title).toBe('Home');
    expect(contextText(context)).toMatch(/could not be read/i);
  });
});
