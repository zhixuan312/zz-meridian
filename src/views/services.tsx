'use client';

import { useId } from 'react';
import { Row, Stack } from '@/components/base/shell';
import { ShareContext } from '@/components/base/use-share-view';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusDot } from '@/components/ui/status-dot';
import { IncidentCard } from '@/components/patterns/incident-card';
import { StatusList } from '@/components/patterns/status-list';
import { unpackServices, type PackedService } from '@/components/patterns/status-list/summarise';
import { AskAbout } from '@/components/patterns/ask-about';
import { lastedOf, servicesContext, type ServicesData } from './services-context';
import { Unread } from './unread';

/** The page's two parts, by the titles the page and its specification name them with. */
const PARTS = { services: 'Each service, 90 days', incidents: 'Incidents' } as const;

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
 * The Services page's body: each service in the team's order with its strip and how long it has run, then every
 * incident. Incidents that could not be read leave their part saying so, and every service stands. With no service
 * yet one card says so and nothing else is drawn.
 */
export function ServicesBody(data: ServicesData) {
  const { services, incidents } = data;
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
      <Row split="2/3">
        <Card className="overflow-hidden">
          <CardHeader title={PARTS.services} description="In the order the team reads its stack: the state now, p95, every day's mark and how long each has run" actions={<AskAbout question="Which service is hurting uptime over the last 90 days, and why?" />} divided />
          <StatusList services={services} end={end} run />
        </Card>
        {incidents ? <Incidents incidents={incidents} end={end} /> : <Unread title={PARTS.incidents} what="the incidents" />}
      </Row>
    </Stack>
  );
}

/** The console route's body: the histories arrive packed, one character a day, and are unpacked here where the strips are drawn. */
export function PackedServicesBody({ services, ...rest }: Omit<ServicesData, 'services'> & { services: PackedService[] }) {
  return <ServicesBody services={unpackServices(services)} {...rest} />;
}
