// @vitest-environment node
// Named cli-* so the payload leaves it out: it holds the sample's own figures, which a product replaces.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const fail = vi.hoisted(() => ({ names: new Set<string>() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
// A collection named in `fail` cannot be read: every read of the product goes through these two functions.
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  const refuse = (name: string) => { if (fail.names.has(name)) throw new Error(`${name} is unavailable`); };
  return {
    ...real,
    read: async (name: string, q?: unknown) => { refuse(name); return real.read(name, q as never); },
    readAll: async (name: string) => { refuse(name); return real.readAll(name); },
  };
});

import { facts } from '@/app.config';
import { formatCompact } from '@/lib/format';
import { contextText } from '@/lib/shared-context';
import { homeTool } from '@/views/tools';

const PERSONAS = { owner: 'members_1', admin: 'members_2', member: 'members_4', viewer: 'members_12' };
/** What a view's context may take (tests/shared-context.test.tsx holds every view to it). */
const BUDGET = 2600;
const PERIODS = ['7d', '30d', '90d', 'all'] as const;

beforeEach(() => { jar.value = undefined; fail.names.clear(); });

/** Home's read as one person. */
const as = async (id: string, input: Parameters<typeof homeTool.read>[0] = { period: '30d' }) => { jar.value = id; return homeTool.read(input); };
/** Every key of a value, at any depth. */
const keys = (v: unknown): string[] => (v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)]) : []);
/** The line of the context that says Northwind Labs pays a concentrated share. */
const concentrated = /Northwind Labs[^\n]*12\.4%/;

describe('what Home is handed from the product', () => {
  it('reads the share of revenue that counts as concentration from the configuration', () => {
    expect(facts.concentrationAt).toBe(0.1);
  });

  it('writes a count in trillions with its own step', () => {
    expect(formatCompact(2_234_100_000_000)).toBe('2.2T');
    expect(formatCompact(999_960_000_000)).toBe('1.0T');
    expect(formatCompact(1_101_098_030)).toBe('1.1B');
  });
});

describe("Home's context states the company", () => {
  it("for an Owner, with the figures of Home's parts", async () => {
    const text = contextText((await as(PERSONAS.owner)).context);
    // Revenue, customers that have not left and the active ones, the services, and gross margin and compute cost.
    for (const said of ['$3,300,438.74', '320', '296', 'Inference API', '62.4%', '$1,242,000.00']) expect(text, said).toContain(said);
    expect(text).toMatch(/gross margin/i);
    expect(text).toMatch(/compute cost/i);
    // Worth knowing: the customer at or over the configured share, with its share.
    expect(text).toMatch(concentrated);
  });

  it('within its budget at every period, and with a day pointed at', async () => {
    for (const period of PERIODS) {
      const text = contextText((await as(PERSONAS.owner, { period })).context);
      expect(text.length, period).toBeLessThanOrEqual(BUDGET);
    }
    const pointed = contextText((await as(PERSONAS.owner, { period: '30d', day: '2026-09-21' })).context);
    expect(pointed.length).toBeLessThanOrEqual(BUDGET);
    expect(pointed).toContain('21 Sept');
  });

  it('names a customer as concentrated only at the configured share', async () => {
    vi.resetModules();
    vi.doMock('@/app.config', async (load) => {
      const real = await load<typeof import('@/app.config')>();
      return { ...real, facts: { ...real.facts, concentrationAt: 0.13 } };
    });
    const { homeTool: tool } = await import('@/views/tools');
    jar.value = PERSONAS.owner;
    const text = contextText((await tool.read({ period: '30d' })).context);
    vi.doUnmock('@/app.config');
    vi.resetModules();
    // Northwind Labs pays 12.4%: under a share of 13% it is not concentrated, and every other figure stands.
    expect(text).not.toMatch(concentrated);
    expect(text).toContain('$3,300,438.74');
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
    for (const id of [PERSONAS.member, PERSONAS.viewer]) {
      for (const period of PERIODS) {
        const { context, data } = await as(id, { period });
        const text = contextText(context);
        expect(text, `${id} ${period}`).not.toMatch(/compute cost|gross margin|\bmargin\b/i);
        expect(text, `${id} ${period}`).not.toContain('$1,242,000.00');
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
    const text = contextText((await as(PERSONAS.owner)).context);
    expect(text).toContain('$3,300,438.74');
    expect(text).toMatch(/could not be read/i);
  });

  it('of the days still answers, as Home, saying the days could not be read', async () => {
    fail.names.add('days');
    const { context } = await as(PERSONAS.owner);
    expect(context.title).toBe('Home');
    expect(contextText(context)).toMatch(/could not be read/i);
  });
});
