/** Small, dependency-free scale helpers shared by the charts. */

/** A "nice" upper bound and 3 to 5 ticks from 0 to it. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Math.round(i * step * 1e6) / 1e6);
}

/**
 * A smooth path through points (monotone cubic), so a line never overshoots its data. `from` and `to` draw only that
 * stretch of the same curve, so two strokes that share it meet without a corner.
 */
export function monotonePath(pts: [number, number][], from = 0, to = pts.length - 1): string {
  const n = pts.length;
  if (n < 2) return n ? `M${pts[0][0]},${pts[0][1]}` : '';
  const dx: number[] = [], m: number[] = [], t: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  let d = `M${pts[from][0]},${pts[from][1]}`;
  for (let i = from; i < to; i++) {
    const h = dx[i] / 3;
    d += `C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

export const SERIES_VAR = (slot: number | 'accent' | 'neutral') =>
  slot === 'accent' ? 'var(--accent)' : slot === 'neutral' ? 'var(--chart-neutral-strong)' : `var(--series-${slot})`;

/**
 * The colour of one part of a one-hue stack, by its place: `place` counts from 0 at the bottom of a stack of `parts`.
 * The parts are one whole, so they share the accent, mixed into the surface: deepest at the bottom and paler with each
 * part above. How deep and how pale is the theme's (chart-stack-hi, -lo): dark needs a wider span for the parts to read
 * apart. The contrast gate holds the deepest part, the one a stack stands on, to 3:1 against the surface.
 */
export const stackPart = (place: number, parts: number) => {
  const t = (place / Math.max(1, parts - 1)).toFixed(3);
  return `color-mix(in oklab, var(--accent) calc((var(--chart-stack-hi) - (var(--chart-stack-hi) - var(--chart-stack-lo)) * ${t}) * 100%), var(--surface))`;
};
