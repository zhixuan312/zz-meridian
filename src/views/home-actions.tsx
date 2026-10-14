'use client';

import { ExportButton } from '@/components/patterns/export-button';
import { PeriodSelect } from '@/components/patterns/period-select';

/**
 * Where Home's period control stands while it is on its way: the control itself, out of sight and out of reach, so
 * the masthead's last row is as wide, and wraps where it will, before it arrives as after. The wrapper draws no box
 * (`contents`), so the control is the row's item, as the real one is.
 */
export function PeriodRoom() {
  return (
    <div aria-hidden inert className="contents invisible">
      <PeriodSelect value="30d" onChange={() => {}} />
    </div>
  );
}

/** Where Home's actions stand while they are on their way, the period control and Export, each as wide as it will be. */
export function HomeActionsRoom() {
  return (
    <>
      <PeriodRoom />
      <div aria-hidden inert className="contents invisible">
        <ExportButton rows={[]} filename="home.csv" noun="days" />
      </div>
    </>
  );
}
