'use client';

import { Specimen, Plane, State } from '@/system/specimen';
import { ENDPOINTS, REGIONS, CUSTOMERS } from '@/system/fixtures/company';
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

/** The largest customers by what they paid, each opening its own page. */
const customers = [...CUSTOMERS].sort((a, b) => b.revenue - a.revenue).slice(0, 8).map((c) => ({ key: c.id, label: c.name, value: c.revenue, href: `/customers/${encodeURIComponent(c.id)}` }));
const regions = REGIONS.map((r) => ({ key: r.label, label: r.label, value: r.value }));

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
          <BarList label="Requests by region" items={regions} format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="With a meta line" note="A short fact between the label and the value, hidden on phones.">
        <Plane on="surface" className="max-w-xl">
          <BarList
            label="Revenue by customer"
            limit={4}
            format={formatCost}
            highlight="Northwind Labs"
            items={CUSTOMERS.slice(0, 12).map((c) => ({ key: c.name, label: c.name, value: c.revenue, meta: c.plan }))}
          />
        </Plane>
      </Specimen>
      <Specimen label="Rows that open a record" note="A customer has a page, so each row's label is the one link to it; the bar and the figure are not a second link, and the folded row opens nothing. A region has no page, so its rows are text. At rest the two look alike.">
        <div className="grid w-full gap-4 lg:grid-cols-2">
          <State label="Linked: each customer opens its page" className="items-stretch">
            <Plane on="surface">
              <BarList label="The largest customers by revenue" items={customers} limit={5} format={formatCost} />
            </Plane>
          </State>
          <State label="Not linked: a region has no page" className="items-stretch">
            <Plane on="surface">
              <BarList label="Where requests come from" items={regions} format={formatCompact} />
            </Plane>
          </State>
        </div>
      </Specimen>
    </>
  );
}
