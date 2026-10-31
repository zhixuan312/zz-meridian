'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Specimen, State } from '@/system/specimen';
import { ACCENTS } from '@/lib/preferences';
import { AppearanceMenu } from '.';
import { MENU_CONTENT, MENU_ITEM } from '@/components/ui/menu';

const row = MENU_ITEM;

export default function AppearanceMenuPreview() {
  return (
    <>
      <Specimen label="Open" note="Rendered inline here; in the product it opens upward from the rail's foot.">
        <div className={`w-60 ${MENU_CONTENT}`}>
          <p className="t-eyebrow px-2 pt-2 pb-1.5">Theme</p>
          <div className={`${row} pr-8`}><Monitor />System</div>
          <div className={`${row} pr-8`}><Sun />Light</div>
          <div className={`${row} bg-fill-hover pr-8`}><Moon />Dark<Check className="absolute right-2 !size-4 !text-accent" strokeWidth={2.25} /></div>
          <div className="-mx-1 my-1 h-px bg-line" />
          <p className="t-eyebrow px-2 pt-2 pb-1.5">Accent</p>
          {ACCENTS.map((accent, i) => (
            <div key={accent} className={`${row} pr-8`}>
              <span data-accent={accent} data-swatch className="size-4 rounded-full bg-accent" />
              {accent[0].toUpperCase() + accent.slice(1)}
              {i === 0 ? <Check className="absolute right-2 !size-4 !text-accent" strokeWidth={2.25} /> : null}
            </div>
          ))}
          <div className="-mx-1 my-1 h-px bg-line" />
          <p className="t-eyebrow px-2 pt-2 pb-1.5">Density</p>
          <div className={`${row} pr-8`}>Comfortable<Check className="absolute right-2 !size-4 !text-accent" strokeWidth={2.25} /></div>
          <div className={`${row} pr-8`}>Compact</div>
        </div>
      </Specimen>
      <Specimen label="Trigger">
        <State label="Live"><AppearanceMenu /></State>
        <State label="Open"><span className="grid size-8 place-items-center rounded-md bg-fill-active text-ink"><svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M20 7h-9M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></svg></span></State>
      </Specimen>
    </>
  );
}
