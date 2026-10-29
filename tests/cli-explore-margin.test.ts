// @vitest-environment node
// Named cli-* so the payload leaves it out: it asks the sample's own Home of the sample's records.
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import { runExplore, type PreparedQuery } from '@/lib/explore';
import { homeExplore } from '@/logic/home-explore';
import { homeTool } from '@/logic/tools';
import { io, rights } from './cli-explore-kit';

/**
 * Home's prepared query states the gross margin as Home does (FR-39): a percentage of the same complete days, and its
 * change on the window before in percentage points, "unchanged" under 0.05 and else to one decimal, so an agent quoting
 * it says what the page says.
 */
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

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
