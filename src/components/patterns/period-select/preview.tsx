'use client';

import { Specimen, State } from '@/system/specimen';
import { PeriodSelect } from '.';

export default function PeriodSelectPreview() {
  return (
    <>
      <Specimen label="Periods" note="7 days, 30 days, 90 days, all. The choice lives in the address (?period=30d), so a view is a link.">
        <State label="Last 30 days (default)"><PeriodSelect value="30d" /></State>
        <State label="Last 7 days"><PeriodSelect value="7d" /></State>
        <State label="All time"><PeriodSelect value="all" /></State>
      </Specimen>
    </>
  );
}
