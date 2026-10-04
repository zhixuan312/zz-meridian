'use client';

import { Info } from 'lucide-react';
import { Specimen, State } from '@/system/specimen';
import { Button } from '@/components/ui/button';
import { Tooltip } from '.';

/* The open state, drawn in place with the tooltip's own classes, so it can be compared without hovering. */
function Open({ children }: { children: React.ReactNode }) {
  return <div className="max-w-64 rounded-sm bg-surface-inverse px-2 py-1.5 text-xs leading-snug text-ink-inverse shadow-overlay">{children}</div>;
}

export default function TooltipPreview() {
  return (
    <>
      <Specimen label="Open" note="The inverse of the page, so it reads as a point of focus.">
        <State label="One line"><Open>Copy request ID</Open></State>
        <State label="Explanation"><Open>95 of every 100 requests finished faster than this.</Open></State>
      </Specimen>
      <Specimen label="Live" note="Opens after 300ms on hover, at once on keyboard focus; Escape closes it. The info button also opens on a press or a tap (toggle).">
        <Tooltip content="Share of requests answered with a 5xx or a 429." toggle>
          <button type="button" aria-label="About error rate" className="hit grid size-7 place-items-center rounded-full text-ink-3 hover:bg-fill-hover hover:text-ink-2">
            <Info className="size-4" />
          </button>
        </Tooltip>
        <Tooltip content="Export the current view as CSV" side="bottom">
          <Button>Export</Button>
        </Tooltip>
      </Specimen>
    </>
  );
}
