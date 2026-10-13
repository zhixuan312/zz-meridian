'use client';

import Link from 'next/link';
import { Row, Stack, PageFrame } from '@/components/base/shell';
import { useShareView } from '@/components/base/use-share-view';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { KeyValue } from '@/components/ui/key-value';
import { Sparkline } from '@/components/charts/sparkline';
import { detailHead } from '@/components/patterns/detail-head';
import { formatCompact, formatCost, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { customerContext, type CustomerData } from './customer-context';

const STATUS_TONE = { active: 'neutral', trial: 'accent', 'past due': 'critical', left: 'neutral' } as const;
const STATUS_LABEL = { active: 'Active', trial: 'Trial', 'past due': 'Past due', left: 'Left' } as const;

/** One customer's page, the thin first form: its facts as label and value and its 14 days as a sparkline. */
export function CustomerView(data: CustomerData) {
  useShareView(customerContext(data));
  const c = data.customer;
  return (
    <PageFrame
      {...detailHead({
        parent: { label: 'Customers', href: '/customers' },
        name: c.name,
        status: { tone: STATUS_TONE[c.status], label: STATUS_LABEL[c.status] },
        primary: <Button asChild><Link href={`/requests?q=${encodeURIComponent(c.name)}`}>See its requests</Link></Button>,
      })}
    >
      <Stack>
        <Row split="2/3">
          <Card>
            <CardHeader title="Customer" description="Its plan, what it asked of the API and where it runs." divided />
            <CardBody className="pt-1">
              <KeyValue
                columns={2}
                items={[
                  { label: 'Plan', value: c.plan },
                  { label: 'Status', value: STATUS_LABEL[c.status] },
                  { label: 'Requests, 30 days', value: formatCompact(c.requests) },
                  { label: 'Revenue, 30 days', value: formatCost(c.revenue) },
                  { label: 'Region', value: c.region, mono: true },
                  { label: 'Customer since', value: formatDate(c.joined) },
                  { label: 'Seats', value: `${c.seats} seats` },
                  { label: 'Error rate', value: <span className={c.errorRate > 0.01 ? 'font-medium text-warning-ink' : undefined}>{formatPercent(c.errorRate, 2)}</span> },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Last 14 days" description="Requests a day." divided />
            <CardBody className="pt-5"><Sparkline values={c.trend} color="neutral" height={64} /></CardBody>
          </Card>
        </Row>
      </Stack>
    </PageFrame>
  );
}
