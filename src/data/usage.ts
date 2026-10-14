/**
 * The three Usage figures that come from rows of two collections: the weekday-and-hour heatmap and the hour-of-day
 * columns (both from `hours`) and the regions with their p50 (`regions`), read here and nowhere else, so the one thing
 * they share is the grants they cost.
 *
 * It lives in the data layer rather than beside Usage' shared context because that module is read by a client view:
 * this one asks the policy, and `next/headers` may not reach a browser bundle. The view names the figures' type, a
 * type-only import that never enters its runtime graph.
 */
import { AccessDenied, can, collectionFor, resolveAccess, type AccessScope } from '@/data/access';
import type { Column } from '@/components/charts/column-chart';

/** The three figures, as the Usage view draws them: the weekday-and-hour grid, the hours of the day summed from it, and each region with its median latency. */
export type UsageFigures = { heat: number[][]; hours: Column[]; regions: { label: string; value: number; p50: number }[] };

/**
 * The heatmap, the hours and the regions, asking `hours:read` and `regions:read` on the scope in hand, or on the
 * request's own when none is given. A scope that does not hold both gets the single `AccessDenied` message, before
 * anything is read. Every row is taken from the scope's own collection as it is stored (no sort, no limit), so the
 * regions keep the order the page draws them in and all 168 hours arrive.
 */
export async function usageFigures(scope?: AccessScope): Promise<UsageFigures> {
  const held = scope ?? (await resolveAccess());
  if (!(await can(held, 'hours', 'read')) || !(await can(held, 'regions', 'read'))) throw new AccessDenied();
  const [cells, regions] = await Promise.all([collectionFor(held, 'hours').query({}), collectionFor(held, 'regions').query({})]);
  const heat = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const r of cells.rows) heat[r.weekday as number][r.hour as number] = r.requests as number;
  // The hours of the day are a sum over the grid, never a third collection.
  const hours = Array.from({ length: 24 }, (_, h) => ({ key: String(h), label: `${String(h).padStart(2, '0')}:00`, value: heat.reduce((n, row) => n + row[h], 0) }));
  return { heat, hours, regions: regions.rows.map((r) => ({ label: r.label as string, value: r.value as number, p50: r.p50 as number })) };
}
