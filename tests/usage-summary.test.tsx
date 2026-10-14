import { render, screen } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { fitFigure, formatCost, formatDuration, formatPercent } from '@/lib/format';
import { contextText } from '@/lib/shared-context';
import { UsageBody } from '@/views/usage';
import { HOME_METRICS } from '@/views/home-context';
import { usageTool, viewTools } from '@/views/tools';

type Totals = { requests: number; errorRate: number; p95: number; revenue: number };
const home = viewTools.find((t) => t.name === 'home')!;
const LABELS = Object.values(HOME_METRICS).map((m) => m.label);
/** The card a tile is, found by the tile's heading. */
const tile = (label: string) => screen.getByRole('heading', { level: 2, name: label }).closest('.card') as HTMLElement;

beforeEach(() => { jar.value = 'members_12'; });

describe('what Usage says of the period', () => {
  it('reads the period\'s totals and those of the period before, the ones the Home reads', async () => {
    for (const period of ['7d', '30d'] as const) {
      const mine = (await usageTool.read({ period })).data.totals;
      const theirs = ((await home.read({ period })).data as { totals: { current: Totals; previous: Totals } }).totals;
      expect(mine, period).toEqual(theirs);
    }
    const [week, month] = [(await usageTool.read({ period: '7d' })).data.totals, (await usageTool.read({ period: '30d' })).data.totals];
    expect(week.current.requests).toBeLessThan(month.current.requests);
  });

  it('draws them as four figures under the Home\'s own labels, each with its change against the period before', async () => {
    const { data } = await usageTool.read({ period: '30d' });
    render(<Tooltip.Provider><UsageBody {...data} /></Tooltip.Provider>);
    const { current: c } = data.totals;
    for (const label of LABELS) expect(tile(label).textContent, label).toMatch(/(up|down|unchanged)[\s\S]*vs previous period/);
    expect(tile('Error rate').textContent).toContain(formatPercent(c.errorRate, 2).replace('%', ''));
    // A tile sets a figure too long for it at a glance ($3.3M); the exact amount is in the context.
    expect(tile('Revenue').textContent).toContain(fitFigure(formatCost(c.revenue), c.revenue));
    expect(tile('Latency p95').textContent).toContain(formatDuration(c.p95));
  });

  it('draws no figure when no request arrived in the period', () => {
    const none = { requests: 0, errorRate: 0, p95: 0, revenue: 0 };
    render(<UsageBody period="30d" activity={[]} incidents={[]} updatedAt="2026-10-05T09:00:00.000Z" now="2026-10-05T09:00:00.000Z" series={[]} totals={{ current: none, previous: none }} heat={[]} hours={[]} regions={[]} endpoints={[]} head={{ title: null, facts: [] }} />);
    expect(screen.queryAllByRole('heading', { level: 2, name: 'Revenue' })).toEqual([]);
  });
});

describe('all time on Usage, which has no period before it', () => {
  it('reads every complete day kept and no period before them, as the Home does', async () => {
    const { data } = await usageTool.read({ period: 'all' });
    expect(data.series).toHaveLength(360);
    expect(data.series.at(-1)!.date).toBe('2026-10-02');
    expect(data.totals.previous).toBeNull();
    expect(data.totals).toEqual(((await home.read({ period: 'all' })).data as { totals: { current: Totals; previous: Totals | null } }).totals);
  });

  it('draws each figure with no change: the tile says there is no earlier period', async () => {
    const { data } = await usageTool.read({ period: 'all' });
    const { container } = render(<Tooltip.Provider><UsageBody {...data} /></Tooltip.Provider>);
    for (const label of LABELS) {
      expect(tile(label).textContent, label).toContain('No earlier period to compare');
      expect(tile(label).textContent, label).not.toMatch(/vs previous period/);
    }
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('tells the assistant no previous period is kept, and gives no figure a change', async () => {
    const { context } = await usageTool.read({ period: 'all' });
    for (const label of LABELS) expect(context.facts.find((f) => f.label === label)!.change, label).toBeUndefined();
    expect(context.unknowns).toContain('No previous period is kept, so no figure has a change.');
    expect(context.scope).toBe('all time, 08 Oct 2025 to 02 Oct 2026 (UTC)');
    expect(contextText(context)).not.toMatch(/NaN|Infinity|vs the previous/);
    // A period with days before it says nothing of the kind.
    expect((await usageTool.read({ period: '90d' })).context.unknowns.join('\n')).not.toMatch(/No previous period/);
  });
});

describe('what the assistant is told of Usage', () => {
  it('is the same four figures, with the change and the figure it is measured against', async () => {
    const { context, data } = await usageTool.read({ period: '30d' });
    const fact = (label: string) => context.facts.find((f) => f.label === label);
    for (const label of LABELS) expect(fact(label)?.change, label).toMatch(/vs the previous 30 days/);
    expect(fact('Requests')!.value).toBe(data.totals.current.requests.toLocaleString('en-US'));
    expect(fact('Revenue')!.value).toBe(formatCost(data.totals.current.revenue));
  });

  it('says that the week\'s pattern, the regions and the endpoints do not follow the period, and never that they are summed over it', async () => {
    const [week, month] = [await usageTool.read({ period: '7d' }), await usageTool.read({ period: '30d' })];
    // They are the same rows whatever the period: the sample holds one fixed week, one list of regions and one of endpoints.
    expect(week.data.heat).toEqual(month.data.heat);
    expect(week.data.regions).toEqual(month.data.regions);
    expect(week.data.endpoints).toEqual(month.data.endpoints);
    for (const { context } of [week, month]) {
      const said = [context.scope, ...context.unknowns, ...context.facts.map((f) => `${f.label} ${f.value}`)].join('\n');
      expect(said).not.toMatch(/summed over (it|the period|the whole period)/);
      expect(context.unknowns.join('\n')).toMatch(/do not follow the period/);
    }
  });

  it('claims no period for them on the page either', async () => {
    const { data } = await usageTool.read({ period: '7d' });
    const { container } = render(<Tooltip.Provider><UsageBody {...data} /></Tooltip.Provider>);
    expect(container.textContent).not.toMatch(/summed over the period|Requests in the period/);
  });
});
