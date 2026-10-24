'use client';

import { useId } from 'react';
import { Row, Stack } from '@/components/base/shell';
import { ShareContext } from '@/components/base/use-share-view';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusDot } from '@/components/ui/status-dot';
import { TrendChart } from '@/components/charts/trend-chart';
import { FeaturedMetric } from '@/components/patterns/featured-metric';
import { IncidentCard } from '@/components/patterns/incident-card';
import { StatusList } from '@/components/patterns/status-list';
import { unpackServices, type PackedService } from '@/logic/summarise';
import { AskAbout } from '@/components/patterns/ask-about';
import { formatDateTime } from '@/lib/format-date';
import { formatUptime, lastedOf, longestRun, meanUptime, operationalShare, servicesContext, stripDates, type ServicesData } from '@/logic/services-context';
import { Unread } from './unread';

/** The page's two parts after its Featured metric, by the titles the page and its specification name them with. */
const PARTS = { services: 'Each service, 90 days', incidents: 'Incidents' } as const;

/**
 * The lowest level the uptime chart asks its axis to start at. Uptime is 100% on almost every day of a healthy period
 * and never near zero, so an axis from zero spent 82% of the plot on a range no day reached and left the days that
 * mattered — the whole of what the card is about — as shallow dents. The chart holds the floor at or under the lowest
 * day it is given, so the caption names the rule rather than a number the next bad day would make wrong.
 */
const FLOOR = 0.7;

/**
 * The page's protagonist, its one Featured metric: the uptime the title states, written as the title writes it, the
 * longest run as its finding, and the share of the services operational on each day of their strips, the last the day
 * in progress, drawn running. Its mark is a wrapper whose display is `contents`, so the stack's layout is unchanged.
 * `builtAt` is the moment the uptime answer was built from the service records, and the card states it, so an uptime
 * that was not rebuilt is never read as freshly worked out.
 */
function Uptime({ services, end, builtAt }: { services: ServicesData['services']; end: Date; builtAt?: string | null }) {
  const share = operationalShare(services);
  const n = share.length;
  // The strips end today: the dates count back from it.
  const dates = stripDates(n, end);
  const run = longestRun(services);
  const built = builtAt ? ` Derived at ${formatDateTime(builtAt)} from each service's own days.` : '';
  return (
    <div data-protagonist="Uptime" className="contents">
      <FeaturedMetric
        className="w-full"
        kicker={`Uptime · last ${n} days`}
        actions={<AskAbout question={`Which service is hurting uptime over the last ${n} days, and why?`} />}
        value={meanUptime(services)}
        format={formatUptime}
        caption={`The mean of ${services.length} services' uptime over their last ${n} days, today included. The line is the share of the services operational each day, on an axis that starts under its lowest day rather than at zero, so a day that was not perfect is seen.${built}`}
        finding={run ? { text: run.text } : undefined}
      >
        {/* A line on a floored axis, not an area from zero: uptime lives between 86% and 100%, where an area's height
            says nothing a reader can use and its fill is the whole plot. Every value is still drawn. */}
        <TrendChart height="fill" floor={FLOOR} label="Share of the services operational, a day" format="percent" dates={dates} running series={[{ key: 'operational', label: 'Operational', values: share, kind: 'line' }]} />
      </FeaturedMetric>
    </div>
  );
}

/**
 * Incidents: one list, the open ones first, newest first, each in the Incident card's card form with its owner, its
 * ticket and how long it has lasted so far; then the resolved ones, newest first, in its row form, each with how long
 * it lasted. The open cards are cards of their own, as on Now, so the part's title stands above them and the resolved
 * rows share one card under them.
 */
function Incidents({ incidents, end }: { incidents: NonNullable<ServicesData['incidents']>; end: Date }) {
  const { open, resolved } = incidents;
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <div>
        <h2 id={id} className="t-card">{PARTS.incidents}</h2>
        <p className="t-caption mt-1 text-pretty">The open ones first, then the resolved, newest first</p>
      </div>
      {open.map((i) => (
        <div key={i.id} className="flex min-w-0 flex-col gap-2">
          <p className="t-caption">Open for <span className="t-num font-medium text-ink-2">{lastedOf(i, end)}</span> so far</p>
          <IncidentCard incident={i} now={end} />
        </div>
      ))}
      {open.length ? null : (
        <Card>
          <CardBody className="pt-(--card-pad)">
            <p className="flex items-start gap-2.5 text-sm text-ink-2">
              <StatusDot tone="positive" className="mt-[0.45em]" />
              <span className="text-pretty">No incident is open.</span>
            </p>
          </CardBody>
        </Card>
      )}
      {resolved.length ? (
        <Card className="overflow-hidden">
          <div className="divide-y divide-line">{resolved.map((i) => <IncidentCard key={i.id} incident={i} now={end} variant="row" />)}</div>
        </Card>
      ) : (
        <p className="t-caption">No incident has been resolved yet.</p>
      )}
    </section>
  );
}

/**
 * What the body draws: the page's data, and the moment the uptime answer was built from the service records — absent
 * when that answer could not be built, and the card then states no derivation rather than a made-up one.
 */
export type ServicesBodyData = ServicesData & { builtAt?: string | null };

/**
 * The Services page's body: its Featured metric, the uptime over the services' days, then each service in the team's
 * order with its strip and how long it has run, then every incident. Incidents that could not be read leave their part saying so, and every service stands. With no service
 * yet one card says so and nothing else is drawn.
 */
export function ServicesBody(data: ServicesBodyData) {
  const { services, incidents, builtAt } = data;
  const end = new Date(data.now);
  if (!services.length) {
    return (
      <Stack>
        <ShareContext context={servicesContext(data)} />
        <Card>
          <EmptyState title="No services yet" className="py-16">Every service you monitor appears here with its state now, its last 90 days and its incidents.</EmptyState>
        </Card>
      </Stack>
    );
  }
  return (
    <Stack>
      <ShareContext context={servicesContext(data)} />
      <Uptime services={services} end={end} builtAt={builtAt} />
      <Row split="2/3">
        <Card className="overflow-hidden">
          <CardHeader title={PARTS.services} description="In the order the team reads its stack: the state now, p95, every day's mark and how long each has run" divided />
          <StatusList services={services} end={end} run />
        </Card>
        {incidents ? <Incidents incidents={incidents} end={end} /> : <Unread title={PARTS.incidents} what="the incidents" />}
      </Row>
    </Stack>
  );
}

/** The console route's body: the histories arrive packed, one character a day, and are unpacked here where the strips are drawn. */
export function PackedServicesBody({ services, builtAt, ...rest }: Omit<ServicesBodyData, 'services'> & { services: PackedService[] }) {
  return <ServicesBody services={unpackServices(services)} builtAt={builtAt} {...rest} />;
}
