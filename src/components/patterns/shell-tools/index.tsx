'use client';

import { Bell, Search } from 'lucide-react';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip } from '@/components/ui/tooltip';
import { openCommand } from '@/components/patterns/command-palette';

/**
 * The global tools in the top bar of every console page: search and commands (⌘K), and alerts. They stay put while
 * the page scrolls, so they are always one press away.
 */
export function ShellTools() {
  return (
    <>
      <button
        type="button"
        onClick={openCommand}
        className="press flex h-9 items-center gap-2.5 rounded-full border border-line-strong bg-surface/60 pr-1.5 pl-3 text-sm text-ink-3 shadow-control backdrop-blur-md transition-colors hover:border-line-control/40 hover:text-ink-2 max-sm:w-9 max-sm:justify-center max-sm:px-0"
      >
        <Search className="size-4" strokeWidth={1.75} />
        <span className="w-36 text-left max-md:w-20 max-sm:hidden">Search</span>
        <Kbd className="max-sm:hidden">⌘K</Kbd>
      </button>
      <Tooltip content="Alerts · 1 new">
        <button type="button" aria-label="Alerts, 1 new" className="press relative grid size-9 place-items-center rounded-full border border-line-strong bg-surface/60 text-ink-2 shadow-control backdrop-blur-md hover:text-ink">
          <Bell className="size-4" strokeWidth={1.75} />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-accent ring-2 ring-ground" />
        </button>
      </Tooltip>
    </>
  );
}
