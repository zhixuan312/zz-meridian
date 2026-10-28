'use client';

import { Specimen, Plane, State } from '@/system/specimen';
import { ENDPOINTS, REGIONS, CUSTOMERS, WEEKDAY_HOURS } from '@/system/fixtures/company';
import { formatCompact, formatCost, formatPercent } from '@/lib/format';
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

/** Monday's working hours, in the order of the day: the order is the meaning, so it is kept. */
const hours = WEEKDAY_HOURS.filter((h) => h.weekday === 0 && h.hour >= 9 && h.hour < 18).map((h) => ({ key: `h${h.hour}`, label: `${String(h.hour).padStart(2, '0')}:00`, value: h.requests }));
/** GPU capacity used by region, a fraction of each region's own: the scale is held at 100% so the cards compare. */
const capacity = REGIONS.map((r, i) => ({ key: r.label, label: r.label, value: [0.82, 0.64, 0.47, 0.31][i] ?? 0.2 }));
const over = capacity.map((r, i) => (i === 1 ? { ...r, value: 1.12 } : r));
/** This week's requests by region against last week's. */
const weeks = regions.map((r, i) => ({ ...r, value: Math.round(r.value / 4), compare: i === 3 ? null : Math.round((r.value / 4) * [0.92, 1.14, 0.97][i]) }));
/** Today's requests by hour: the hour still running is projected from its first minutes. */
const today = hours.map((h, i) => ({ ...h, value: Math.round(h.value / 4), estimate: i === hours.length - 1 }));
const percent = (n: number) => formatPercent(n, 0);
/** The real hover and focus values, put on the first row so the states are read without a pointer. */
const HOVER = '[&_li:first-child_[data-bar]]:bg-chart-neutral-strong';
const LINK_HOVER = `${HOVER} [&_li:first-child_a]:text-accent-ink`;
const FOCUS = '[&_li:first-child_a]:rounded-xs [&_li:first-child_a]:outline-2 [&_li:first-child_a]:outline-offset-2 [&_li:first-child_a]:outline-accent';

export default function BarListPreview() {
  return (
    <>
      <Specimen label="One highlighted" note="The row the card is about takes the accent, and its title says why; the rest are the neutral population. Past the limit, the rest fold into one row.">
        <Plane on="surface" className="max-w-xl">
          <BarList label="Requests by endpoint" items={endpoints} highlight="/v1/messages" highlightLabel="The endpoint this card follows" limit={5} format={formatCompact} />
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
            highlightLabel="The customer this card follows"
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
      <Specimen label="Hover and focus" note="Under the pointer a row's neutral bar steps up to chart-neutral-strong; on a linked row the label takes accent-ink too, and on the keyboard the link shows the 2px accent ring. Each is drawn here on the first row.">
        <div className="grid w-full gap-4 lg:grid-cols-3">
          <State label="Hover: the row's bar steps up" still className="items-stretch">
            <Plane on="surface">
              <BarList label="Where requests come from, the first row hovered" items={regions} format={formatCompact} className={HOVER} />
            </Plane>
          </State>
          <State label="Hover on a linked label: the label takes accent-ink" still className="items-stretch">
            <Plane on="surface">
              <BarList label="The largest customers by revenue, the first label hovered" items={customers.slice(0, 4)} format={formatCost} className={LINK_HOVER} />
            </Plane>
          </State>
          <State label="Focus on a linked row: the link's ring" still className="items-stretch">
            <Plane on="surface">
              <BarList label="The largest customers by revenue, the first link focused" items={customers.slice(0, 4)} format={formatCost} className={FOCUS} />
            </Plane>
          </State>
        </div>
      </Specimen>
      <Specimen label="In the order given" note={'`order="given"` keeps the rows in the order passed, for an order that is the meaning: the hours of a day. Nothing folds.'}>
        <Plane on="surface" className="max-w-xl">
          <BarList label="Requests by hour, Monday" order="given" items={hours} format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="Against a held scale" note="`max` draws every bar against a stated top, so two cards of the same measure compare row by row. No share is printed.">
        <Plane on="surface" className="max-w-xl">
          <BarList label="GPU capacity used by region" max={1} items={capacity} format={percent} />
        </Plane>
      </Specimen>
      <Specimen label="Widened" note="A row past `max` widens the scale to itself, and the list names the row that moved it.">
        <Plane on="surface" className="max-w-xl">
          <BarList label="GPU capacity used by region" max={1} items={over} format={percent} />
        </Plane>
      </Specimen>
      <Specimen label="With an axis" note="`axis` names the levels under the rows with a gridline through them at each: the held levels of `max` and the widened top, or without `max` the nice levels of the largest row.">
        <div className="grid w-full gap-4 lg:grid-cols-2">
          <State label="Held at 100%, widened to 112%" className="items-stretch">
            <Plane on="surface">
              <BarList label="GPU capacity used by region" max={1} axis items={over} format={percent} />
            </Plane>
          </State>
          <State label="Nice levels of the largest row" className="items-stretch">
            <Plane on="surface">
              <BarList label="Requests by region" axis items={regions} format={formatCompact} />
            </Plane>
          </State>
        </div>
      </Specimen>
      <Specimen label="Paired" note="`pair` reads each row's value beside its compare, drawn as an outline on the same scale under a legend of the two. A row with no compare reads —. Nothing folds.">
        <Plane on="surface" className="max-w-xl">
          <BarList label="Requests by region, this week and last" pair={{ label: 'This week', compareLabel: 'Last week' }} items={weeks} format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="With estimates" note="An estimated row's bar is hatched and its title says so; the list writes the key once.">
        <Plane on="surface" className="max-w-xl">
          <BarList label="Requests by hour, today" order="given" items={today} format={formatCompact} />
        </Plane>
      </Specimen>
    </>
  );
}
