// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }), headers: async () => new Headers() }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
// A product whose first day has not closed yet: the period holds no day, so it measured no error rate.
vi.mock('@/data/metrics', async (orig) => {
  const real = await orig<typeof import('@/data/metrics')>();
  const { totalsOf } = await import('@/lib/totals');
  return { ...real, readDays: async () => ({ series: [], previous: [], totals: { current: totalsOf([]), previous: null }, running: null, observedAt: '2026-10-03T09:00:00Z' }) };
});

import { contextText } from '@/lib/shared-context';
import { customerContext } from '@/logic/customer-context';
import { readCustomer } from '@/logic/tools';
import { collections } from '@/data/collections';

describe('a customer read against a product with no complete day yet', () => {
  it('is not compared with an error rate the product never measured', async () => {
    const { rows } = await collections.find((c) => c.name === 'customers')!.query({ limit: 1 });
    const data = (await readCustomer(String(rows[0].id)))!;
    expect(data.product?.errorRate).toBeNull();
    expect(contextText(customerContext(data))).not.toMatch(/against the product's/);
  });
});
