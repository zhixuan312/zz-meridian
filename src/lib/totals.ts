/**
 * A period's totals from its days, computed one way for a reading module, a logic file and the sample's previews.
 * Pure: it is handed days and returns figures, so a module that must not read can still total a period.
 */

/** A period's totals: requests, the error rate over them, the median day's p95, and revenue in US dollars. */
export type Totals = { requests: number; errorRate: number; p95: number; revenue: number };

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * Requests, the error rate over them (0 for a period with no requests), the lower of the two middle days' p95 (always a
 * day that was recorded), and revenue to the cent.
 */
export function totalsOf(points: readonly { requests: number; errors: number; p95: number; revenue: number }[]): Totals {
  const requests = sum(points.map((p) => p.requests));
  const p95 = points.map((p) => p.p95).sort((a, b) => a - b);
  return {
    requests,
    errorRate: requests ? sum(points.map((p) => p.errors)) / requests : 0,
    p95: p95.length ? p95[Math.floor((p95.length - 1) * 0.5)] : 0,
    revenue: Math.round(sum(points.map((p) => p.revenue)) * 100) / 100,
  };
}
