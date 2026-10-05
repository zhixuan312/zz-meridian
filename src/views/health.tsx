'use client';

import { useState } from 'react';
import { BellOff, BellRing } from 'lucide-react';
import { domain } from '@/app.config';
import { Row, Stack } from '@/components/base/shell';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { Card, CardHeader } from '@/components/ui/card';
import { FeaturedMetric } from '@/components/patterns/featured-metric';
import { StatusList, summarise } from '@/components/patterns/status-list';
import { unpackServices, type PackedService } from '@/components/patterns/status-list/summarise';
import { IncidentCard } from '@/components/patterns/incident-card';
import { UptimeBars, type DayState } from '@/components/charts/uptime-bars';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusDot } from '@/components/ui/status-dot';
import type { Tone } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';

const RANK: Record<DayState, number> = { operational: 0, none: 0, degraded: 1, outage: 2 };
const TONE: Record<DayState, Tone> = { operational: 'positive', none: 'neutral', degraded: 'warning', outage: 'critical' };

/** The Health page's body: shared by the console route; the embed view uses its parts. */
export function HealthBody({ services, current, past, now }: { services: Service[]; current: Incident | null; past: Incident[]; now: string }) {
  const end = new Date(now);
  const days = services[0].days.map((_, i) => services.reduce<DayState>((w, s) => (RANK[s.days[i]] > RANK[w] ? s.days[i] : w), 'operational'));
  const daily = services[0].days.map((_, i) => services.filter((s) => s.days[i] === 'operational').length / services.length);
  const uptime = services.reduce((a, s) => a + s.uptime, 0) / services.length;
  const bad = days.filter((d) => d !== 'operational').length;
  const s = summarise(services);
  const affected = services.filter((x) => x.status !== 'operational').map((x) => x.name);
  return (
    <Stack>
      <Row split={current ? '2/3' : 'full'}>
        <FeaturedMetric
          kicker="Uptime · all services · 90 days"
          value={uptime}
          daily={daily}
          format={(n) => `${(n * 100).toFixed(n >= 0.9999 ? 3 : 2)}%`}
          caption={
            <>
              {s.text}
              {affected.length ? <>: {affected.join(', ')}.</> : '.'} {bad} of the last 90 days had a service below operational.
            </>
          }
        >
          <div className="@container flex flex-1 flex-col justify-end gap-7 px-2 pb-3">
            <ul aria-label="Right now" className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line @[40rem]:grid-cols-3 [&>li]:flex [&>li]:min-w-0 [&>li]:items-center [&>li]:gap-2.5 [&>li]:bg-surface/80 [&>li]:px-3.5 [&>li]:py-3">
              {services.map((svc) => (
                <li key={svc.name}>
                  <StatusDot tone={TONE[svc.status]} live={svc.status !== 'operational'} />
                  <span className="min-w-0 flex-1 truncate text-sm">{svc.name}</span>
                  <span className={cn('t-num text-xs max-sm:hidden', svc.status === 'operational' ? 'text-ink-3' : 'font-medium text-warning-ink')}>{formatDuration(svc.latency)}</span>
                </li>
              ))}
            </ul>
            <UptimeBars days={days} uptime={uptime} end={end} size="lg" label="All services, worst state per day, last 90 days" />
          </div>
        </FeaturedMetric>
        {current ? <IncidentCard incident={current} now={end} /> : null}
      </Row>
      <Row>
        <Card className="overflow-hidden">
          <CardHeader title="Services" description="State now, latency, and 90 days of history. Point at a bar to read its day." divided />
          <StatusList services={services} end={end} summary={false} />
        </Card>
      </Row>
      <Row>
        <Card className="overflow-hidden">
          <CardHeader title="Past incidents" description="Resolved in the last 90 days, newest first" divided />
          {past.length ? (
            <div className="divide-y divide-line">{past.map((i) => <IncidentCard key={i.id} incident={i} now={end} variant="row" />)}</div>
          ) : (
            <EmptyState title="No incidents in 90 days">Resolved incidents appear here with how long they lasted.</EmptyState>
          )}
        </Card>
      </Row>
    </Stack>
  );
}

/** The console route's body: the histories arrive packed, one character a day, and are unpacked here where the strips are drawn. */
export function PackedHealthBody({ services, ...rest }: Omit<Parameters<typeof HealthBody>[0], 'services'> & { services: PackedService[] }) {
  return <HealthBody services={unpackServices(services)} {...rest} />;
}

/** Subscribe to incident updates: a toggle that says what it did, and where the updates go. */
export function SubscribeButton() {
  const [on, setOn] = useState(false);
  const toggle = () => {
    setOn(!on);
    toast(on
      ? { tone: 'neutral', title: 'Unsubscribed from incident updates' }
      : { tone: 'positive', title: 'Subscribed to incident updates', description: `New incidents and every update go to maya@${domain}.` });
  };
  return <Button icon={on ? <BellOff /> : <BellRing />} aria-pressed={on} onClick={toggle}>{on ? 'Subscribed' : 'Subscribe to updates'}</Button>;
}
