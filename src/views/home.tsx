'use client';

import { AlertTriangle, ArrowRight, CircleDollarSign, Gauge } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Row, Stack } from '@/components/base/shell';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { KeyValue, type KeyValueItem } from '@/components/ui/key-value';
import { StatusDot } from '@/components/ui/status-dot';
import { Meridian, useMeridianIndex } from '@/components/charts/meridian';
import { useShareView } from '@/components/base/use-share-view';
import { useLive } from '@/lib/live';
import { TrendChart } from '@/components/charts/trend-chart';
import { BarList } from '@/components/charts/bar-list';
import { CompositionBar } from '@/components/charts/composition-bar';
import { MetricTile } from '@/components/patterns/metric-tile';
import { RouteCell } from '@/system/sample-cells';
import { FeaturedMetric } from '@/components/patterns/featured-metric';
import { formatDate, formatDay } from '@/lib/format-date';
import { ActivityFeed } from '@/components/patterns/activity-feed';
import { AskAbout } from '@/components/patterns/ask-about';
import { formatCompact, formatCost, formatDuration, formatPercent } from '@/lib/format';
import { PERIOD_LABEL } from '@/lib/period';
import { CUSTOMER_METRICS, customersAddress } from './customers-context';
import type { MainSummary } from './main-summary';
import { RELEASE_METRICS, releasesAddress } from './releases-context';
import { TEST_METRICS, testsAddress } from './tests-context';
import { TICKET_METRICS, ticketsAddress } from './tickets-context';
import { HOME_METRICS, homeContext, homeFindings, type HomeData } from './home-context';

/** Tells both agents what the Home shows, and which day the Meridian points at (decision 0011). Inside `Meridian`. */
export function ShareHome({ data }: { data: HomeData }) {
  const { index } = useMeridianIndex();
  useShareView(homeContext(data, index));
  return null;
}

const linkClass = 'row-link inline-flex items-center gap-1 font-medium text-ink hover:text-accent-ink';

/** A figure that opens the list it counts. */
const figure = (n: number, href: string) => <Link href={href} className="row-link font-medium hover:text-accent-ink">{n}</Link>;

/** One region of Main: a card named for what it summarises, its figures, and the pages that hold the detail. A summary that did not arrive says so and draws neither a figure nor a link. */
function Region({ name, description, available, links, children }: { name: string; description: string; available: boolean; links: { href: string; label: string }[]; children: ReactNode }) {
  return (
    <Card role="region" aria-label={name}>
      <CardHeader title={name} description={description} />
      {available ? (
        <>
          <CardBody>{children}</CardBody>
          <CardFooter className="flex-wrap gap-x-5 gap-y-2">
            {links.map((l) => <Link key={l.href} href={l.href} className={linkClass}>{l.label} <ArrowRight className="size-3.5" /></Link>)}
          </CardFooter>
        </>
      ) : (
        <CardBody><EmptyState kind="error" layout="inline" title={`The ${name.toLowerCase()} summary is unavailable`}>It could not be read. The other summaries and the rest of the page are unaffected.</EmptyState></CardBody>
      )}
    </Card>
  );
}

/**
 * Main's three regions: the whole product in a glance, each with the figures of its own page and a way into it. A
 * figure that has a filter on its page opens the list it counts; the footer links open the pages themselves.
 */
export function MainRegions({ summary: { business, operation, delivery } }: { summary: MainSummary }) {
  const businessRows: KeyValueItem[] = business ? [
    { label: CUSTOMER_METRICS.customers.label, value: business.customers },
    { label: 'By status', wrap: true, value: <>{Object.entries(business.byStatus).map(([status, n], i) => <span key={status}>{i ? ' · ' : ''}{figure(n, customersAddress({ q: '', plan: 'all', status, sort: 'revenue', dir: 'desc', page: '1' }))} {status}</span>)}</> },
    { label: 'By plan', wrap: true, value: <>{Object.entries(business.byPlan).map(([plan, n], i) => <span key={plan}>{i ? ' · ' : ''}{figure(n, customersAddress({ q: '', plan, status: 'all', sort: 'revenue', dir: 'desc', page: '1' }))} {plan}</span>)}</> },
    { label: CUSTOMER_METRICS.revenue.label, value: formatCost(business.revenue) },
  ] : [];
  const unwell = operation ? [
    { label: 'Out of service', names: operation.outage, tone: 'critical' as const },
    { label: 'Degraded', names: operation.degraded, tone: 'warning' as const },
  ].filter((g) => g.names.length) : [];
  const deliveryRows: KeyValueItem[] = delivery ? [
    { label: TICKET_METRICS.open.label, value: figure(delivery.open, ticketsAddress({ q: '', state: 'open', priority: 'all' })) },
    { label: TICKET_METRICS.waiting.label, value: figure(delivery.waiting, ticketsAddress({ q: '', state: 'waiting', priority: 'all' })) },
    { label: TEST_METRICS.failing.label, value: figure(delivery.failing, testsAddress({ q: '', state: 'failed', release: '', runs: 'latest' })) },
    { label: RELEASE_METRICS.live.label, value: delivery.live },
    { label: RELEASE_METRICS.ready.label, value: figure(delivery.ready, releasesAddress({ q: '', state: 'ready', environment: 'all' })) },
    { label: RELEASE_METRICS.testing.label, value: figure(delivery.testing, releasesAddress({ q: '', state: 'testing', environment: 'all' })) },
  ] : [];
  return (
    <Row split="tiles">
      <Region name="Business" description="Customers and what they pay" available={business !== null} links={[{ href: '/customers', label: 'Customers' }, { href: '/usage', label: 'Usage' }]}>
        <KeyValue items={businessRows} />
      </Region>
      <Region name="Operation" description="Services and incidents, now" available={operation !== null} links={[{ href: '/services', label: 'Services' }]}>
        {operation && !unwell.length && !operation.incidents.length ? (
          <p className="flex items-center gap-2.5 py-2.5 text-sm"><StatusDot tone="positive" />Every service is operational and nothing is open.</p>
        ) : (
          <KeyValue
            items={[
              ...unwell.map((g) => ({ label: g.label, wrap: true, value: <span className="inline-flex items-center gap-2"><StatusDot tone={g.tone} />{g.names.join(', ')}</span> })),
              { label: 'Open incidents', wrap: true, value: operation?.incidents.length ? <>{operation.incidents.map((i) => <span key={i.id} className="block">{i.title}</span>)}</> : 'None' },
            ]}
          />
        )}
      </Region>
      <Region name="Delivery" description="Tickets, verifications and releases" available={delivery !== null} links={[{ href: '/operations-tickets', label: 'Tickets' }, { href: '/tests', label: 'Tests' }, { href: '/releases', label: 'Releases' }]}>
        <KeyValue items={deliveryRows} />
      </Region>
    </Row>
  );
}

/** Ask on the featured card: about the day the Meridian points at, or about the period. */
function AskHome({ period }: { period: string }) {
  const { index, dates } = useMeridianIndex();
  const day = index !== null ? dates[index] : null;
  return <AskAbout question={day ? `Why do requests, errors and latency on ${formatDate(day)} look the way they do?` : `What stands out in requests, errors and latency over the ${period}, and why?`} />;
}

/**
 * The Home's rows: the console page and the MCP view in fullscreen. `now` is the data's clock, as an ISO string:
 * relative times read against it, never against render time.
 */
export function HomeBody(data: HomeData) {
  const { series, totals, endpoints, mix, activity, now } = data;
  // A change anyone makes, an agent's included, reaches an open Home's Activity without a reload.
  useLive(['activity']);
  const period = PERIOD_LABEL[data.period].toLowerCase();
  if (series.length === 0) {
    return (
      <Stack>
        <Card>
          <ShareHome data={data} />
          <EmptyState title="No requests yet" action={<Link href="/keys" className={linkClass}>API keys <ArrowRight className="size-3.5" /></Link>} className="py-16">
            Traffic, reliability and revenue appear here once a key makes its first call.
          </EmptyState>
        </Card>
        <MainRegions summary={data.summary} />
      </Stack>
    );
  }
  const { current: c, previous: p } = totals;
  const dates = series.map((d) => d.date);
  // No change against a period that is not kept, as with `all`, or against a figure of zero: a tile says so in words,
  // and the featured card draws no pill, which would hold a dash beside "vs previous period".
  const change = (a: number, b?: number) => (b ? a / b - 1 : null);
  const peak = series.reduce((m, d) => (d.requests > m.requests ? d : m), series[0]);
  const found = homeFindings(series);
  return (
    <Meridian dates={dates} day={data.day}>
      <ShareHome data={data} />
      <Stack>
        <Row split="2/3">
          <FeaturedMetric
            kicker={<>Requests · {period}</>}
            actions={<AskHome period={period} />}
            value={c.requests}
            points={series.map((d) => d.requests)}
            format={formatCompact}
            delta={change(c.requests, p?.requests) ?? undefined}
            caption={<>About {formatCompact(Math.round(c.requests / series.length))} a day. The busiest day was {formatDay(peak.date)}, with {formatCompact(peak.requests)}.</>}
          >
            <TrendChart
              height="fill"
              label="Requests per day"
              dates={dates}
              series={[
                { key: 'requests', label: 'Requests', values: series.map((d) => d.requests), kind: 'area' },
              ]}
            />
          </FeaturedMetric>
          <div className="grid min-w-0 gap-(--stack-gap) md:grid-cols-3 lg:flex lg:flex-col">
            <MetricTile
              label={HOME_METRICS.errorRate.label}
              hint={HOME_METRICS.errorRate.hint}
              icon={<AlertTriangle />}
              value={c.errorRate}
              delta={change(c.errorRate, p?.errorRate)}
              intent="down"
              points={series.map((d) => (d.requests ? d.errors / d.requests : 0))}
              baseline={found.usual.errorRate}
              finding={found.errorSpike}
              format={(n) => formatPercent(n, 2)}
            />
            <MetricTile
              label={HOME_METRICS.p95.label}
              hint={HOME_METRICS.p95.hint}
              icon={<Gauge />}
              value={c.p95}
              delta={change(c.p95, p?.p95)}
              intent="down"
              points={series.map((d) => d.p95)}
              baseline={found.usual.p95}
              format={(n) => formatDuration(n)}
            />
            <MetricTile
              label={HOME_METRICS.revenue.label}
              hint={HOME_METRICS.revenue.hint}
              icon={<CircleDollarSign />}
              value={c.revenue}
              delta={change(c.revenue, p?.revenue)}
              intent="neutral"
              points={series.map((d) => d.revenue)}
              format={(n) => formatCost(n)}
            />
          </div>
        </Row>
        <Row split="1/2">
          <Card>
            <CardHeader title="Busiest endpoints" description="By requests" />
            <CardBody>
              <BarList
                label="Requests by endpoint"
                highlight="/v1/messages"
                limit={5}
                format={formatCompact}
                items={endpoints.map((e) => ({
                  key: e.route,
                  label: <RouteCell method={e.method} route={e.route} />,
                  value: e.requests,
                }))}
              />
            </CardBody>
            <CardFooter>
              <Link href="/usage" className="row-link inline-flex items-center gap-1 font-medium text-ink hover:text-accent-ink">
                All endpoints <ArrowRight className="size-3.5" />
              </Link>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader title="Responses" description="By status class" />
            <CardBody className="flex flex-col gap-6">
              <CompositionBar
                label="Responses by status class"
                format={formatCompact}
                parts={[
                  // The normal case is the quietest part; only the classes that need a look carry status colour.
                  { ...mix[0], color: 'neutral' },
                  { ...mix[1], color: 'neutral-ink' },
                  { ...mix[2], color: 'warning' },
                  { ...mix[3], color: 'critical' },
                ]}
              />
              <div className="border-t border-line pt-5">
                <p className="t-eyebrow mb-3">Latency p95 · per day</p>
                <TrendChart
                label="Latency p95 per day"
                height={168}
                format="duration"
                baseline={{ value: found.usual.p95, label: `Median ${formatDuration(found.usual.p95)}` }}
                dates={dates}
                series={[{ key: 'p95', label: 'Latency p95', values: series.map((d) => d.p95), kind: 'line', color: 'neutral' }]}
                />
              </div>
            </CardBody>
          </Card>
        </Row>
        <MainRegions summary={data.summary} />
        <Row>
          <Card>
            <CardHeader title="Activity" description="Changes to this workspace, newest first" divided />
            <CardBody>
              <ActivityFeed events={activity} now={new Date(now)} />
            </CardBody>
          </Card>
        </Row>
      </Stack>
    </Meridian>
  );
}
