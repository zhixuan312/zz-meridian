'use client';

import { Specimen, Plane } from '@/system/specimen';
import { ENDPOINTS, REGIONS, CUSTOMER_ROWS } from '@/system/fixtures/relay';
import { formatCompact, formatCost } from '@/lib/format';
import { BarList } from '.';

const endpoints = ENDPOINTS.map((e) => ({
  key: e.route,
  label: (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="t-eyebrow w-12 shrink-0">{e.method}</span>
      <span className="truncate font-mono text-xs">{e.route}</span>
    </span>
  ),
  value: e.requests,
}));

export default function BarListPreview() {
  return (
    <>
      <Specimen label="One highlighted" note="The row the card is about takes the accent; the rest are the neutral population. Past the limit, the rest fold into one row.">
        <Plane on="surface" className="max-w-xl">
          <BarList label="Requests by endpoint" items={endpoints} highlight="/v1/messages" limit={5} format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="All neutral" note="Without a finding to point at, no row is coloured.">
        <Plane on="surface" className="max-w-xl">
          <BarList label="Requests by region" items={REGIONS.map((r) => ({ key: r.label, label: r.label, value: r.value }))} format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="With a meta line" note="A short fact between the label and the value, hidden on phones.">
        <Plane on="surface" className="max-w-xl">
          <BarList
            label="Spend by customer"
            limit={4}
            format={formatCost}
            highlight="Northwind Labs"
            items={CUSTOMER_ROWS.map((c) => ({ key: c.name, label: c.name, value: c.spend, meta: c.plan }))}
          />
        </Plane>
      </Specimen>
    </>
  );
}
