'use client';

import { Check, LogOut, Settings } from 'lucide-react';
import { app, nav } from '@/app.config';
import { Specimen } from '@/system/specimen';
import { Rail } from '.';

const Column = ({ current, label, user }: { current: string; label: string; user?: null }) => (
  <figure className="flex flex-col gap-2">
    <div className="relative h-150 w-(--rail-width) overflow-hidden rounded-lg border border-line bg-frame backdrop-blur-xl">
      <Rail nav={nav} current={current} user={user} />
    </div>
    <figcaption className="text-2xs text-ink-3">{label}</figcaption>
  </figure>
);

const PANEL = 'w-60 rounded-lg bg-surface-raised p-1 shadow-overlay';
const ROW = 'relative flex h-8 items-center gap-2.5 rounded-sm px-2 text-sm text-ink [&_svg]:size-4 [&_svg]:text-ink-3';

/** The sample personas, in the order the View as group lists them: the demo signs in as the first until one is chosen. */
const PERSONAS = ['Maya Chen', 'Jonas Weber', 'Priya Nair', 'Lucas Meyer', 'Grace Liu'];

/**
 * The workspace menu's surface, drawn inline: a Radix menu mounts only while it is open, so a preview that wants the
 * View as group looked at has to draw the panel itself.
 */
function MenuPanel({ suspended = false }: { suspended?: boolean }) {
  return (
    <div className={PANEL}>
      <p className="t-eyebrow px-2 pt-2 pb-1.5">Workspace</p>
      <div className={ROW}><Check className="!text-accent" strokeWidth={2.25} /><span className="min-w-0 flex-1 truncate">{app.name} {app.workspace}</span></div>
      <div className="-mx-1 my-1 h-px bg-line" />
      <div className={ROW}><Settings />Workspace settings</div>
      <div className={ROW}><LogOut />Sign out</div>
      <div className="-mx-1 my-1 h-px bg-line" />
      <p className="t-eyebrow px-2 pt-2 pb-1.5">View as</p>
      {PERSONAS.map((name, i) => (
        <div key={name} className={`${ROW} pr-8 ${suspended && i === PERSONAS.length - 1 ? 'text-ink-disabled' : ''}`}>
          {name}
          {i === 0 ? <Check className="absolute right-2 !text-accent" strokeWidth={2.25} /> : null}
        </div>
      ))}
    </div>
  );
}

export default function RailPreview() {
  return (
    <>
      <Specimen label="The rail" note="260px, on a translucent wash over the lit ground. The current page is an accent-tinted pill with a lit edge; it springs to the item you choose.">
        <div className="flex flex-wrap gap-6">
          <Column current="/" label="Overview is current" />
          <Column current="/health" label="Health is current; its badge counts one open incident" />
          <Column current="/" user={null} label="The session is still being found out: a skeleton, not a name" />
        </div>
      </Specimen>
      <Specimen label="View as" note="The foot of the workspace menu, drawn where it opens. The five sample personas, in order, the one read as checked; it ports only on open, so no persona's name reaches a page's first HTML.">
        <div className="flex flex-wrap gap-6">
          <figure className="flex flex-col gap-2">
            <MenuPanel />
            <figcaption className="text-2xs text-ink-3">Open: Maya Chen is read as</figcaption>
          </figure>
          <figure className="flex flex-col gap-2">
            <MenuPanel suspended />
            <figcaption className="text-2xs text-ink-3">A persona who is not Active: listed, out of reach</figcaption>
          </figure>
        </div>
      </Specimen>
      <Specimen label="Item states" stack>
        <ul className="flex w-(--rail-width) flex-col gap-0.5 rounded-lg border border-line bg-frame p-3">
          <li className="flex h-9 items-center gap-3 rounded-md px-3 text-sm text-ink-2">Rest</li>
          <li className="flex h-9 items-center gap-3 rounded-md bg-fill-hover px-3 text-sm text-ink">Hover</li>
          <li className="relative flex h-9 items-center gap-3 rounded-md bg-accent-tint px-3 text-sm font-medium text-ink ring-1 ring-accent-line ring-inset">
            <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-r-full bg-accent" />Current
          </li>
          <li className="flex h-9 items-center gap-3 rounded-md px-3 text-sm text-ink-2 outline-2 outline-offset-[-2px] outline-accent">Focus</li>
        </ul>
      </Specimen>
      <Specimen label="Below 1024px" note="The same rail opens as a drawer from the menu button in the top bar; it closes on Escape, on the scrim and on navigation.">
        <p className="t-small max-w-[60ch] text-ink-2">One node, rendered in two places: nothing about navigation is defined twice.</p>
      </Specimen>
    </>
  );
}
