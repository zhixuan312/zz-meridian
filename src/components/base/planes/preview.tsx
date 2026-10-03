'use client';

import { Specimen } from '@/system/specimen';


/** The whole stack of planes, as a page sees it, in one theme. */
function Scene({ theme }: { theme: 'dark' | 'light' }) {
  return (
    <div data-theme={theme} className="relative isolate overflow-hidden rounded-xl border border-line bg-ground text-ink">
      <div aria-hidden className="absolute inset-0 -z-10 bg-(image:--glow-ground)" />
      <div className="flex min-h-90">
        <div className="w-28 shrink-0 border-r border-line bg-frame p-3 backdrop-blur-xl">
          <p className="t-eyebrow">frame</p>
          <p className="t-caption mt-1">The rail</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <p className="t-eyebrow">ground · the page and its light</p>
          <div className="relative rounded-lg border border-line bg-surface p-4 shadow-card before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-highlight-top">
            <p className="text-sm font-semibold">surface</p>
            <p className="t-caption mt-0.5">Cards and tables</p>
            <div className="mt-3 rounded-md bg-surface-sunk p-3">
              <p className="text-xs font-medium">surface-sunk</p>
              <p className="t-caption">Table heads, wells, tracks</p>
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <div className="rounded-lg bg-surface-raised p-3 shadow-overlay">
              <p className="text-xs font-medium">surface-raised</p>
              <p className="t-caption">Menus, dialogs, toasts</p>
            </div>
            <div className="rounded-sm bg-surface-inverse px-2.5 py-1.5 text-xs text-ink-inverse shadow-overlay">surface-inverse · tooltips</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlanesPreview() {
  return (
    <>
      <Specimen label="Dark (default)" note="A night-sky ground lit by the accent from the top right, a trace of teal from the top left and a violet trace below. Cards are a wash of light, so the light shows through them.">
        <div className="w-full"><Scene theme="dark" /></div>
      </Specimen>
      <Specimen label="Light" note="A pale lavender ground under the same light; cards are white and carry a soft shadow instead of a lit edge.">
        <div className="w-full"><Scene theme="light" /></div>
      </Specimen>
      <Specimen label="Accents light the ground" note="The light is made of the accent, so a rebrand relights every page.">
        <div className="grid w-full gap-3 sm:grid-cols-4">
          {(['indigo', 'cobalt', 'jade', 'graphite'] as const).map((a) => (
            <div key={a} data-accent={a} className="relative isolate h-28 overflow-hidden rounded-lg border border-line bg-ground p-3">
              <div aria-hidden className="absolute inset-0 -z-10 bg-(image:--glow-ground)" />
              <p className="t-eyebrow">{a}</p>
            </div>
          ))}
        </div>
      </Specimen>
    </>
  );
}
