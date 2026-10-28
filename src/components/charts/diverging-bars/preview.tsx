'use client';

import { Specimen, Plane, State } from '@/system/specimen';
import { CUSTOMERS } from '@/system/fixtures/company';
import { NAMED_CUSTOMERS, PLANS, REGION_NAMES, type CustomerRecord } from '@/system/fixtures/sample';
import { DivergingBars, type DivergingItem } from '.';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** Requests a day over the last 14, summed over a set of customers. */
const days = (cs: CustomerRecord[]) => Array.from({ length: 14 }, (_, k) => sum(cs.map((c) => c.trend[k])));
/** The change in requests over the last 7 days against the 7 before, in percent; none when the 7 before hold nothing. */
const change = (t: number[]) => {
  const before = sum(t.slice(0, 7));
  return before ? ((sum(t.slice(7)) - before) / before) * 100 : null;
};
const company = change(days(CUSTOMERS))!;
/** How many points a set of customers' change is ahead of the company's, or behind it. */
const against = (cs: CustomerRecord[]) => {
  const c = change(days(cs));
  return c === null ? null : Math.round((c - company) * 10) / 10;
};
const points = (n: number) => (n === 0 ? '0.0' : `${n > 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}`);

const byName = (name: string) => CUSTOMERS.find((c) => c.name === name)!;
const named = NAMED_CUSTOMERS.map(byName);
const row = (c: CustomerRecord, extra: Partial<DivergingItem> = {}): DivergingItem => ({ key: c.id, label: c.name, value: against([c]), ...extra });
const linked = named.map((c) => row(c, { href: `/customers/${encodeURIComponent(c.id)}` }));
const plans = PLANS.map((p) => ({ key: p, label: p, value: against(CUSTOMERS.filter((c) => c.plan === p)) }));
const regions = REGION_NAMES.map((r) => ({ key: r, label: r, value: against(CUSTOMERS.filter((c) => c.region === r)) }));
/** Two customers that left: neither has a week before to compare, so each has no change to show. */
const left = CUSTOMERS.filter((c) => c.status === 'left').slice(0, 2);
const largestFall = [...named].sort((a, b) => (against([a]) ?? 0) - (against([b]) ?? 0))[0];

/** Every row reads no data or zero: two customers that left, and two whose change matches the company's. */
const flat = [...named.slice(0, 2).map((c) => row(c, { value: 0 })), ...left.map((c) => row(c))];
// A specimen cannot hold the pointer or the keyboard's focus, so the first row is given, as a class, the values the
// pointer and the focus ring give it: the bar's step up, the label's accent-ink, the link's 2px accent outline.
const HOVER = '[&_li:first-child_[data-bar]]:bg-chart-neutral-strong';
const LINK_HOVER = `${HOVER} [&_li:first-child_a]:text-accent-ink`;
const FOCUS = '[&_li:first-child_a]:rounded-xs [&_li:first-child_a]:outline-2 [&_li:first-child_a]:outline-offset-2 [&_li:first-child_a]:outline-accent';

const LABEL = 'Change in requests against the company, by customer';
const VS = `In points against the company's ${company.toFixed(1)}%, the last 7 days against the 7 before.`;

export default function DivergingBarsPreview() {
  return (
    <>
      <Specimen label="Sorted" note={`The largest rise first and the largest fall last, each its share of its half. ${VS}`}>
        <Plane on="surface" className="max-w-xl">
          <DivergingBars label={LABEL} items={linked} format={points} />
        </Plane>
      </Specimen>
      <Specimen label="In the order given" note="The plans in the order of the ladder, whatever their values: the order is the meaning.">
        <Plane on="surface" className="max-w-xl">
          <DivergingBars label="Change in requests against the company, by plan" items={plans} order="given" format={points} />
        </Plane>
      </Specimen>
      <Specimen label="A held domain" note="Two charts on one held scale of ten points either way, so a row compares across them. Every value is inside it, so nothing is said.">
        <div className="grid w-full gap-4 lg:grid-cols-2">
          {(['Enterprise', 'Starter'] as const).map((plan) => (
            <State key={plan} label={plan} className="items-stretch">
              <Plane on="surface">
                <DivergingBars label={`Change in requests against the company, ${plan} customers`} items={named.filter((c) => c.plan === plan).map((c) => row(c))} domain={10} format={points} />
              </Plane>
            </State>
          ))}
        </div>
      </Specimen>
      <Specimen label="A held domain, widened" note="Held at five points, with one customer past it: the scale widens to that customer rather than clipping its bar, adds its magnitude at each end and names it.">
        <Plane on="surface" className="max-w-xl">
          <DivergingBars label={LABEL} items={named.map((c) => row(c))} domain={5} format={points} />
        </Plane>
      </Specimen>
      <Specimen label="A highlighted row" note="The row the card is about takes the accent, and its title says why; every other row is the neutral population, whatever its sign.">
        <Plane on="surface" className="max-w-xl">
          <DivergingBars label={LABEL} items={named.map((c) => row(c))} highlight={largestFall.id} highlightLabel="The largest fall" format={points} />
        </Plane>
      </Specimen>
      <Specimen label="Rows that open a record" note="A customer has a page, so each row's label is the one link to it; the bar and the figure are not a second link. A region has no page, so its rows are text. At rest the two look alike.">
        <div className="grid w-full gap-4 lg:grid-cols-2">
          <State label="Linked: each customer opens its page" className="items-stretch">
            <Plane on="surface">
              <DivergingBars label={LABEL} items={linked.slice(0, 6)} format={points} />
            </Plane>
          </State>
          <State label="Not linked: a region has no page" className="items-stretch">
            <Plane on="surface">
              <DivergingBars label="Change in requests against the company, by region" items={regions} format={points} />
            </Plane>
          </State>
        </div>
      </Specimen>
      <Specimen label="Hover and focus" note="Under the pointer a row's neutral bar steps up to chart-neutral-strong; on a linked row the label takes accent-ink too, and on the keyboard the link shows the 2px accent ring. Each is drawn here on the first row.">
        <div className="grid w-full gap-4 lg:grid-cols-3">
          <State label="Hover: the row's bar steps up" still className="items-stretch">
            <Plane on="surface">
              <DivergingBars label={`${LABEL}, the first row hovered`} items={named.slice(0, 4).map((c) => row(c))} format={points} className={HOVER} />
            </Plane>
          </State>
          <State label="Hover on a linked label: the label takes accent-ink" still className="items-stretch">
            <Plane on="surface">
              <DivergingBars label={`${LABEL}, the first label hovered`} items={linked.slice(0, 4)} format={points} className={LINK_HOVER} />
            </Plane>
          </State>
          <State label="Focus on a linked row: the link's ring" still className="items-stretch">
            <Plane on="surface">
              <DivergingBars label={`${LABEL}, the first link focused`} items={linked.slice(0, 4)} format={points} className={FOCUS} />
            </Plane>
          </State>
        </div>
      </Specimen>
      <Specimen label="No data" note="A customer that left has no week before to compare: its row reads a dash, draws no bar and stands after every value.">
        <Plane on="surface" className="max-w-xl">
          <DivergingBars label={LABEL} items={[...named.filter((c) => c.plan === 'Starter'), ...left].map((c) => row(c))} format={points} />
        </Plane>
      </Specimen>
      <Specimen label="All no data or zero" note="No row has a change to draw: no bars, the figures read 0.0 and a dash, and the axis stands on the levels of ±1.">
        <State label="All no data or zero" className="w-full max-w-xl items-stretch">
          <Plane on="surface">
            <DivergingBars label={`${LABEL}, none with a change`} items={flat} format={points} />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="An estimate" note="A figure derived rather than measured is hatched over its own fill, its row's title says estimate, and the key is written once under the chart.">
        <Plane on="surface" className="max-w-xl">
          <DivergingBars label={LABEL} items={named.filter((c) => c.plan !== 'Enterprise').map((c) => row(c, { estimate: c.plan === 'Starter' }))} format={points} />
        </Plane>
      </Specimen>
      <Specimen label="Without an axis" note="For a card that states the scale elsewhere: the zero line stays, the levels go.">
        <Plane on="surface" className="max-w-xl">
          <DivergingBars label="Change in requests against the company, by plan" items={plans} axis={false} format={points} />
        </Plane>
      </Specimen>
      <Specimen label="Long labels" note="A label longer than its column is cut, and its row's title keeps the whole of it.">
        <Plane on="surface" className="max-w-sm">
          <DivergingBars label={LABEL} items={named.slice(0, 6).map((c) => row(c, { label: `${c.name}, ${c.plan}, ${c.region}` }))} format={points} />
        </Plane>
      </Specimen>
    </>
  );
}
