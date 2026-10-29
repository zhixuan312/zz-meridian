'use client';

import { useMemo } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Segmented } from '@/components/ui/segmented';
import { Sparkline } from '@/components/charts/sparkline';
import { MetricTile } from '@/components/patterns/metric-tile';
import { AskAbout } from '@/components/patterns/ask-about';
import { DataTable, useQueryState, useSearchDraft, type Column } from '@/components/patterns/data-table';
import { FilterBar } from '@/components/patterns/filter-bar';
import { Records } from '@/components/templates/records';
import { formatCompact, formatCost, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { useShareView } from '@/components/base/use-share-view';
import { CUSTOMER_METRICS, STATUS_TONE, customerFigures, customersContext, pastDueNote, under, type CustomerRow } from '@/logic/customers-context';
import { customerAddress } from '@/logic/customer-context';

const PLAN_TONE = { Enterprise: 'accent', Scale: 'neutral', Starter: 'neutral' } as const;
const STATUS_LABEL = { active: 'Active', trial: 'Trial', 'past due': 'Past due', left: 'Left' } as const;

const columns: Column<CustomerRow>[] = [
  {
    key: 'name', header: 'Customer', grow: true, truncate: true, mobile: 'title', sortValue: (c) => c.name, title: (c) => c.name,
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
    cell: (c) => <span className="block w-28"><Sparkline values={c.trend} color="neutral" height={24} /></span>,
  },
  { key: 'errors', header: 'Error rate', numeric: true, muted: true, hideBelow: 'xl', sortValue: (c) => c.errorRate, cell: (c) => <span className={c.errorRate > 0.01 ? 'font-medium text-warning-ink' : undefined}>{formatPercent(c.errorRate, 2)}</span> },
  { key: 'revenue', header: 'Revenue', numeric: true, mobile: 'fact', sortValue: (c) => c.revenue, cell: (c) => formatCost(c.revenue) },
  { key: 'joined', header: 'Customer since', numeric: true, muted: true, hideBelow: 'xl', sortValue: (c) => c.joined, cell: (c) => formatDate(c.joined) },
];

/**
 * The table and the tiles over it: the page renders the masthead, so this is the only part that waits for the address.
 * `rows` is every customer, as the list draws one. The list shows those that have not left, and those that have under
 * their own status; the tiles count the first only.
 */
export function CustomersView({ rows }: { rows: CustomerRow[] }) {
  const [f, set] = useQueryState({ q: '', plan: 'all', status: 'all', by: '', sort: 'revenue', dir: 'desc', page: '1' });
  // The box shows each key; the address, and so the list, follows when the typing stops.
  const [draft, setDraft] = useSearchDraft(f.q, (q) => set({ q, by: '', page: '1' }));
  const matching = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return under(rows, f.status).filter((c) => (f.plan === 'all' || c.plan === f.plan) && (!q || c.name.toLowerCase().includes(q)));
  }, [rows, f.q, f.plan, f.status]);
  const isFiltered = f.q !== '' || f.plan !== 'all' || f.status !== 'all';
  const filters = [f.plan !== 'all' && `on ${f.plan}`, f.status !== 'all' && f.status, f.q && `matching "${f.q}"`].filter(Boolean).join(', ');
  useShareView(customersContext(rows, matching, f));
  const clear = () => set({ q: '', plan: 'all', status: 'all', by: '', page: '1' });
  const { customers, revenue, pastDue } = customerFigures(rows);

  return (
    <Records
      empty={!rows.length}
      summary={[
        <MetricTile key="customers" label={CUSTOMER_METRICS.customers.label} value={customers} format={(n) => String(n)} hint={CUSTOMER_METRICS.customers.hint} />,
        <MetricTile key="revenue" label={CUSTOMER_METRICS.revenue.label} value={revenue} format={formatCost} hint={CUSTOMER_METRICS.revenue.hint} emphasis />,
        <MetricTile key="past-due" label={CUSTOMER_METRICS.pastDue.label} value={pastDue.length} format={(n) => String(n)} hint={CUSTOMER_METRICS.pastDue.hint} note={pastDueNote(pastDue)} />,
      ]}
    >
      {/* The page's protagonist, the list, marked on a wrapper whose display is `contents`. */}
      <div data-protagonist="Customers" className="contents">
        <DataTable
          caption="Customers"
          noun="customers"
          rows={matching}
          columns={columns}
          rowKey={(c) => c.id}
          empty={{ title: 'No customers yet', body: 'A customer appears here with their plan and usage once they have an account.' }}
          rowHref={(c) => customerAddress(c.id)}
          state={{ sort: f.sort, dir: f.dir, page: f.page }}
          onStateChange={set}
          filtered={isFiltered}
          onClearFilters={clear}
          toolbar={
            <FilterBar
              ask={<AskAbout question={isFiltered ? `What do the customers ${filters} have in common, and why?` : 'What stands out in our customers, and why?'} />}
              search={{ value: draft, onChange: setDraft, placeholder: 'Search customers' }}
              filters={[
                { key: 'status', label: 'Status', value: f.status, onChange: (status) => set({ status, by: '', page: '1' }), options: [{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'trial', label: 'Trial' }, { value: 'past due', label: 'Past due' }, { value: 'left', label: 'Left' }] },
              ]}
              view={
                <Segmented size="sm" label="Plan" value={f.plan} onChange={(plan) => set({ plan, by: '', page: '1' })}
                  options={[{ value: 'all', label: 'All plans' }, { value: 'Enterprise', label: 'Enterprise' }, { value: 'Scale', label: 'Scale' }, { value: 'Starter', label: 'Starter' }]} />
              }
              result={<>{matching.length} of {under(rows, f.status).length}</>}
              setBy={f.by || undefined}
              onClear={clear}
            />
          }
        />
      </div>
    </Records>
  );
}
