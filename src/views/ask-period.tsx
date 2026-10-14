'use client';

import { AskAbout } from '@/components/patterns/ask-about';
import { useMeridianIndex } from '@/components/charts/meridian';
import { formatDate } from '@/lib/format-date';

/**
 * Ask on a page's protagonist over time: about the day the Meridian points at, or else about the period in view. Home's
 * revenue card, Revenue's revenue by plan and Usage's requests a day each hand the agent what they show this way.
 */
export function AskPeriod({ period, what, onDay }: { period: string; what: string; onDay: (day: string) => string }) {
  const { index, dates } = useMeridianIndex();
  const day = index !== null ? dates[index] : null;
  return <AskAbout question={day ? onDay(formatDate(day)) : `What stands out in ${what} over the ${period}, and why?`} />;
}
