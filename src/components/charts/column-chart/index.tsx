'use client';

import { useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { useMeridian } from '@/components/charts/meridian';
import { Readout } from '@/components/charts/readout';
import { niceTicks, stackPart } from '@/components/charts/scale';
import { useSize } from '@/components/charts/use-size';

export type Column = { key: string; label: string; value: number };
export type StackedColumn = { key: string; label: string; values: number[] };
export type ColumnPart = { key: string; label: string; tone?: 'neutral' | 'warning' | 'critical' };

type Shared = {
  /** The key of the one column the card is about. */
  highlight?: string;
  /** One ISO date per column, to share the page's Meridian. */
  dates?: string[];
  /** The last column is a period still in progress: it is drawn unfinished and reads "so far". */
  running?: boolean;
  format?: (n: number) => string;
  axisFormat?: (n: number) => string;
  /** Pixels for the plot, or `fill` to take the height its card gives it (never under 220px). */
  height?: number | 'fill';
  label: string;
  /** A static pointed column in the Atlas; real charts take theirs from the pointer, the keys and the Meridian. */
  'data-preview-index'?: number;
  /** Label every nth column from the first, for a scale with its own rhythm: 6 puts hours at 00, 06, 12, 18. By
   * default labels count back from the last column, as many as fit. */
  labelEvery?: number;
  className?: string;
};
export type ColumnChartProps = Shared & (
  | { columns: Column[]; parts?: undefined }
  /** `values` holds one value a part, in the parts' order, the first at the bottom. */
  | { columns: StackedColumn[]; parts: ColumnPart[] }
);

/** The measures in pixels: the space between columns, the narrowest column that keeps its value at rest, the most parts drawn. */
const GAP = 2, REST = 36, MOST = 4;
const TONES = { neutral: 'var(--chart-neutral-strong)', warning: 'var(--warning)', critical: 'var(--critical)' };
const count = (n: number) => n.toLocaleString('en-US');
/** A value that is missing, or below zero, is no contribution to its column. */
const amount = (v: number | undefined) => (typeof v === 'number' && v > 0 ? v : 0);

type Drawn = { key: string; label: string; tone: 'accent' | keyof typeof TONES; color: string };

/**
 * The parts as drawn and each column's value for them. Past four parts nobody tells the colours apart, so the fourth
 * drawn is "Other", the sum of the fourth and every later one. Parts with no tone share the accent, each by its place
 * in the stack; once any part names a tone the parts are outcomes, and one with none is the neutral, usual case, so the
 * accent never stands beside a status colour.
 */
function stack(columns: StackedColumn[], parts: ColumnPart[]) {
  const fold = parts.length > MOST;
  const listed: ColumnPart[] = fold ? [...parts.slice(0, MOST - 1), { key: 'other', label: 'Other' }] : parts;
  const toned = parts.some((p) => p.tone);
  const drawn: Drawn[] = listed.map((p, k) => ({ key: p.key, label: p.label, tone: toned ? p.tone ?? 'neutral' : 'accent', color: toned ? TONES[p.tone ?? 'neutral'] : stackPart(k, listed.length) }));
  const bars = columns.map((c) => {
    const all = parts.map((_, k) => amount(c.values[k]));
    const values = fold ? [...all.slice(0, MOST - 1), all.slice(MOST - 1).reduce((a, b) => a + b, 0)] : all;
    return { key: c.key, label: c.label, values, total: values.reduce((a, b) => a + b, 0) };
  });
  return { drawn, bars };
}

/**
 * Counts side by side: one column per category or per period. Every column is the neutral population and one, the one
 * the card is about, takes the accent. Given `dates` (one per column), it joins the page's Meridian: pointing at a
 * column points every chart on the page at that day.
 *
 * `parts` is the other form: each column is a whole split into its parts, the first at the bottom. Parts of one kind
 * share the accent, deepest at the bottom; outcomes carry a tone each. The axis, the value above a column and the
 * table's last cell are the total, and the readout names every part.
 *
 * `running` says the last column is a period still in progress. It is not a fact like the columns before it, so it is
 * drawn at half strength under a dashed cap, and wherever it is read it says "so far".
 *
 * The plot is one Tab stop: Left and Right move a cursor a column, Home and End go to the ends, Escape lets go. It is
 * the cursor the pointer moves, and it is announced to screen readers.
 */
export function ColumnChart({
  highlight,
  dates,
  running = false,
  format = count,
  axisFormat,
  height = 200,
  label,
  labelEvery: every,
  'data-preview-index': previewIndex,
  className,
  ...form
}: ColumnChartProps) {
  const [box, { width }] = useSize<HTMLElement>();
  const meridian = useMeridian(dates ?? []);
  const [own, setOwn] = useState<number | null>(null);
  // Whether this chart is the one being pointed at: a chart that only follows another chart's cursor marks the day and
  // keeps its readout to itself, as the Trend chart does.
  const [local, setLocal] = useState(false);
  const { drawn, bars } = form.parts ? stack(form.columns, form.parts) : { drawn: null, bars: form.columns.map((c) => ({ key: c.key, label: c.label, values: [c.value], total: c.value })) };
  const n = bars.length;
  const timed = Boolean(dates && dates.length === n);
  const active = previewIndex ?? (timed ? meridian.index : own);
  const set = (i: number | null) => { (timed ? meridian.setIndex : setOwn)(i); setLocal(i !== null); };
  const fill = height === 'fill';
  const soFar = running ? n - 1 : -1;

  const ticks = niceTicks(Math.max(1, ...bars.map((b) => b.total)), 3);
  const top = ticks[ticks.length - 1];
  const af = axisFormat ?? format;
  const left = Math.max(...ticks.map((t) => af(t).length)) * 6.4 + 10;
  const longest = Math.max(...bars.map((b) => b.label.length));
  const fit = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((width - left) / (longest * 6.2 + 16)))));
  // A category left unlabelled cannot be told apart, so categories each keep a label, cut to their own column, once
  // a column has room for a few letters; dates keep their rhythm and skip.
  const every1 = !timed && !every && (width - left) / n >= 36;
  // A column wide enough for a figure keeps its value above it at rest; a narrower one shows it when pointed at.
  const column = n ? (width - left - GAP * (n - 1)) / n : 0;
  const rest = column >= REST;

  const keys = (e: KeyboardEvent) => {
    const k = e.key;
    if (!n || !['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(k)) return;
    e.preventDefault();
    if (k === 'Escape') return set(null);
    const cur = active ?? n - 1;
    set(k === 'Home' ? 0 : k === 'End' ? n - 1 : Math.min(n - 1, Math.max(0, cur + (k === 'ArrowLeft' ? -1 : 1))));
  };

  const at = active !== null && active >= 0 && active < n ? active : null;
  const on = at === null ? null : bars[at];
  // The readout stands after a column in the first half of the plot and before one in the second.
  const after = at !== null && at * 2 < n - 1;
  /** The column pointed at, in words: the table's own order, the first part first. */
  const reading = on
    ? `${on.label}: ${drawn ? `${drawn.map((p, k) => `${p.label} ${format(on.values[k])}`).join(', ')}, Total ${format(on.total)}` : format(on.total)}${at === soFar ? ', so far' : ''}`
    : null;

  return (
    <figure ref={box} aria-label={label} className={cn('relative min-w-0 select-none', fill && 'flex min-h-55 flex-1 flex-col', className)} onPointerLeave={() => set(null)}>
      {drawn && drawn.length > 1 ? (
        <ul data-legend aria-hidden className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2" style={{ paddingLeft: left }}>
          {drawn.map((p) => <li key={p.key} className="flex items-center gap-1.5"><Swatch color={p.color} />{p.label}</li>)}
        </ul>
      ) : null}
      <div
        data-plot
        role="group"
        tabIndex={0}
        aria-label={`${label}. Use the arrow keys to read one column.`}
        onKeyDown={keys}
        onBlur={() => set(null)}
        className={cn('relative rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent', fill && 'min-h-0 flex-1')}
        style={fill ? undefined : { height }}
      >
        {/* The scale, out of the flow, so a column's share resolves against the plot whatever gave the plot its height.
            With values at rest it starts 20px down: a column that reaches the top tick still has its value inside the plot. */}
        <div className={cn('absolute inset-x-0 bottom-0', rest ? 'top-5' : 'top-0')}>
          {ticks.map((t) => (
            <div key={t} aria-hidden className="absolute right-0 flex items-center" style={{ left: 0, bottom: `${(t / top) * 100}%`, transform: 'translateY(50%)' }}>
              <span data-tick className="t-num w-(--w) pr-2.5 text-right text-2xs text-ink-3" style={{ ['--w' as string]: `${left}px` }}>{af(t)}</span>
              <span className={cn('h-px flex-1', t === 0 ? 'bg-chart-axis' : 'bg-chart-grid')} />
            </div>
          ))}
          <div className="absolute inset-y-0 right-0 flex items-end gap-0.5" style={{ left }}>
            {bars.map((b, i) => {
              const pointed = active === i;
              const hot = pointed || (active === null && b.key === highlight);
              const shown = drawn ? drawn.map((p, k) => ({ p, v: b.values[k] })).filter(({ v }) => v > 0) : [];
              const text = format(b.total);
              return (
                <div
                  key={b.key}
                  data-column={b.key}
                  data-active={pointed ? '' : undefined}
                  data-running={i === soFar ? '' : undefined}
                  // A figure wider than its column is cut at rest, and keeps the whole of itself where the pointer finds it.
                  title={rest && text.length * 7 > column ? text : undefined}
                  className="group/col relative flex h-full min-w-0 flex-1 items-end"
                  onPointerEnter={() => set(i)}
                  onPointerDown={() => set(i)}
                >
                  {/* The column's box: its share of the scale, and never shorter than its parts can be drawn. */}
                  <div className="relative w-full" style={{ height: `${(Math.max(0, b.total) / top) * 100}%`, minHeight: drawn ? Math.max(0, shown.length * 4 - 1) : b.total > 0 ? 2 : 0 }}>
                    <div
                      className={cn('grow-y relative h-full rounded-t-[4px]', drawn && 'transition-[box-shadow] duration-(--dur-hover)', drawn && hot && 'z-1 ring-2 ring-ink')}
                      style={{ ['--i' as string]: i }}
                    >
                      {drawn ? (
                        // A 1px gap between parts lets the card through: the hairline that keeps neighbours apart.
                        <div className={cn('flex h-full flex-col-reverse gap-px', i === soFar && 'opacity-50')}>
                          {shown.map(({ p, v }, k) => (
                            <div
                              key={p.key}
                              data-part={p.key}
                              data-tone={p.tone}
                              data-top={k === shown.length - 1 ? '' : undefined}
                              className={cn('w-full basis-0', k === shown.length - 1 && 'rounded-t-[4px]')}
                              // Shares of the column, so a column of fractions fills its box as a column of millions does.
                              style={{ flexGrow: (v / b.total) * 100, minHeight: 3, background: p.color }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className={cn('h-full w-full rounded-t-[4px] transition-colors duration-(--dur-hover)', hot ? 'bg-accent' : 'bg-chart-neutral group-hover/col:bg-chart-neutral-strong', i === soFar && 'opacity-50')} />
                      )}
                      {/* Outside the faded fill and at full strength, so the cap holds its contrast whatever is under it. */}
                      {i === soFar ? <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 border-t-2 border-dashed border-ink" /> : null}
                    </div>
                    {rest || pointed ? (
                      // One element at rest and pointed at, so its entrance never replays. Plain, the pointed value is the
                      // chart's readout and takes the tooltip's plane; stacked, the panel is, and the total only steps up to ink.
                      <span
                        aria-hidden
                        className={cn(
                          't-num pointer-events-none absolute bottom-full mb-1 text-2xs leading-4',
                          rest && 'fade-in',
                          pointed && !drawn
                            ? 'left-1/2 z-10 -translate-x-1/2 rounded-sm bg-surface-inverse px-1.5 py-1 font-medium whitespace-nowrap text-ink-inverse shadow-overlay'
                            : rest
                              ? cn('inset-x-0 truncate text-center', pointed ? 'font-medium text-ink' : 'text-ink-3')
                              : 'left-1/2 -translate-x-1/2 font-medium whitespace-nowrap text-ink',
                        )}
                      >
                        <span data-value>{text}</span>
                        {pointed && !drawn && i === soFar ? ' · so far' : null}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {on && at !== null && drawn ? (
          <Readout at={left + at * (column + GAP) + (after ? column : 0)} after={after} visible={local || previewIndex !== undefined}>
            <p className="t-eyebrow mb-1.5 break-words">{on.label}{at === soFar ? ' · so far' : null}</p>
            {/* The parts top to bottom, as they sit in the column, a part at zero included, then the total. */}
            {drawn.map((p, k) => ({ p, k })).reverse().map(({ p, k }) => (
              <p key={p.key} className="flex flex-wrap items-start gap-x-2 text-xs leading-6">
                <Swatch color={p.color} className="mt-1.75" />
                <span className="min-w-0 flex-1 break-words text-ink-2">{p.label}</span>
                <span className="t-num ml-auto min-w-0 break-words font-medium text-ink">{format(on.values[k])}</span>
              </p>
            ))}
            <p className="mt-1 flex items-center gap-2 border-t border-line pt-1 text-xs leading-6">
              <span className="text-ink-2">Total</span>
              <span className="t-num ml-auto pl-4 font-semibold text-ink">{format(on.total)}</span>
            </p>
          </Readout>
        ) : null}
      </div>
      <div aria-hidden className="mt-2 flex gap-0.5 text-2xs text-ink-3" style={{ paddingLeft: left }}>
        {bars.map((b, i) => (
          <span key={b.key} className="relative h-4 min-w-0 flex-1">
            {active === i ? (
              <span className="absolute left-1/2 z-10 -translate-x-1/2 rounded-xs bg-surface px-1 whitespace-nowrap text-ink">{b.label}</span>
            ) : every1 ? (
              <span className="block truncate px-0.5 text-center">{b.label}</span>
            ) : (every ? i % (every * Math.ceil(fit / every)) === 0 : (n - 1 - i) % fit === 0) ? (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{b.label}</span>
            ) : null}
          </span>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">{reading}</p>
      <table className="sr-only">
        <caption>{label}</caption>
        {drawn ? <thead><tr><th scope="col">Period</th>{drawn.map((p) => <th key={p.key} scope="col">{p.label}</th>)}<th scope="col">Total</th></tr></thead> : null}
        <tbody>
          {bars.map((b, i) => (
            <tr key={b.key}>
              <th scope="row">{b.label}{i === soFar ? ', so far' : null}</th>
              {drawn ? b.values.map((v, k) => <td key={drawn[k].key}>{format(v)}</td>) : null}
              <td>{format(b.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/**
 * A part's colour as a square. The palest part of a stack is the accent at a fifth of its strength, a whisper on the
 * card, and a swatch is the one mark whose whole job is to be seen: the hairline around it does that without
 * flattening the order of the tones, as the line behind a stacked Trend chart's swatch does.
 */
function Swatch({ color, className }: { color: string; className?: string }) {
  return <span className={cn('size-2.5 shrink-0 rounded-[3px] ring-1 ring-ink-3', className)} style={{ background: color }} />;
}
