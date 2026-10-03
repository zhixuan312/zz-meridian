'use client';

import { Specimen } from '@/system/specimen';
import { Rail } from '.';

const Column = ({ current, label }: { current: string; label: string }) => (
  <figure className="flex flex-col gap-2">
    <div className="relative h-150 w-(--rail-width) overflow-hidden rounded-lg border border-line bg-frame backdrop-blur-xl">
      <Rail current={current} />
    </div>
    <figcaption className="text-2xs text-ink-3">{label}</figcaption>
  </figure>
);

export default function RailPreview() {
  return (
    <>
      <Specimen label="The rail" note="260px, on a translucent wash over the lit ground. The current page is an accent-tinted pill with a lit edge; it springs to the item you choose.">
        <div className="flex flex-wrap gap-6">
          <Column current="/" label="Overview is current" />
          <Column current="/health" label="Health is current; its badge counts one open incident" />
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
