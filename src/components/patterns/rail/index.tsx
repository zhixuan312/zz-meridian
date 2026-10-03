'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { app, nav } from '@/app.config';
import { cn } from '@/lib/cn';
import { AppMark } from '@/components/base/app-mark';
import { Avatar } from '@/components/ui/avatar';
import { AppearanceMenu } from '@/components/patterns/appearance-menu';

/**
 * The navigation rail: a translucent wash on the lit ground. The current page is an accent-tinted pill with a lit
 * edge that springs to the item you choose; groups are named in mono caps; a count is a quiet badge.
 */
export function Rail({ current }: { /** The active route; defaults to the current pathname. */ current?: string } = {}) {
  const pathname = usePathname();
  const path = current ?? pathname;
  const list = useRef<HTMLDivElement>(null);
  const [marker, setMarker] = useState<{ y: number; h: number } | null>(null);
  const isActive = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));

  useLayoutEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[aria-current="page"]');
    setMarker(el ? { y: el.offsetTop, h: el.offsetHeight } : null);
  }, [path]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-16 items-center px-4">
        <button type="button" className="group -mx-1.5 flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left hover:bg-fill-hover">
          <AppMark size={28} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-md leading-tight font-semibold tracking-[-0.015em]">{app.name}</span>
            <span className="t-eyebrow mt-0.5 block truncate">{app.workspace}</span>
          </span>
          <ChevronsUpDown className="size-3.5 text-ink-3 group-hover:text-ink-2" />
        </button>
      </div>
      <nav ref={list} aria-label="Main" className="relative flex-1 overflow-y-auto px-3 pt-3 pb-4">
        {marker ? (
          <span
            aria-hidden
            className="absolute inset-x-3 overflow-hidden rounded-md bg-accent-tint ring-1 ring-accent-line ring-inset transition-[transform,height] duration-(--dur-enter) ease-spring"
            style={{ transform: `translateY(${marker.y}px)`, height: marker.h, top: 0 }}
          >
            <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-r-full bg-accent shadow-[0_0_12px_var(--accent)]" />
          </span>
        ) : null}
        {nav.map((g, gi) => (
          <div key={gi} className={cn(gi > 0 && 'mt-6')}>
            {g.label ? <p className="t-eyebrow mb-2 px-3">{g.label}</p> : null}
            <ul className="flex flex-col gap-0.5">
              {g.items.map((it) => {
                const on = isActive(it.href);
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      aria-current={on ? 'page' : undefined}
                      className={cn(
                        'group relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-(--dur-hover)',
                        on ? 'font-medium text-ink' : 'text-ink-2 hover:bg-fill-hover hover:text-ink',
                      )}
                    >
                      <Icon className={cn('size-4 shrink-0 transition-colors', on ? 'text-accent-ink' : 'text-ink-3 group-hover:text-ink-2')} strokeWidth={1.75} />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.badge ? <span className="t-num grid h-5 min-w-5 place-items-center rounded-full bg-warning-tint px-1.5 text-2xs font-semibold text-warning-ink">{it.badge}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="m-3 flex items-center gap-3 rounded-lg border border-line bg-surface/50 p-2.5">
        <Avatar name="Maya Chen" size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-medium">Maya Chen</p>
          <p className="truncate text-xs leading-tight text-ink-3">Owner</p>
        </div>
        <AppearanceMenu />
      </div>
    </div>
  );
}
