// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import { AccessDenied } from '@/data/access';
import { collections } from '@/data/collections';
import { read } from '@/data/read';
import { MAIN_ROLES, whoCan } from '@/data/roles';

/**
 * The records the company's pages state: each collection the data model adds or changes, with its key, its fields and
 * who may read it. A field that is missing fails by name, never by a thrown error.
 */
const of = (name: string) => {
  const c = collections.find((x) => x.name === name);
  if (!c) throw new Error(`the product has no collection "${name}"`);
  return c;
};
const fields = (name: string) => Object.keys(of(name).fields.shape);
const takes = (name: string, field: string, value: unknown): boolean => of(name).fields.shape[field]?.safeParse(value).success ?? false;
const PERSONAS = { Owner: 'members_1', Admin: 'members_2', Member: 'members_4', Viewer: 'members_12' } as const;

beforeEach(() => { jar.value = undefined; });

describe('the collections the company adds', () => {
  it.each([
    ['models', 'id', ['label', 'serves', 'inputPrice', 'outputPrice', 'callPrice']],
    ['usage', 'id', ['date', 'model', 'requests', 'inputTokens', 'outputTokens', 'revenue', 'errors', 'p95', 'ttft', 'tps']],
    ['compute', 'id', ['date', 'region', 'gpus', 'used']],
    ['costs', 'date', ['compute']],
  ] as const)('%s is keyed by %s and holds its fields, and nobody writes it', (name, key, want) => {
    const c = of(name);
    expect(c.key).toBe(key);
    for (const field of want) expect(fields(name), `${name}.${field}`).toContain(field);
    expect([c.create, c.update, c.remove]).toEqual([undefined, undefined, undefined]);
  });

  it('lets a price, a time to first token and a rate be absent where the model has none', () => {
    for (const field of ['inputPrice', 'outputPrice', 'callPrice']) expect(takes('models', field, null), `models.${field}`).toBe(true);
    for (const field of ['ttft', 'tps']) expect(takes('usage', field, null), `usage.${field}`).toBe(true);
  });

  it('holds four models, and says which route each serves', async () => {
    const models = (await of('models').query({})).rows as { id: string; serves: string }[];
    expect(Object.fromEntries(models.map((m) => [m.id, m.serves]))).toEqual({
      'meridian-large': '/v1/messages',
      'meridian-swift': '/v1/messages',
      'meridian-embed': '/v1/embeddings',
      none: 'every other route',
    });
  });
});

describe('the collections the company changes', () => {
  it('a day holds its tokens, its revenue and its revenue by plan', () => {
    for (const field of ['requests', 'errors', 'p95', 'tokens', 'revenue', 'revenueByPlan']) expect(fields('days'), field).toContain(field);
    expect(takes('days', 'revenueByPlan', { Enterprise: 1, Scale: 2, Starter: 3 })).toBe(true);
  });

  it('a customer holds what it paid, its tokens and its requests by route, when it joined, changed plan and left, its trial and its debt, and its owner', () => {
    for (const field of ['revenue', 'joined', 'tokens', 'byEndpoint', 'planSince', 'previousPlan', 'left', 'trialEnds', 'pastDueSince', 'owner']) expect(fields('customers'), field).toContain(field);
    for (const status of ['active', 'trial', 'past due', 'left']) expect(takes('customers', 'status', status), status).toBe(true);
    for (const field of ['planSince', 'previousPlan', 'left', 'trialEnds', 'pastDueSince']) expect(takes('customers', field, null), `customers.${field}`).toBe(true);
  });
});

describe('who may read them', () => {
  it('what compute cost is an Owner\'s and an Admin\'s to read, by the role table', () => {
    expect(whoCan('costs:read')).toEqual(['Owner', 'Admin']);
    for (const grant of ['models:read', 'usage:read', 'compute:read', 'days:read', 'customers:read'] as const) expect(whoCan(grant), grant).toEqual([...MAIN_ROLES]);
  });

  it('and by the read itself: a Member and a Viewer are refused the costs and given everything else', async () => {
    for (const [role, id] of Object.entries(PERSONAS)) {
      jar.value = id;
      for (const name of ['models', 'usage', 'compute', 'days', 'customers']) expect((await read(name, { limit: 1 })).total, `${role} reads ${name}`).toBeGreaterThan(0);
      const costs = await read('costs', { limit: 1 }).then((r) => r.total, (e: unknown) => e);
      if (role === 'Owner' || role === 'Admin') expect(costs, `${role} reads costs`).toBeGreaterThan(0);
      else expect(costs, `${role} is refused costs`).toBeInstanceOf(AccessDenied);
    }
  });
});
