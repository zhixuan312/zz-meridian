'use client';

import { ExportButton } from '@/components/patterns/export-button';
import { PeriodSelect } from '@/components/patterns/period-select';

/**
 * Where a page's period control stands while it is on its way, Home's, Revenue's and Usage's: the control itself, out of sight and out of reach, so
 * the masthead's last row is as wide, and wraps where it will, before it arrives as after. The wrapper draws no box
 * (`contents`), so the control is the row's item, as the real one is.
 */
function PeriodRoom() {
  return (
    <div aria-hidden inert className="contents invisible">
      <PeriodSelect value="30d" onChange={() => {}} />
    </div>
  );
}

/** Where the actions of Home, Revenue and Usage stand while they are on their way, the period control and Export, each as wide as it will be. */
export function PeriodActionsRoom() {
  return (
    <>
      <PeriodRoom />
      <div aria-hidden inert className="contents invisible">
        <ExportButton rows={[]} filename="days.csv" noun="days" />
      </div>
    </>
  );
}
