'use client';

import { useState } from 'react';
import { Specimen, State } from '@/system/specimen';
import { PeriodSelect, type PeriodOption } from '.';

type Window = '24h' | '7d' | '30d';
const WINDOWS: PeriodOption<Window>[] = [
  { value: '24h', short: '24H', label: 'Last 24 hours' },
  { value: '7d', short: '7D', label: 'Last 7 days' },
  { value: '30d', short: '30D', label: 'Last 30 days' },
];

export default function PeriodSelectPreview() {
  const [period, setPeriod] = useState<Window>('24h');
  return (
    <>
      <Specimen label="Periods" note="7 days, 30 days, 90 days, all. The choice lives in the address (?period=30d), so a view is a link.">
        <State label="Last 30 days (default)"><PeriodSelect value="30d" /></State>
        <State label="Last 7 days"><PeriodSelect value="7d" /></State>
        <State label="All time"><PeriodSelect value="all" /></State>
      </Specimen>
      <Specimen label="Controlled, the product's own periods" note="The page holds the period and the control touches no router, so it needs no Suspense; a 24-hour period, as an ops console wants.">
        <State label={WINDOWS.find((w) => w.value === period)!.label}><PeriodSelect value={period} onChange={setPeriod} periods={WINDOWS} /></State>
      </Specimen>
    </>
  );
}
