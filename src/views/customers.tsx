'use client';

import { useMemo } from 'react';
import { UserPlus } from 'lucide-react';
import { app } from '@/app.config';
import { PageFrame, Row, Stack } from '@/components/base/shell';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Sparkline } from '@/components/charts/sparkline';
import { MetricTile } from '@/components/patterns/metric-tile';
import { DataTable, useQueryState, type Column } from '@/components/patterns/data-table';
import { FilterBar } from '@/components/patterns/filter-bar';
import { formatCompact, formatCost, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import type { CustomerRecord } from '@/system/fixtures/relay-records';

const PLAN_TONE = { Enterprise: 'accent', Scale: 'neutral', Starter: 'neutral' } as const;
const STATUS_TONE = { active: 'positive', trial: 'accent', 'past due': 'critical' } as const;
const STATUS_LABEL = { active: 'Active', trial: 'Trial', 'past due': 'Past due' } as const;

const columns: Column<CustomerRecord>[] = [
  {
    key: 'name', header: 'Customer', grow: true, truncate: true, mobile: 'title', sortValue: (c) => c.name,
    cell: (c) => (
      <span className="flex min-w-0 items-center gap-3">
        <Avatar name={c.name} size="sm" />
        <span className="truncate font-medium">{c.name}</span>
      </span>
    ),
  },
  { key: 'plan', header: 'Plan', mobile: 'fact', sortValue: (c) => c.plan, cell: (c) => <Badge tone={PLAN_TONE[c.plan]}>{c.plan}</Badge> },
  { key: 'status', header: 'Status', mobile: 'status', sortValue: (c) => c.status, cell: (c) => <Badge tone={STATUS_TONE[c.status]} dot>{STATUS_LABEL[c.status]}</Badge> },
  { key: 'requests', header: 'Requests', numeric: true, mobile: 'fact', sortValue: (c) => c.requests, cell: (c) => formatCompact(c.requests), mobileCell: (c) => `${formatCompact(c.requests)} requests` },
  {
    key: 'trend', header: 'Last 14 days', hideBelow: 'lg',
    cell: (c) => <span className="block w-28"><Sparkline values={c.trend} color={c.status === 'past due' ? 'neutral' : 'accent'} height={24} /></span>,
  },
  { key: 'errors', header: 'Error rate', numeric: true, muted: true, hideBelow: 'xl', sortValue: (c) => c.errorRate, cell: (c) => <span className={c.errorRate > 0.01 ? 'font-medium text-warning-ink' : undefined}>{formatPercent(c.errorRate, 2)}</span> },
  { key: 'spend', header: 'Spend', numeric: true, mobile: 'fact', sortValue: (c) => c.spend, cell: (c) => formatCost(c.spend) },
  { key: 'since', header: 'Customer since', numeric: true, muted: true, hideBelow: 'xl', sortValue: (c) => c.since, cell: (c) => formatDate(c.since) },
];

export function CustomersView({ rows }: { rows: CustomerRecord[] }) {
  const [f, set] = useQueryState({ q: '', plan: 'all', status: 'all', by: '', sort: 'spend', dir: 'desc', page: '1' });
  const matching = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return rows.filter((c) => (f.plan === 'all' || c.plan === f.plan) && (f.status === 'all' || c.status === f.status) && (!q || c.name.toLowerCase().includes(q)));
  }, [rows, f.q, f.plan, f.status]);
  const isFiltered = f.q !== '' || f.plan !== 'all' || f.status !== 'all';
  const clear = () => set({ q: '', plan: 'all', status: 'all', by: '', page: '1' });
  const spend = rows.reduce((a, c) => a + c.spend, 0);
  const pastDue = rows.filter((c) => c.status === 'past due');
  const spendDaily = rows[0].trend.map((_, d) => rows.reduce((a, c) => a + c.trend[d] * 0.000104, 0));
  const requestsDaily = rows[0].trend.map((_, d) => rows.reduce((a, c) => a + c.trend[d], 0));

  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Customers"
      description="Who is calling the API, on which plan, and what it costs them this month."
      actions={<Button variant="primary" icon={<UserPlus />}>Invite customer</Button>}
    >
      <Stack>
        <Row split="tiles">
          <MetricTile label="Customers" value={rows.length} format={(n) => String(n)} hint="Workspaces with at least one live key. The line is their combined requests over the last 14 days." daily={requestsDaily} />
          <MetricTile label="Spend this month" value={spend} format={formatCost} hint="Metered usage across every customer, before credits. The line shows the last 14 days." daily={spendDaily} emphasis />
          <MetricTile label="Past due" value={pastDue.length} format={(n) => String(n)} hint="Customers whose latest invoice is overdue." note={pastDue.map((c) => c.name).join(', ') || 'Every invoice is paid'} />
        </Row>
        <DataTable
          caption="Customers"
          noun="customers"
          rows={matching}
          columns={columns}
          rowKey={(c) => c.id}
          rowHref={(c) => `/requests?q=${encodeURIComponent(c.name)}`}
          state={{ sort: f.sort, dir: f.dir, page: f.page }}
          onStateChange={set}
          filtered={isFiltered}
          onClearFilters={clear}
          toolbar={
            <FilterBar
              search={{ value: f.q, onChange: (q) => set({ q, by: '', page: '1' }), placeholder: 'Search customers' }}
              filters={[
                { key: 'status', label: 'Status', value: f.status, onChange: (status) => set({ status, by: '', page: '1' }), options: [{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'trial', label: 'Trial' }, { value: 'past due', label: 'Past due' }] },
              ]}
              view={
                <Segmented size="sm" label="Plan" value={f.plan} onChange={(plan) => set({ plan, by: '', page: '1' })}
                  options={[{ value: 'all', label: 'All plans' }, { value: 'Enterprise', label: 'Enterprise' }, { value: 'Scale', label: 'Scale' }, { value: 'Starter', label: 'Starter' }]} />
              }
              result={<>{matching.length} of {rows.length}</>}
              setBy={f.by || undefined}
              onClear={clear}
            />
          }
        />
      </Stack>
    </PageFrame>
  );
}
