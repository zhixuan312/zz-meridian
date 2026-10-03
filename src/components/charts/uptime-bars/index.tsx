'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format-date';
import { useSize } from '@/components/charts/use-size';

export type DayState = 'operational' | 'degraded' | 'outage';
/* Healthy days recede, so the eye lands on the days something happened. */
const FILL: Record<DayState, string> = { operational: 'bg-positive/22', degraded: 'bg-warning', outage: 'bg-critical' };
/** 99.994%, 99.81%, 100%: as many decimals as the number needs, never trailing zeros. */
const pct = (u: number) => `${Number((u * 100).toFixed(u >= 0.9999 ? 3 : 2))}%`;
const WORD: Record<DayState, string> = { operational: 'Operational', degraded: 'Degraded', outage: 'Outage' };

/**
 * A service's recent history: one thin bar per day, oldest on the left. Healthy days are a quiet positive; a bad day
 * stands out in warning or critical, so the eye finds incidents first. Narrow containers show the last 30 days.
 */
export function UptimeBars({
  days,
  uptime,
  end,
  label,
  className,
}: {
  /** One state per day, oldest first, ending today. */
  days: DayState[];
  /** The uptime over the days shown, as a fraction. */
  uptime: number;
  /** The last day's date (today). */
  end: Date;
  label: string;
  className?: string;
}) {
  const [box, { width }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const shown = width > 0 && width < 420 ? days.slice(-30) : days;
  const dateOf = (i: number) => new Date(end.getTime() - (shown.length - 1 - i) * 86_400_000);
  const bad = shown.filter((d) => d !== 'operational').length;
  return (
    <figure ref={box} aria-label={label} className={cn('relative min-w-0', className)} onPointerLeave={() => setHover(null)}>
      <div
        role="group"
        tabIndex={0}
        aria-label={`${label}. Use the arrow keys to read one day.`}
        onKeyDown={(e) => {
          const last = shown.length - 1;
          const next = e.key === 'ArrowLeft' ? Math.max(0, (hover ?? last + 1) - 1) : e.key === 'ArrowRight' ? Math.min(last, (hover ?? last - 1) + 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
          if (e.key === 'Escape') return setHover(null);
          if (next === null) return;
          e.preventDefault();
          setHover(next);
        }}
        onBlur={() => setHover(null)}
        className="flex h-8 items-stretch gap-[2px] rounded-xs focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        {shown.map((d, i) => (
          <span
            key={i}
            aria-hidden
            onPointerEnter={() => setHover(i)}
            className={cn('min-w-0 flex-1 rounded-full transition-[opacity,transform] duration-(--dur-hover)', FILL[d], hover !== null && hover !== i && 'opacity-55', hover === i && 'scale-y-110')}
          />
        ))}
      </div>
      <figcaption className="mt-2 flex items-center gap-3 text-2xs text-ink-3">
        <span>{shown.length} days ago</span>
        <span aria-hidden className="h-px flex-1 bg-line" />
        <span className="t-num font-medium text-ink-2">{pct(uptime)} uptime</span>
        <span aria-hidden className="h-px flex-1 bg-line" />
        <span>Today</span>
      </figcaption>
      {hover !== null ? (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 rounded-sm bg-surface-inverse px-2 py-1.5 text-xs whitespace-nowrap text-ink-inverse shadow-overlay"
          style={{ left: `${((hover + 0.5) / shown.length) * 100}%` }}
        >
          <span className="font-medium">{WORD[shown[hover]]}</span>
          <span className="opacity-70"> · {formatDate(dateOf(hover))}</span>
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">{hover !== null ? `${formatDate(dateOf(hover))}: ${WORD[shown[hover]]}` : ''}</p>
      <p className="sr-only">
        {label}: {pct(uptime)} uptime over {shown.length} days; {bad === 0 ? 'no degraded days' : `${bad} days degraded or down`}.
      </p>
      <table className="sr-only">
        <caption>{label}, by day</caption>
        <tbody>{shown.map((d, i) => <tr key={i}><td>{formatDate(dateOf(i))}</td><td>{WORD[d]}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
