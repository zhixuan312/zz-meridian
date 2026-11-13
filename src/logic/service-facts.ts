/**
 * The sample's steady-state rule: which days of a service were inside a band. It is the sample's own business, so it
 * lives with the sample and not in the managed `src/lib/facts.ts`; a product that monitors services takes this file or
 * writes its own.
 */
import { inWords, plural } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import type { Fact } from '@/lib/facts';
import type { Noun } from '@/logic/summarise';

/** What the sample's rows are called, for `summarise` and the Status list. */
export const SERVICE_NOUN: Noun = { one: 'service', other: 'services' };

/** One complete day as `steady` reads it: its p95 in milliseconds, its errors and its requests. */
export type DayService = { date: string; p95: number; errors: number; requests: number };

/**
 * Whether a day is inside the band: its p95 under `band.p95Under` and its errors over its requests under
 * `band.errorRateUnder`. A day at either edge is outside, and so is a day with no requests, which has no rate to hold.
 */
export const inBand = (d: { p95: number; errors: number; requests: number }, band: { p95Under: number; errorRateUnder: number }) =>
  d.p95 < band.p95Under && d.errors / d.requests < band.errorRateUnder;

/**
 * The rule of a steady state: how many of the days given were inside the band, and which were not, by date. `days`
 * are complete days, oldest first; the caller leaves the day in progress out, and `inBand` says which are inside. The
 * line names the band's own figures, then the first three days outside it and how many more.
 */
export function steady(days: readonly DayService[], band: { p95Under: number; errorRateUnder: number }): (Fact & { inside: number; of: number; outside: string[] }) | null {
  if (!days.length) return null;
  const outside = days.filter((d) => !inBand(d, band)).map((d) => d.date);
  const inside = days.length - outside.length;
  const named = outside.slice(0, 3).map(formatDate);
  const more = outside.length - named.length;
  const list = more ? `${named.join(', ')} and ${more} more` : inWords(named);
  // The band as it was given, to the hundredth of a percent: a band of 0.5% is not written 1%.
  const rate = `${Number((band.errorRateUnder * 100).toFixed(2))}%`;
  return {
    kind: 'steady', inside, of: days.length, outside,
    text: `${inside} of ${days.length} ${plural(days.length, 'day')} inside the band of p95 under ${band.p95Under} ms and errors under ${rate}${outside.length ? `; outside it on ${list}` : ''}`,
  };
}
