import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type Layer = { id: string; num?: string; title: string; line: string; count: number; href: string };

/** Five layers drawn as strata, the widest at the bottom, each holding a live miniature of what it contains. */
export function Strata({ sections }: { sections: Layer[] }) {
  const top = [...sections].reverse();
  return (
    <div className="flex flex-col items-center gap-2.5">
      {top.map((l, i) => (
        <Link
          key={l.id}
          href={l.href}
          className="edge-lit edge-hover group relative grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 rounded-lg border border-line bg-surface px-5 py-4 transition-[box-shadow] duration-(--dur-enter) hover:shadow-halo sm:grid-cols-[3rem_minmax(0,14rem)_minmax(0,1fr)_auto]"
          style={{ maxWidth: `${76 + i * 6}%`, minWidth: 'min(100%, 22rem)' }}
        >
          <span className="t-figure t-num text-ink-3 transition-colors group-hover:text-accent-ink">{l.num}</span>
          <span className="min-w-0">
            <span className="t-card block">{l.title}</span>
            <span className="t-caption mt-0.5 line-clamp-2 block">{l.line}</span>
          </span>
          <span aria-hidden className="hidden min-w-0 justify-end sm:flex"><Mini id={l.id} /></span>
          <span className="flex items-center gap-2 text-xs text-ink-3">
            <span className="t-num font-mono">{l.count}</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
          </span>
        </Link>
      ))}
      <p className="t-eyebrow mt-3">Tokens at the base · pages at the top</p>
    </div>
  );
}

function Mini({ id }: { id: string }) {
  switch (id) {
    case 'tokens':
      return (
        <span className="flex items-center gap-1.5">
          {['ground', 'surface', 'accent', 'accent-ink', 'positive', 'warning', 'critical', 'series-2', 'series-3', 'series-4'].map((c) => (
            <span key={c} className="size-5 rounded-full ring-1 ring-line" style={{ background: `var(--${c})` }} />
          ))}
        </span>
      );
    case 'base':
      return (
        <span className="flex items-baseline gap-4">
          <span className="t-kicker">Relay · Production</span>
          <span className="text-2xl font-semibold tracking-[-0.035em]">Overview</span>
        </span>
      );
    case 'components':
      return (
        <span className="flex items-center gap-2">
          <span className="inline-flex h-7 items-center rounded-md bg-accent px-2.5 text-xs font-medium text-on-accent shadow-accent">Create key</span>
          <span className="inline-flex h-7 items-center rounded-md border border-line-strong bg-surface px-2.5 text-xs font-medium">Export</span>
          <span className="inline-flex h-5.5 items-center gap-1.5 rounded-full bg-positive-tint px-2 text-xs font-medium text-positive-ink"><span className="size-1.5 rounded-full bg-positive" />Operational</span>
          <span className="relative h-5 w-9 rounded-full bg-accent"><span className="absolute top-0.5 right-0.5 size-4 rounded-full bg-on-accent" /></span>
        </span>
      );
    case 'patterns':
      return (
        <span className="flex items-end gap-3">
          <svg width="120" height="30" viewBox="0 0 120 30" className="overflow-visible"><path d="M0 22 C12 22 14 8 26 9 S40 20 52 18 S66 4 78 6 S96 16 106 10 L120 4" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" /></svg>
          <span className="flex h-7 items-end gap-0.5">
            {[0.5, 0.8, 0.4, 1, 0.65, 0.75].map((h, i) => <span key={i} className="w-2 rounded-t-[2px]" style={{ height: `${h * 100}%`, background: i === 3 ? 'var(--accent)' : 'var(--chart-neutral)' }} />)}
          </span>
        </span>
      );
    case 'pages':
      return (
        <span className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="grid h-8 w-12 grid-cols-[3px_1fr] gap-0.5 rounded-xs border border-line-strong bg-ground p-0.5">
              <span className="rounded-[1px] bg-fill-active" />
              <span className="flex flex-col gap-0.5">
                <span className={i === 0 ? 'h-2.5 rounded-[1px] bg-accent-tint ring-1 ring-accent-line' : 'h-2.5 rounded-[1px] bg-fill-active'} />
                <span className="flex-1 rounded-[1px] bg-fill-track" />
              </span>
            </span>
          ))}
        </span>
      );
  }
  return null;
}
