'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Specimen } from '@/system/specimen';
import { Button } from '@/components/ui/button';
import { SHEET_BODY, SHEET_FOOT, SHEET_HEAD, SHEET_PANEL, Sheet, SheetContent, SheetTrigger } from '.';

const FACTS: [string, string][] = [
  ['Status', '201 Created'],
  ['Latency', '612 ms'],
  ['Customer', 'Parallax AI'],
  ['Region', 'us-east-1'],
  ['Model', 'relay-large'],
  ['Size', '4.2 KB'],
];

function Body() {
  return (
    <dl className="divide-y divide-line">
      {FACTS.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-4 py-2.5 text-sm">
          <dt className="text-ink-3">{k}</dt>
          <dd className="t-num text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function SheetPreview() {
  return (
    <>
      <Specimen label="Open" note="From the right edge, 440px, over a dimmed page; the footer holds the actions.">
        <div className="flex w-full justify-end overflow-hidden rounded-lg bg-scrim pl-16 max-sm:pl-0 max-sm:pt-16">
          <div className={cn(SHEET_PANEL, 'w-full max-w-110 border-l border-line max-sm:rounded-t-xl max-sm:border-l-0')}>
            <div className={SHEET_HEAD}>
              <div className="min-w-0 flex-1">
                <p className="t-section">POST /v1/messages</p>
                <p className="t-small mt-1 text-ink-2">req_8f3k2m1x · 4 minutes ago</p>
              </div>
              <span className="-mt-0.5 -mr-2 grid size-8 place-items-center rounded-md text-ink-3"><X className="size-4" /></span>
            </div>
            <div className={SHEET_BODY}><Body /></div>
            <div className={SHEET_FOOT}><Button variant="ghost">Close</Button><Button>Replay request</Button></div>
          </div>
        </div>
      </Specimen>
      <Specimen label="Live" note="Under 640px it rises from the bottom, full width.">
        <Sheet>
          <SheetTrigger asChild><Button>Open request</Button></SheetTrigger>
          <SheetContent title="POST /v1/messages" description="req_8f3k2m1x · 4 minutes ago" footer={<Button>Replay request</Button>}>
            <Body />
          </SheetContent>
        </Sheet>
      </Specimen>
    </>
  );
}
