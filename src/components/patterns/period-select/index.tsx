'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PERIODS, PERIOD_LABEL, type Period } from '@/lib/period';
import { Segmented } from '@/components/ui/segmented';

const SHORT: Record<Period, string> = { '7d': '7D', '30d': '30D', '90d': '90D', all: 'All' };

/** The reporting period, held in the URL (?period=) so a view is linkable and a server component can read it. */
export function PeriodSelect({ value }: { value: Period }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  return (
    <Segmented
      label="Reporting period"
      value={value}
      onChange={(p) => {
        const next = new URLSearchParams(params);
        next.set('period', p);
        router.replace(`${path}?${next}`, { scroll: false });
      }}
      options={PERIODS.map((p) => ({ value: p, label: SHORT[p], title: PERIOD_LABEL[p] }))}
    />
  );
}
