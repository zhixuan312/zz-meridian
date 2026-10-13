'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Row, Stack } from '@/components/base/shell';
import { useShareView } from '@/components/base/use-share-view';
import { Button } from '@/components/ui/button';
import { MetricTile } from '@/components/patterns/metric-tile';
import { formatCost } from '@/lib/format';
import { CUSTOMER_METRICS } from './customers-context';
import { revenueContext, type RevenueData } from './revenue-context';

/** Revenue's body, the thin first form: the three figures of the Customers page, drawn by the same tiles. */
export function RevenueBody(data: RevenueData) {
  useShareView(revenueContext(data));
  const { customers, revenue, pastDue } = data;
  return (
    <Stack>
      <Row split="tiles">
        <MetricTile label={CUSTOMER_METRICS.customers.label} value={customers} format={(n) => String(n)} hint={CUSTOMER_METRICS.customers.hint} />
        <MetricTile label={CUSTOMER_METRICS.revenue.label} value={revenue} format={formatCost} hint={CUSTOMER_METRICS.revenue.hint} emphasis />
        <MetricTile label={CUSTOMER_METRICS.pastDue.label} value={pastDue.length} format={(n) => String(n)} hint={CUSTOMER_METRICS.pastDue.hint} note={pastDue.map((c) => c.name).join(', ') || 'Every invoice is paid'} />
      </Row>
      <div>
        <Button asChild><Link href="/customers">Open customers<ArrowRight /></Link></Button>
      </div>
    </Stack>
  );
}
