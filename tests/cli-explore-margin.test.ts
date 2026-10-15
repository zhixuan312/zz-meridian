// @vitest-environment node
// Named cli-* so the payload leaves it out: it asks the sample's own Home of the sample's records.
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { can, resolveAccess } from '@/data/access';
import { clock, collections } from '@/data/collections';
import { aggregate, read } from '@/data/read';
import { runExplore, type ExploreIO, type ExploreRights, type PreparedQuery } from '@/lib/explore';
import { homeExplore } from '@/views/home-explore';
import { homeTool } from '@/views/tools';

/**
 * Home's prepared query states the gross margin as Home does (FR-39): a percentage of the same complete days, and its
 * change on the window before in percentage points, "unchanged" under 0.05 and else to one decimal, so an agent quoting
 * it says what the page says.
 */
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
async function rights(): Promise<ExploreRights> {
  const scope = await resolveAccess();
  const readable = new Set<string>();
  for (const c of collections) if (await can(scope, c.name, 'read')) readable.add(c.name);
  return { readable, hidden: (name) => ((collections.find((c) => c.name === name)?.hidden ?? []) as string[]) };
}
const io = (): ExploreIO => ({ aggregate, read: (name, q) => read(name, q), today: clock().toISOString().slice(0, 10) });

describe("Home's prepared query and Home agree on the gross margin", () => {
  it('in percent over the last 30 complete days, and its change in points', async () => {
    const m = (await homeTool.read({ period: '30d' })).data.grossMargin!;
    expect(m.previous).not.toBeNull();
    const { answer } = await runExplore(homeExplore as PreparedQuery, { source: 'days', measures: ['grossMargin'], period: '30d', compare: true }, await rights(), io(), '/', z.object({}));
    expect(answer).toContain(`${fmt(m.value * 100)} %`);
    const line = answer.split('\n').find((l) => l.startsWith('The window before')) ?? '';
    expect(line).toContain(`${fmt(m.previous! * 100)} %`);
    const points = (m.value - m.previous!) * 100;
    expect(line).toContain(Math.abs(points) < 0.05 ? 'unchanged' : `${points > 0 ? 'up' : 'down'} ${Math.abs(points).toFixed(1)} points`);
  });
});
