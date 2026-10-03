import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The vocabulary of a card's preview. A preview shows every variant and state at once, statically, each labelled:
 * a reader compares states side by side instead of hovering to discover them.
 */
export function Specimen({ label, note, children, className, stack }: { label: string; note?: ReactNode; children: ReactNode; className?: string; stack?: boolean }) {
  return (
    <section className="grid gap-x-8 gap-y-3 border-t border-line py-6 first:border-0 first:pt-1 last:pb-1 md:grid-cols-[9.5rem_minmax(0,1fr)]">
      <div className="min-w-0">
        <h3 className="t-eyebrow">{label}</h3>
        {note ? <p className="t-caption mt-1.5 text-pretty">{note}</p> : null}
      </div>
      <div className={cn('min-w-0', stack ? 'flex flex-col gap-4' : 'flex flex-wrap items-center gap-3', className)}>{children}</div>
    </section>
  );
}

/** One item with a caption under it: "Hover", "Disabled", "Compact". */
export function State({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <figure className={cn('flex min-w-0 flex-col items-start gap-2', className)}>
      {children}
      <figcaption className="text-2xs text-ink-3">{label}</figcaption>
    </figure>
  );
}

/** A plane to set components on when they need the canvas or a card behind them. */
export function Plane({ on = 'ground', children, className }: { on?: 'ground' | 'surface' | 'frame'; children: ReactNode; className?: string }) {
  const bg = on === 'surface' ? 'bg-surface border border-line' : on === 'frame' ? 'bg-frame' : 'bg-ground border border-line';
  return <div className={cn('w-full rounded-lg p-5', bg, className)}>{children}</div>;
}
