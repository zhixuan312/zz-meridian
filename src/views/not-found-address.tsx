'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';
import { app } from '@/app.config';
import { Button } from '@/components/ui/button';
import { openCommand } from '@/components/patterns/command-palette';
import { cn } from '@/lib/cn';
import { nearestOf, readable } from '@/views/not-found';

/**
 * The address that led nowhere, walked back to the deepest page that exists: that part is a link, the part after it is
 * marked as the part that is missing, and one line says which is which. `display` sets it large, as the protagonist of
 * a page inside the shell; `quiet` sets it at body size, under the sentence of a standalone screen.
 */
export function MissingAddress({ size = 'display' }: { size?: 'display' | 'quiet' }) {
  const n = nearestOf(usePathname() ?? '/');
  const atRoot = n.href === '/';
  const found = atRoot ? '/' : n.href;
  const missing = readable(atRoot ? n.rest.slice(1) : n.rest);
  const segments = n.rest.split('/').filter(Boolean);
  const last = segments.length === 1 ? readable(segments[0]) : null;
  // A short ID reads back in the sentence; a long one is already spelled out above, so the sentence points there.
  const named = last && last.length <= 32 ? <code className="font-mono text-ink">{last}</code> : 'the address above';
  return (
    <div className="min-w-0">
      <p className={cn('font-mono break-all', size === 'display' ? 'text-xl leading-snug tracking-[-0.01em]' : 'text-sm leading-relaxed')}>
        <Link href={found} aria-label={`${found}, ${n.label}`} className="row-link text-ink-2">{found}</Link>
        <span className="border-b-2 border-dashed border-critical pb-px text-ink">{missing}</span>
      </p>
      <p className={cn('text-pretty text-ink-2', size === 'display' ? 't-small mt-4' : 't-caption mt-2.5')}>
        {atRoot ? (
          <>No page in {app.name} lives at this address.</>
        ) : last ? (
          <>{n.label} is still here. Nothing in it answers to {named}.</>
        ) : (
          <>{n.label} is still here; the rest of the address leads nowhere.</>
        )}
      </p>
    </div>
  );
}

/**
 * The ways back: the nearest page that exists first, then the Overview when that is somewhere else. Inside the shell,
 * where the command palette lives, a miss at the root offers search instead. The caller lays them out.
 */
export function WayBack({ size = 'lg', search = false }: { size?: 'md' | 'lg'; search?: boolean }) {
  const n = nearestOf(usePathname() ?? '/');
  const atRoot = n.href === '/';
  return (
    <>
      <Button asChild variant="primary" size={size}>
        <Link href={n.href}><ArrowLeft />{atRoot ? 'Go to Overview' : `Back to ${n.label}`}</Link>
      </Button>
      {!atRoot ? (
        <Button asChild size={size}><Link href="/">Go to Overview</Link></Button>
      ) : search ? (
        <Button size={size} icon={<Search />} onClick={openCommand}>Search pages</Button>
      ) : null}
    </>
  );
}
