/**
 * What the sign-in page draws before anyone is signed in: the requests of the sample's last 30 complete days. It is a
 * figure of the sample itself, read with no session, no grant and no tenant, so it carries a day's date and its requests
 * and nothing else of the day. A product draws its own proof there, or none.
 */
import { demoSeries } from '@/system/fixtures/company';

/** The last 30 complete days, oldest first: each day and the requests answered on it. */
export function signInDays(): { date: string; requests: number }[] {
  return demoSeries('30d').current.map(({ date, requests }) => ({ date, requests }));
}
