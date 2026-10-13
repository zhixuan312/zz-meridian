'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Row, Stack } from '@/components/base/shell';
import { ShareContext } from '@/components/base/use-share-view';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IncidentCard } from '@/components/patterns/incident-card';
import { StatusList } from '@/components/patterns/status-list';
import { unpackServices, type PackedService } from '@/components/patterns/status-list/summarise';
import { plural } from '@/lib/format';
import { nowContext, type NowData } from './now-context';

/** Now's body, the thin first form: the services as they are this moment and the open incident. The embed view draws its parts. */
export function NowBody(data: NowData) {
  const { services, current, alsoOpen, now } = data;
  const end = new Date(now);
  return (
    <Stack>
      <ShareContext context={nowContext(data)} />
      <Row>
        <Card className="overflow-hidden">
          <CardHeader title="Services" description="State now and latency. Point at a bar to read its day." divided />
          {services.length ? <StatusList services={services} end={end} /> : <EmptyState title="No services yet">Every service you monitor appears here with its state now.</EmptyState>}
        </Card>
      </Row>
      <Row>
        {current ? (
          <IncidentCard incident={current} now={end} />
        ) : (
          <Card className="p-(--card-pad)"><p className="text-sm">No incident is open.</p></Card>
        )}
      </Row>
      {alsoOpen.length ? <p className="t-caption">{alsoOpen.length} other {plural(alsoOpen.length, 'incident is', 'incidents are')} open.</p> : null}
      <div>
        <Button asChild><Link href="/health">Open operations<ArrowRight /></Link></Button>
      </div>
    </Stack>
  );
}

/** The console route's body: the histories arrive packed, one character a day, and are unpacked here where the strips are drawn. */
export function PackedNowBody({ services, ...rest }: Omit<NowData, 'services'> & { services: PackedService[] }) {
  return <NowBody services={unpackServices(services)} {...rest} />;
}
