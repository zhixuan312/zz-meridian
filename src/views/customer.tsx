'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Row, Stack, PageFrame } from '@/components/base/shell';
import { useShareView } from '@/components/base/use-share-view';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { KeyValue } from '@/components/ui/key-value';
import { StatusDot } from '@/components/ui/status-dot';
import { BarList } from '@/components/charts/bar-list';
import { DataTable } from '@/components/patterns/data-table';
import { MetricTile } from '@/components/patterns/metric-tile';
import { AskAbout } from '@/components/patterns/ask-about';
import { formatCompact, formatCost, formatPercent, plural } from '@/lib/format';
import { dayOf, formatDate, formatDay } from '@/lib/format-date';
import { requestColumns } from '@/system/sample-cells';
import {
  LATEST, busiestOf, customerContext, endpointsOf, requestsOf, shareOf, standingOf, thisWeekOf, titleOf, weekOf, type CustomerData,
} from '@/logic/customer-context';
import { STATUS_TONE } from '@/logic/customers-context';
import { Unread } from './unread';
import { requestAddress } from '@/logic/request-context';
import { nav, workspaces } from '@/app.config';

const linkClass = 'row-link inline-flex items-center gap-1 font-medium text-ink hover:text-accent-ink';
/** The log's columns a customer's own requests need: the customer is the page's, so its column is left out. */
const LATEST_COLUMNS = requestColumns.filter((c) => ['request', 'status', 'latency', 'at'].includes(c.key));

/** The Customers entry's label, as the navigation names it. */
const customersLabel = nav.flatMap((g) => g.items).find((i) => i.href === '/customers')?.label ?? 'Customers';

/** The places above a customer, outermost first: its kicker, which `loading.tsx` draws too, so the masthead is the same while it loads. */
export function CustomerTrail() {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <Link href={workspaces.business.homeHref} className="hit hover:text-ink">{workspaces.business.label}</Link>
      <span aria-hidden>/</span>
      <Link href="/customers" className="hit hover:text-ink">{customersLabel}</Link>
    </span>
  );
}

/**
 * The room of the line under the title: one line of the lead from 35em, the facts' longest (33em in the sample) with
 * room to spare, and two under it. The room is kept whether the line fills it or not, so the loading state, which
 * draws the same room, is the masthead's height and the body does not move when the page arrives.
 */
export function FactsRoom({ children }: { children: ReactNode }) {
  return (
    <span className="@container block">
      <span className="flow-root min-h-[2lh] @min-[35em]:min-h-[1lh]">{children}</span>
    </span>
  );
}

/** The line under the title: its plan, what it paid in 30 days and its share of the revenue, and its requests. */
function facts(data: CustomerData) {
  const c = data.customer;
  const share = shareOf(data);
  return [c.plan, `${formatCost(c.revenue)} in 30 days`, ...(share === null ? [] : [`${formatPercent(share, 1)} of revenue`]), `${formatCompact(c.requests)} requests`].join(' · ');
}

/** What it was told that the status alone does not say: an invoice overdue, the days a trial has left, a plan it moved to. */
function standingLine(data: CustomerData) {
  const c = data.customer;
  if (c.status === 'past due') return 'Its latest invoice is overdue.';
  if (c.status === 'left') return `It was on ${c.plan}, and nothing it sends is counted.`;
  if (c.status === 'trial') {
    const left = c.trialEnds ? Math.round((Date.parse(c.trialEnds) - Date.parse(dayOf(data.now))) / 86_400_000) : null;
    return left !== null && left >= 0 ? `It joined on ${formatDate(c.joined)}, and its trial has ${left} ${plural(left, 'day')} left.` : `It joined on ${formatDate(c.joined)}.`;
  }
  return c.planSince && c.previousPlan ? `On ${c.plan} since ${formatDate(c.planSince)}, after ${c.previousPlan}.` : `On ${c.plan} since it joined.`;
}

/**
 * Why it is worth opening: where it stands and since when, and who has it on our side. The page's protagonist, "Where it
 * stands", whatever its standing sentence says, marked on a wrapper whose display is `contents`.
 */
function Standing({ data }: { data: CustomerData }) {
  const c = data.customer;
  return (
    <div data-protagonist="Where it stands" className="contents">
      <Card>
        <CardHeader
          title={<span className="inline-flex items-center gap-2.5"><StatusDot tone={STATUS_TONE[c.status]} />{standingOf(c)}</span>}
          description={standingLine(data)}
          actions={<AskAbout question={`What stands out in ${c.name}'s revenue and requests, and why?`} />}
          wrap
          divided
        />
        <CardBody className="pt-1">
          <KeyValue
            columns={2}
            items={[
              { label: 'Owner, on our side', value: c.owner },
              { label: 'Customer since', value: formatDate(c.joined) },
              { label: 'Region', value: c.region, mono: true },
              { label: 'Seats', value: `${c.seats} ${plural(c.seats, 'seat')}` },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  );
}

/**
 * The three tiles: its requests this week against last with the busiest of its 14 days, what it paid with its share
 * of revenue, and its error rate with the product's own. Each names the window it covers. An array, so a row of tiles
 * counts its three.
 */
function tiles(data: CustomerData) {
  const c = data.customer;
  const share = shareOf(data);
  const busiest = busiestOf(c, data.now);
  const product = data.product;
  // A record that does not hold two weeks has no week to read, and a tile that fell back to 0 would state "no requests"
  // as a measurement it never made. It draws the product's not-measured word instead.
  const week = thisWeekOf(c);
  return [
    <MetricTile
      key="requests"
      label="Requests"
      hint="Its requests over the last 7 complete days, against the 7 before, with its last 14 days as the shape."
      value={week ?? '—'}
      format="compact"
      delta={week === null ? null : weekOf(c)}
      compare="vs the week before"
      points={c.trend}
      finding={busiest ? { text: `Busiest of its 14 days: ${formatDay(busiest.date)}, ${formatCompact(busiest.requests)}`, tone: 'neutral' } : undefined}
    />,
    <MetricTile
      key="paid"
      label="Paid"
      hint="What it was billed for metered usage over the last 30 complete days, before credits."
      value={c.revenue}
      format={formatCost}
      note={share !== null ? `${formatPercent(share, 1)} of revenue, 30 days` : product === null ? 'Its share of revenue could not be read' : 'Over the last 30 complete days'}
    />,
    <MetricTile
      key="errors"
      label="Error rate"
      hint="Share of its requests answered with a 5xx or a 429 over the last 30 complete days."
      value={c.errorRate}
      format={(n) => formatPercent(n, 2)}
      note={product && product.errorRate !== null ? `The product's ${formatPercent(product.errorRate, 2)}, 30 days` : product === null ? "The product's could not be read" : 'Over the last 30 complete days'}
    />,
  ];
}

/** What it asks for: its requests by endpoint over the 30 days. */
function AsksFor({ data }: { data: CustomerData }) {
  const endpoints = endpointsOf(data.customer);
  return (
    <Card>
      <CardHeader title="What it asks for" description="Its requests by endpoint, over the last 30 complete days" />
      <CardBody>
        {endpoints.length ? (
          <BarList label="Requests by endpoint" format={formatCompact} items={endpoints.map(([route, n]) => ({ key: route, label: route, value: n }))} />
        ) : (
          <p className="py-2 text-sm text-ink-2">No request in the last 30 complete days.</p>
        )}
      </CardBody>
    </Card>
  );
}

/** Its latest requests: the sampled log's newest from it, each opening its request, with the way to all of them. */
function Latest({ data, rows }: { data: CustomerData; rows: NonNullable<CustomerData['latest']> }) {
  const c = data.customer;
  if (!rows.length) {
    return (
      <Card>
        <CardHeader title="Its latest requests" />
        <CardBody>
          <p className="py-2 text-sm text-ink-2">No sampled request is from {c.name}. The log keeps a sample of the requests, not every one.</p>
        </CardBody>
      </Card>
    );
  }
  return (
    <DataTable
      title="Its latest requests"
      description={`The newest ${rows.length === 1 ? 'request' : `${rows.length} requests`} from it in the sampled log`}
      actions={<Link href={requestsOf(c.name)} className={linkClass}>All of them <ArrowRight className="size-3.5" /></Link>}
      caption={`The latest requests from ${c.name}`}
      noun="requests"
      rows={rows}
      columns={LATEST_COLUMNS}
      rowKey={(r) => r.id}
      rowHref={(r) => requestAddress(r.id)}
      pageSize={LATEST}
      pageSizes={[LATEST]}
    />
  );
}

/**
 * One customer's page: the head (the trail to Business and Customers, the title, the line of its figures), then why
 * it is worth opening, the three tiles, what it asks for and its latest requests. It has no period control: every
 * part names the window it covers. A part whose read failed says so in its place; one its reader may not read is
 * absent.
 */
export function CustomerView(data: CustomerData) {
  useShareView(customerContext(data));
  const c = data.customer;
  const latest = data.latest === undefined ? null : data.latest === null ? <Unread title="Its latest requests" what="the sampled log" /> : <Latest data={data} rows={data.latest} />;
  return (
    <PageFrame kicker={<CustomerTrail />} name={c.name} title={titleOf(c)} description={<FactsRoom>{facts(data)}</FactsRoom>}>
      <Stack>
        <Standing data={data} />
        <Row split="tiles">{tiles(data)}</Row>
        {latest ? (
          <Row split="1/3">
            <AsksFor data={data} />
            {latest}
          </Row>
        ) : (
          <AsksFor data={data} />
        )}
      </Stack>
    </PageFrame>
  );
}
