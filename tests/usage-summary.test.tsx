import { render, screen } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { formatCompact, formatDuration, formatPercent } from '@/lib/format';
import { contextText } from '@/lib/shared-context';
// The scope names the project's own timezone, so a project branded to another one still states the same contract.
import { app } from '@/app.config';
import { UsageBody } from '@/views/usage';
import { HOME_METRICS } from '@/views/home-context';
import { usageTool, viewTools } from '@/views/tools';
import type { UsageData } from '@/views/usage-context';

type Totals = { requests: number; errorRate: number; p95: number; revenue: number };
const home = viewTools.find((t) => t.name === 'home')!;
/** The figures the context states of the period, under the Home's own labels. */
const LABELS = [HOME_METRICS.requests.label, HOME_METRICS.errorRate.label, HOME_METRICS.p95.label];
const days = (data: UsageData) => data.days!;

beforeEach(() => { jar.value = 'members_12'; });

describe('what Usage says of the period', () => {
  it('reads the period\'s totals and those of the period before, the ones the Home reads', async () => {
    for (const period of ['7d', '30d'] as const) {
      const mine = days((await usageTool.read({ period })).data).totals;
      const theirs = ((await home.read({ period })).data as { totals: { current: Totals; previous: Totals } }).totals;
      expect(mine, period).toEqual(theirs);
    }
    const [week, month] = [days((await usageTool.read({ period: '7d' })).data).totals, days((await usageTool.read({ period: '30d' })).data).totals];
    expect(week.current.requests).toBeLessThan(month.current.requests);
  });

  it('says under its title the requests a day, the share answered with an error and the median day\'s p95', async () => {
    const { data } = await usageTool.read({ period: '30d' });
    const { current: c } = days(data).totals;
    expect(data.line).toBe(`${formatCompact(c.requests / 30)} requests a day, ${formatPercent(c.errorRate, 2)} of them errors, and a median day's p95 of ${formatDuration(c.p95)}.`);
  });

  it('draws no part when no request has arrived', () => {
    const none = { requests: 0, errorRate: 0, p95: 0, revenue: 0 };
    render(<UsageBody period="30d" day={null} head={{ title: null, facts: [] }} record={null} line={null} days={{ series: [], totals: { current: none, previous: null }, running: null }} calendar={{ days: [], running: false, busiest: null }} figures={null} endpoints={[]} responses={[]} unread={[]} updatedAt="2026-10-05T09:00:00.000Z" now="2026-10-05T09:00:00.000Z" />);
    expect(screen.getByText('No requests have arrived yet')).toBeTruthy();
    expect(screen.queryAllByRole('heading', { level: 2 })).toEqual([]);
  });
});

describe('all time on Usage, which has no period before it', () => {
  it('reads every complete day kept and no period before them, as the Home does', async () => {
    const { data } = await usageTool.read({ period: 'all' });
    expect(days(data).series).toHaveLength(360);
    expect(days(data).series.at(-1)!.date).toBe('2026-10-02');
    expect(days(data).totals.previous).toBeNull();
    expect(days(data).totals).toEqual(((await home.read({ period: 'all' })).data as { totals: { current: Totals; previous: Totals | null } }).totals);
  });

  it('tells the assistant no previous period is kept, and gives no figure a change', async () => {
    const { context } = await usageTool.read({ period: 'all' });
    for (const label of LABELS) expect(context.facts.find((f) => f.label === label)!.change, label).toBeUndefined();
    expect(context.unknowns).toContain('No previous period is kept, so no figure has a change.');
    expect(context.scope).toBe(`all time, 08 Oct 2025 to 02 Oct 2026 (${app.timezone})`);
    expect(contextText(context)).not.toMatch(/NaN|Infinity|vs the previous/);
    // A period with days before it says nothing of the kind.
    expect((await usageTool.read({ period: '90d' })).context.unknowns.join('\n')).not.toMatch(/No previous period/);
  });

  it('draws no change and nothing that is not a number', async () => {
    const { data } = await usageTool.read({ period: 'all' });
    const { container } = render(<Tooltip.Provider><UsageBody {...data} /></Tooltip.Provider>);
    expect(container.textContent).not.toMatch(/NaN|Infinity|vs previous period/);
  });
});

describe('what the assistant is told of Usage', () => {
  it('is the period\'s figures, with the change and the figure it is measured against', async () => {
    const { context, data } = await usageTool.read({ period: '30d' });
    const fact = (label: string) => context.facts.find((f) => f.label === label);
    for (const label of LABELS) expect(fact(label)?.change, label).toMatch(/vs the previous 30 days/);
    expect(fact('Requests')!.value).toBe(days(data).totals.current.requests.toLocaleString('en-US'));
    expect(fact('Error rate')!.value).toBe(formatPercent(days(data).totals.current.errorRate, 2));
  });

  it('says that when they come, where from, what is asked for and how it was answered do not follow the period, and never that they are summed over it', async () => {
    const [week, month] = [await usageTool.read({ period: '7d' }), await usageTool.read({ period: '30d' })];
    // They are the same rows whatever the period: the sample holds one fixed week, one list of regions, of endpoints and of responses.
    expect(week.data.figures).toEqual(month.data.figures);
    expect(week.data.endpoints).toEqual(month.data.endpoints);
    expect(week.data.responses).toEqual(month.data.responses);
    for (const { context } of [week, month]) {
      const said = [context.scope, ...context.unknowns, ...context.facts.map((f) => `${f.label} ${f.value}`)].join('\n');
      expect(said).not.toMatch(/summed over (it|the period|the whole period)/);
      expect(context.unknowns.join('\n')).toMatch(/do not follow the period/);
      for (const label of ['When they come', 'Where from', 'What is asked for', 'How it was answered']) expect(context.facts.find((f) => f.label.startsWith(label))?.label, label).toBe(`${label}, the last 30 days`);
    }
  });

  it('claims no period for them on the page either', async () => {
    const { data } = await usageTool.read({ period: '7d' });
    const { container } = render(<Tooltip.Provider><UsageBody {...data} /></Tooltip.Provider>);
    expect(container.textContent).not.toMatch(/summed over the period|Requests in the period/);
    expect(container.textContent?.match(/over the last 30 complete days/g)?.length).toBe(4);
  });
});
