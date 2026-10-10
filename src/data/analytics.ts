/**
 * The three Analytics figures that are not a collection — the weekday-and-hour heatmap, the hour-of-day columns and the
 * regions with their p50 — read here and nowhere else, so the one thing they share is the grant they cost.
 *
 * It lives in the data layer rather than beside Analytics' shared context because that module is read by a client view:
 * this one asks the policy, and `next/headers` may not reach a browser bundle.
 */
import { AccessDenied, can, resolveAccess, type AccessScope } from '@/data/access';
import { REGION_LATENCY, demoHeatmap, requestsByHour } from '@/data/sample';
// A type-only import, so the view module it names never enters this module's runtime graph (and this module's policy
// import never enters the view's).
import type { AnalyticsData } from '@/views/analytics-context';

/** The three figures, as the Analytics view draws them. */
type Figures = Pick<AnalyticsData, 'heat' | 'hours' | 'regions'>;

/**
 * The heatmap, the hours and the regions, asking `requests:read` on the scope in hand, or on the request's own when none
 * is given. A scope that does not hold it gets the single `AccessDenied` message, so a page and a tool cannot draw what
 * the request log would refuse them.
 */
export async function analyticsFigures(scope?: AccessScope): Promise<Figures> {
  const held = scope ?? (await resolveAccess());
  if (!(await can(held, 'requests', 'read'))) throw new AccessDenied();
  return { heat: demoHeatmap(), hours: requestsByHour(), regions: REGION_LATENCY };
}
