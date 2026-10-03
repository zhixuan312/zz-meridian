'use client';

import { Specimen, Plane } from '@/system/specimen';
import { demoSeries, ENDPOINTS } from '@/system/fixtures/relay';
import { formatCompact } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { Meridian } from '@/components/charts/meridian';
import { TrendChart } from '@/components/charts/trend-chart';
import { ColumnChart } from '.';

const week = demoSeries('7d').current;
const month = demoSeries('30d').current;

export default function ColumnChartPreview() {
  return (
    <>
      <Specimen label="Categories" note="One column per category, the neutral population, one highlighted.">
        <Plane on="surface">
          <ColumnChart
            label="Requests by endpoint"
            format={formatCompact}
            highlight="/v1/messages"
            columns={ENDPOINTS.map((e) => ({ key: e.route, label: e.route.replace('/v1/', ''), value: e.requests }))}
          />
        </Plane>
      </Specimen>
      <Specimen label="Days" note="Seven days of errors; today highlighted.">
        <Plane on="surface" className="max-w-lg">
          <ColumnChart
            label="Errors per day, last 7 days"
            height={160}
            format={formatCompact}
            highlight={week[week.length - 1].date}
            columns={week.map((d) => ({ key: d.date, label: formatDate(d.date).replace(/ \d{4}$/, ''), value: d.errors }))}
          />
        </Plane>
      </Specimen>
      <Specimen label="On the Meridian" note="Given dates, the columns share the page's cursor: point at a column and the trend above follows.">
        <Meridian dates={month.map((d) => d.date)}>
          <Plane on="surface" className="flex flex-col gap-6">
            <TrendChart label="Requests per day" dates={month.map((d) => d.date)} height={160} series={[{ key: 'r', label: 'Requests', values: month.map((d) => d.requests), kind: 'area' }]} />
            <ColumnChart
              label="Errors per day"
              height={120}
              format={formatCompact}
              dates={month.map((d) => d.date)}
              columns={month.map((d) => ({ key: d.date, label: formatDate(d.date).replace(/ \d{4}$/, ''), value: d.errors }))}
            />
          </Plane>
        </Meridian>
      </Specimen>
    </>
  );
}
