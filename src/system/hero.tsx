'use client';

import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCompact, formatDuration, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { Meridian, useMeridian, useMeridianIndex } from '@/components/charts/meridian';
import { TrendChart } from '@/components/charts/trend-chart';
import { Sparkline } from '@/components/charts/sparkline';
import { AppMark } from '@/components/base/app-mark';
import { Delta } from '@/components/ui/delta';
import type { DailyPoint } from '@/system/fixtures/relay';

/**
 * The front door's demonstration of the system's signature: one Meridian drives a wide chart and three surfaces,
 * a console, a phone and a chat. Point anywhere and every surface reads the same day. On arrival the cursor sweeps the
 * month once and rests; under reduced motion it stays still until pointed.
 */
export function Hero({ series }: { series: DailyPoint[] }) {
  const dates = series.map((d) => d.date);
  return (
    <Meridian dates={dates}>
      <Sweep n={dates.length} />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="edge-lit relative isolate rounded-xl border border-line bg-surface shadow-halo before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-(image:--glow-feature) lg:col-span-12">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2 px-6 pt-6">
            <p className="t-kicker !text-accent-ink">Requests · last 30 days</p>
            <Readout series={series} />
          </div>
          <div className="px-3 pt-2 pb-3">
            <TrendChart label="Requests per day" height={230} dates={dates} series={[{ key: 'r', label: 'Requests', values: series.map((d) => d.requests), kind: 'area' }]} />
          </div>
        </div>
        <SurfaceCard label="Console" className="lg:col-span-5"><ConsoleMini series={series} /></SurfaceCard>
        <SurfaceCard label="Phone" className="lg:col-span-3"><PhoneMini series={series} /></SurfaceCard>
        <SurfaceCard label="MCP host" className="lg:col-span-4"><ChatMini series={series} /></SurfaceCard>
      </div>
    </Meridian>
  );
}

/**
 * The demonstration: once, the shared cursor sweeps back across the month and returns to today, then rests. It never
 * loops (the system's rule), it stops the moment a person points, and under reduced motion it never starts.
 */
function Sweep({ n }: { n: number }) {
  const { setIndex } = useMeridian(Array.from({ length: n }, (_, i) => String(i)));
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = n - 1, dir = -1, turns = 0, stopped = false;
    const stop = () => { stopped = true; };
    window.addEventListener('pointermove', stop, { once: true });
    const start = setTimeout(() => {
      const id = setInterval(() => {
        if (stopped) return clearInterval(id);
        i += dir;
        if (i <= Math.floor(n * 0.15)) { dir = 1; turns++; }
        if (turns > 0 && i >= n - 1) { clearInterval(id); setIndex(null); return; }
        setIndex(i);
      }, 90);
    }, 900);
    return () => { clearTimeout(start); window.removeEventListener('pointermove', stop); };
  }, [n, setIndex]);
  return null;
}

function useDay(series: DailyPoint[]) {
  const { index } = useMeridianIndex();
  return index !== null && index < series.length ? series[index] : series[series.length - 1];
}

function Readout({ series }: { series: DailyPoint[] }) {
  const day = useDay(series);
  return (
    <p className="ml-auto flex items-baseline gap-3">
      <span className="t-num inline-flex h-7 items-center rounded-full bg-surface-inverse px-3 text-xs font-medium text-ink-inverse">{formatDate(day.date)}</span>
      <span className="t-figure t-num">{formatCompact(day.requests)}</span>
    </p>
  );
}

function SurfaceCard({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex min-w-0 flex-col rounded-xl border border-line bg-surface/70 p-4 backdrop-blur', className)}>
      <p className="t-eyebrow mb-3">{label}</p>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ConsoleMini({ series }: { series: DailyPoint[] }) {
  const day = useDay(series);
  const routes = [['/v1/messages', 0.44], ['/v1/search', 0.29], ['/v1/embeddings', 0.18]] as const;
  const tiles = [
    { label: 'Requests', v: formatCompact(day.requests), s: series.map((d) => d.requests), hot: true },
    { label: 'Errors', v: formatPercent(day.errors / day.requests, 2), s: series.map((d) => d.errors / d.requests) },
    { label: 'p95', v: formatDuration(day.p95), s: series.map((d) => d.p95) },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {tiles.map((t) => (
        <div key={t.label} className="overflow-hidden rounded-md border border-line bg-surface">
          <p className="px-2.5 pt-2 text-2xs text-ink-3">{t.label}</p>
          <p className={cn('t-num px-2.5 pt-1 text-lg font-semibold tracking-[-0.02em]', t.hot && 'text-accent-ink')}>{t.v}</p>
          <Sparkline values={t.s} height={26} color={t.hot ? 'accent' : 'neutral'} className="mt-1" />
        </div>
      ))}
      <div className="col-span-3 mt-1 flex flex-col gap-2 rounded-md border border-line bg-surface p-2.5">
        {routes.map(([r, share], i) => (
          <div key={r}>
            <div className="flex justify-between text-2xs"><span className="font-mono text-ink-2">{r}</span><span className="t-num text-ink">{formatCompact(Math.round(day.requests * share))}</span></div>
            <div className="mt-1 h-1 rounded-full bg-fill-track"><div className={cn('h-full rounded-full', i === 0 ? 'bg-accent' : 'bg-chart-neutral')} style={{ width: `${share * 200}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneMini({ series }: { series: DailyPoint[] }) {
  const day = useDay(series);
  const prev = series[Math.max(0, series.indexOf(day) - 7)];
  return (
    <div className="mx-auto w-full max-w-44 rounded-[22px] border border-line-strong bg-ground p-1.5">
      <div className="rounded-[16px] bg-surface px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5"><AppMark size={20} /><span className="text-xs font-semibold">Relay</span></div>
        <p className="t-eyebrow mt-3">Requests</p>
        <p className="t-num mt-1 text-2xl font-semibold tracking-[-0.03em]">{formatCompact(day.requests)}</p>
        <Delta value={prev ? day.requests / prev.requests - 1 : null} className="mt-1" />
        <Sparkline values={series.map((d) => d.requests)} height={30} className="mt-2" />
      </div>
    </div>
  );
}

function ChatMini({ series }: { series: DailyPoint[] }) {
  const day = useDay(series);
  return (
    <div className="flex flex-col gap-2.5">
      <p className="ml-auto max-w-[85%] rounded-xl bg-fill-active px-3 py-1.5 text-xs text-ink">How was traffic that day?</p>
      <div className="rounded-lg border border-line bg-surface p-3">
        <div className="flex items-center gap-2">
          <AppMark size={20} />
          <span className="text-xs font-semibold">Overview</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-2xs font-medium text-accent-ink ring-1 ring-accent-line"><Sparkles className="size-3" />Ask</span>
        </div>
        <p className="t-num mt-2 text-xl font-semibold tracking-[-0.02em]">{formatCompact(day.requests)}</p>
        <p className="t-caption">{formatDate(day.date)} · p95 {formatDuration(day.p95)}</p>
      </div>
      <p className="flex gap-1.5 text-xs text-ink-2"><Sparkles className="mt-px size-3.5 shrink-0 text-accent-ink" />The model sees the day you point at.</p>
    </div>
  );
}
