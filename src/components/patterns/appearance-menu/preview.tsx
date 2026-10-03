'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Specimen, State } from '@/system/specimen';
import { AppearanceMenu } from '.';

const row = 'relative flex h-8 items-center gap-2.5 rounded-sm px-2 text-sm text-ink [&_svg]:size-4 [&_svg]:text-ink-3';
const SWATCH = ['indigo', 'cobalt', 'jade', 'graphite'] as const;

export default function AppearanceMenuPreview() {
  return (
    <>
      <Specimen label="Open" note="Rendered inline here; in the product it opens upward from the rail's foot.">
        <div className="w-60 rounded-lg bg-surface-raised p-1 shadow-overlay">
          <p className="t-eyebrow px-2 pt-2 pb-1.5">Theme</p>
          <div className={`${row} pr-8`}><Monitor />System</div>
          <div className={`${row} bg-fill-hover pr-8`}><Moon />Dark<Check className="absolute right-2 !size-4 !text-accent" strokeWidth={2.25} /></div>
          <div className={`${row} pr-8`}><Sun />Light</div>
          <div className="-mx-1 my-1 h-px bg-line" />
          <p className="t-eyebrow px-2 pt-2 pb-1.5">Accent</p>
          <div className="flex gap-1.5 px-2 pt-0.5 pb-2">
            {SWATCH.map((a, i) => (
              <span key={a} title={a} className={`grid size-7 place-items-center rounded-full ring-offset-2 ring-offset-surface-raised ${i === 0 ? 'ring-2 ring-ink' : ''}`}>
                <span data-accent={a} className="size-5 rounded-full bg-accent" />
              </span>
            ))}
          </div>
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
