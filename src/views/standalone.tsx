import Link from 'next/link';
import type { ReactNode } from 'react';
import { app } from '@/app.config';
import { AppMark } from '@/components/base/app-mark';
import { StatusDot } from '@/components/ui/status-dot';
import { summarise } from '@/components/patterns/status-list/summarise';
import { SERVICES } from '@/system/fixtures/relay';

/**
 * A screen outside the shell (sign-in, not found): the lit ground, the mark in the corner, and one sentence at poster
 * size that ends on an accent full stop: the one place the accent is punctuation.
 */
export function Standalone({ kicker, sentence, lead, aside, children }: { kicker?: ReactNode; sentence: string; lead?: ReactNode; aside?: ReactNode; children?: ReactNode }) {
  const status = summarise(SERVICES);
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <header className="flex h-20 items-center px-(--gutter)">
        <Link href="/" className="flex items-center gap-2.5 text-md font-semibold tracking-[-0.015em]">
          <AppMark size={28} />
          {app.name}
        </Link>
      </header>
      <div className="mx-auto grid w-full max-w-(--data-width) flex-1 items-center gap-12 px-(--gutter) pt-6 pb-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,26rem)] lg:gap-20">
        <div className="min-w-0">
          {kicker ? <p className="t-kicker mb-6">{kicker}</p> : null}
          <h1 className="t-display max-w-[13ch] text-balance">
            {sentence.replace(/\.$/, '')}
            <span className="text-accent">.</span>
          </h1>
          {lead ? <p className="t-lead mt-6 max-w-[46ch]">{lead}</p> : null}
          {children}
        </div>
        {aside ? <div className="min-w-0">{aside}</div> : null}
      </div>
      <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-(--gutter) py-5 text-xs text-ink-3">
        <span>© 2026 {app.name}</span>
        <Link href="/system" className="hover:text-ink-2">Design system</Link>
        <Link href="/health" className="ml-auto inline-flex items-center gap-2 hover:text-ink-2">
          <StatusDot tone={status.status === 'operational' ? 'positive' : status.status === 'degraded' ? 'warning' : 'critical'} />
          {status.text}
        </Link>
      </footer>
    </main>
  );
}
