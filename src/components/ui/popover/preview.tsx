'use client';

import { ChevronDown, ListFilter } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Specimen } from '@/system/specimen';
import { Button } from '@/components/ui/button';
import { POPOVER_CONTENT, Popover, PopoverClose, PopoverContent, PopoverTrigger } from '.';

const STATUSES = [
  { label: '2xx', n: '2.9M', on: true },
  { label: '4xx', n: '118K', on: true },
  { label: '5xx', n: '13K', on: false },
];

function Filters() {
  return (
    <>
      <p className="t-eyebrow mb-2.5">Status</p>
      <ul className="flex flex-col gap-1">
        {STATUSES.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 rounded-sm py-1 text-sm">
            <span className={cn('grid size-4 place-items-center rounded-xs border', s.on ? 'border-accent bg-accent text-on-accent' : 'border-line-control')}>
              {s.on ? <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
            </span>
            <span className="flex-1">{s.label}</span>
            <span className="t-num text-xs text-ink-3">{s.n}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2 border-t border-line pt-3">
        <Button size="sm" variant="ghost">Clear</Button>
        <Button size="sm" variant="primary">Apply</Button>
      </div>
    </>
  );
}

export default function PopoverPreview() {
  return (
    <>
      <Specimen label="Open" note="Anchored under its trigger; holds a small form, not a list of actions.">
        <div className="flex flex-col items-start gap-2">
          <Button icon={<ListFilter />} trailing={<ChevronDown />} className="bg-surface-sunk">Status · 2</Button>
          <div className={cn(POPOVER_CONTENT, 'w-64')}><Filters /></div>
        </div>
      </Specimen>
      <Specimen label="Explanation" note="A definition with a link: more than a tooltip can hold.">
        <div className={cn(POPOVER_CONTENT, 'w-72')}>
          <p className="font-medium">Latency p95</p>
          <p className="t-small mt-1 text-ink-2">95 of every 100 requests finished faster than this, measured from the gateway receiving the request to the last byte written.</p>
          <a className="link mt-2 inline-block text-sm" href="#">How latency is measured</a>
        </div>
      </Specimen>
      <Specimen label="Live">
        <Popover>
          <PopoverTrigger asChild><Button icon={<ListFilter />} trailing={<ChevronDown />}>Status</Button></PopoverTrigger>
          <PopoverContent className="w-64">
            <Filters />
            <PopoverClose className="sr-only">Close</PopoverClose>
          </PopoverContent>
        </Popover>
      </Specimen>
    </>
  );
}
