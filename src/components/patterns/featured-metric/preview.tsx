'use client';

import { useEffect } from 'react';
import { demoSeries } from '@/system/fixtures/relay';
import { formatCompact } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Meridian, useMeridian } from '@/components/charts/meridian';
import { TrendChart } from '@/components/charts/trend-chart';
import { Specimen, State } from '@/system/specimen';
import { FeaturedMetric } from '.';

const s = demoSeries('30d').current;
const dates = s.map((d) => d.date);
const total = s.reduce((a, d) => a + d.requests, 0);

function PointAt({ i }: { i: number }) {
  const { setIndex } = useMeridian(dates);
  useEffect(() => setIndex(i), [setIndex, i]);
  return null;
}

const Chart = () => (
  <TrendChart height="fill" label="Requests per day" dates={dates} series={[{ key: 'r', label: 'Requests', values: s.map((d) => d.requests), kind: 'area' }]} />
);

export default function FeaturedMetricPreview() {
  return (
    <>
      <Specimen label="With its chart" note="The page's protagonist: one per page, carrying the accent's light. Point at the chart to read a day.">
        <Meridian dates={dates}>
          <FeaturedMetric
            className="h-130 w-full"
            kicker="Requests · last 30 days"
            value={total}
            daily={s.map((d) => d.requests)}
            format={formatCompact}
            delta={0.057}
            caption="About 98K a day. The busiest day was 1 Oct, with 128K."
            actions={<Badge tone="accent" dot>Live</Badge>}
          >
            <Chart />
          </FeaturedMetric>
        </Meridian>
      </Specimen>
      <Specimen label="States">
        <State label="Reading a day" className="w-full max-w-110">
          <Meridian dates={dates}>
            <PointAt i={21} />
            <FeaturedMetric className="w-full" kicker="Requests · last 30 days" value={total} daily={s.map((d) => d.requests)} format={formatCompact} delta={0.057} />
          </Meridian>
        </State>
        <State label="Without a chart; a fall that is good" className="w-full max-w-110">
          <FeaturedMetric className="w-full" kicker="Spend · this month" value={298.43} format={(n) => `$${n.toFixed(2)}`} delta={-0.081} intent="down" caption="Credits cover the rest until 1 Nov." />
        </State>
      </Specimen>
    </>
  );
}
