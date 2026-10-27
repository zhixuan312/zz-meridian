'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Dialog } from 'radix-ui';
import { ArrowLeft, ArrowRight, ChevronRight, Menu, Search, X } from 'lucide-react';
import { workspaces } from '@/app.config';
import { cn } from '@/lib/cn';
import { AppMark } from '@/components/base/app-mark';
import { Kbd } from '@/components/ui/kbd';
import { AppearanceMenu } from '@/components/patterns/appearance-menu';
import { useNavDrawer } from '@/components/base/use-nav-drawer';

export type AtlasNav = { id: string; num?: string; title: string; line: string; items: { href: string; title: string; status?: string; mark?: string }[] }[];

/**
 * The Atlas frame: a reference shelf on the left, the reading column on the right. The shelf lists every entry by
 * layer, numbered 0 to 5 from tokens to the product's workspaces; "/" filters it; the current section opens on its own.
 */
export function AtlasShell({ nav, children }: { nav: AtlasNav; children: ReactNode }) {
  // The frame never reads the address (see `AppShell` for why): the shelf and the drawer do, each behind its own boundary.
  // How many times the contents have been asked for; the drawer answers each one (see `Drawer`).
  const [asked, setAsked] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  const shelf = <Suspense fallback={null}><Shelf nav={nav} /></Suspense>;
  return (
    <div ref={frame} data-drawer-frame className="min-h-dvh lg:grid lg:grid-cols-[var(--rail-width)_minmax(0,1fr)]">
      {/* The first stop for a keyboard: past the whole shelf, straight to what is being read. */}
      <a
        href="#content"
        className="pointer-events-none fixed top-3 left-3 z-(--layer-tooltip) -translate-y-16 rounded-md bg-surface-raised px-3 py-2 text-sm font-medium text-ink opacity-0 shadow-overlay focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:opacity-100"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-frame backdrop-blur-xl lg:block">{shelf}</aside>
      <div className="sticky top-0 z-(--layer-sticky) flex h-14 items-center gap-3 border-b border-line bg-ground/72 px-4 backdrop-blur-xl lg:hidden">
        <button type="button" aria-label="Open the contents" onClick={() => setAsked((n) => n + 1)} className="press hit -ml-1 grid size-9 place-items-center rounded-md text-ink-2 hover:bg-fill-hover">
          <Menu className="size-[18px]" strokeWidth={1.75} />
        </button>
        <Link href="/system" className="flex items-center gap-2 text-sm font-semibold"><AppMark size={20} />ZZ Meridian</Link>
      </div>
      <Suspense fallback={null}><Drawer asked={asked} shelf={shelf} root={frame} /></Suspense>
      {/* An entry's page reads its own address (its section and id), so it too waits behind a boundary: for an address the
          build did not know, the frame is what is prerendered, and the page or its not-found follows. */}
      <div id="content" tabIndex={-1} className="min-w-0 outline-none"><Suspense fallback={null}>{children}</Suspense></div>
    </div>
  );
}

/**
 * The contents as a drawer below 1024px: the shelf, in a dialog that the top bar's button opens. Whether it is open is
 * `useNavDrawer`'s. It waits behind its own boundary, which can arrive after the button that opens it, so the frame
 * counts the presses and the drawer opens whenever the count it has answered is behind: a press made before it was
 * there is answered when it arrives, and each press once (issue #32, as in the console's shell).
 */
function Drawer({ shelf, asked, root }: { shelf: ReactNode; asked: number; root: RefObject<HTMLElement | null> }) {
  const nav = useNavDrawer(asked, root);
  return (
    <Dialog.Root open={nav.open} onOpenChange={nav.setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="scrim-in fixed inset-0 z-(--layer-rail) bg-scrim lg:hidden" />
        <Dialog.Content aria-describedby={undefined} {...nav.content} className="sheet-in fixed inset-y-0 left-0 z-(--layer-rail) w-(--rail-width) max-w-[86vw] border-r border-line bg-ground shadow-overlay lg:hidden">
          <Dialog.Title className="sr-only">Contents</Dialog.Title>
          {shelf}
          <Dialog.Close aria-label="Close the contents" className="absolute top-4 -right-12 grid size-9 place-items-center rounded-full bg-surface-raised text-ink-2 shadow-overlay">
            <X className="size-4" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Shelf({ nav }: { nav: AtlasNav }) {
  const path = usePathname();
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const current = nav.find((s) => s.items.some((i) => path === i.href))?.id ?? (path === '/system' ? 'start' : undefined);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(current ? [current] : ['start']));
  // The section of the page being read opens when the reader arrives in it.
  const [opened, setOpened] = useState(current);
  if (current !== opened) {
    setOpened(current);
    if (current) setOpenIds((s) => new Set(s).add(current));
  }
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      // The search pill is in the sheet below 1024px, so there is nothing here to focus: swallowing the key then
      // would leave `/` doing nothing at all, which is worse than leaving the character alone.
      if (e.key !== '/' || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || !input.current) return;
      e.preventDefault();
      input.current.focus();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? nav.map((sec) => ({ ...sec, items: sec.items.filter((i) => i.title.toLowerCase().includes(s)) })).filter((sec) => sec.items.length) : nav;
  }, [q, nav]);

  return (
    <div className="flex h-full flex-col">
      <Link href="/system" className="group flex h-16 shrink-0 items-center gap-3 px-5">
        <AppMark size={28} />
        <span className="min-w-0">
          <span className="block text-md leading-tight font-semibold tracking-[-0.015em]">ZZ Meridian</span>
          <span className="t-eyebrow mt-0.5 block">Design Atlas</span>
        </span>
      </Link>
      <div className="px-3 pb-2">
        <label className="flex h-(--control-md) items-center gap-2 rounded-md border border-line-strong bg-surface/50 px-2.5 text-sm text-ink-3 shadow-control focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/20">
          <Search className="size-4 shrink-0" strokeWidth={1.75} />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setQ('')} placeholder="Find a card" aria-label="Find a card" className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3" />
          <Kbd>/</Kbd>
        </label>
      </div>
      <nav aria-label="Atlas" className="flex-1 overflow-y-auto overscroll-contain px-3 pt-2 pb-6">
        {filtered.map((sec) => {
          const isOpen = q !== '' || openIds.has(sec.id);
          return (
            <div key={sec.id} className="mt-0.5">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIds((s) => { const n = new Set(s); if (n.has(sec.id)) n.delete(sec.id); else n.add(sec.id); return n; })}
                className={cn('group flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left hover:bg-fill-hover', current === sec.id ? 'text-ink' : 'text-ink-2')}
              >
                <span className={cn('t-num grid size-5 place-items-center rounded-xs text-2xs font-medium', sec.num ? (current === sec.id ? 'bg-accent text-on-accent' : 'bg-fill-track text-ink-2') : 'text-ink-3')}>
                  {sec.num ?? <span className="size-1 rounded-full bg-current" />}
                </span>
                <span className="flex-1 truncate text-sm font-semibold">{sec.title}</span>
                <span className="t-num text-xs text-ink-3">{sec.items.length}</span>
                <ChevronRight className={cn('size-3.5 text-ink-3 transition-transform duration-(--dur-hover)', isOpen && 'rotate-90')} />
              </button>
              {isOpen ? (
                <ul className="mt-0.5 mb-2 ml-[18px] border-l border-line pl-2">
                  {sec.items.map((it) => {
                    const on = path === it.href;
                    return (
                      <li key={it.href}>
                        <Link href={it.href} aria-current={on ? 'page' : undefined} className={cn('relative flex h-8 items-center gap-2 rounded-sm px-2.5 text-sm', on ? 'bg-accent-tint font-medium text-ink' : 'text-ink-2 hover:bg-fill-hover hover:text-ink')}>
                          {on ? <span aria-hidden className="absolute top-1.5 bottom-1.5 -left-[9px] w-0.5 rounded-full bg-accent" /> : null}
                          <span className="flex-1 truncate">{it.title}</span>
                          {/* A template is told from the pages built from it: the layout names the mark, the shelf only draws it. */}{it.mark ? <span className="text-2xs font-medium text-ink-2">{it.mark}</span> : null}
                          {/* Only the exception is marked: most cards are beta, so a mark on every row says nothing. */}{it.status === 'draft' ? <span className="text-2xs font-medium text-ink-2">{it.status}</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="flex items-center gap-2 border-t border-line px-4 py-3">
        {/* The way back to the product: Main first, then each other workspace, under the names the declaration gives them. */}
        <nav aria-label="Workspaces" className="flex min-w-0 flex-1 flex-col gap-1">
          <Link href={workspaces.main.homeHref} className="inline-flex items-center gap-1 text-xs font-medium text-ink-2 hover:text-ink"><ArrowLeft className="size-3.5" />Back to {workspaces.main.label}</Link>
          {(Object.keys(workspaces) as (keyof typeof workspaces)[]).filter((id) => id !== 'main').map((id) => (
            <Link key={id} href={workspaces[id].homeHref} className="inline-flex items-center gap-1 text-xs font-medium text-ink-2 hover:text-ink">{workspaces[id].label}<ArrowRight className="size-3.5" /></Link>
          ))}
        </nav>
        <AppearanceMenu />
      </div>
    </div>
  );
}
