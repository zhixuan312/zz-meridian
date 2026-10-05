'use client';

import { app } from '@/app.config';
import { Specimen, State } from '@/system/specimen';
import { AppMark } from '.';

const SIZES = [20, 24, 28, 32] as const;

export default function AppMarkPreview() {
  return (
    <>
      {(['dark', 'light'] as const).map((t) => (
        <Specimen key={t} label={t === 'dark' ? 'On the dark ground' : 'On the light ground'}>
          {/* `text-ink` is load-bearing: `data-theme` redefines the variables in THIS scope, but `color` was resolved
              on `body` from the page's own theme, so without it the light specimen draws light text on a light ground
              (1.05:1 — a contrast the audit fails). The Planes preview carries it for the same reason. */}
          <div data-theme={t} className="flex w-full flex-wrap items-end gap-8 rounded-xl border border-line bg-ground text-ink p-6">
            {SIZES.map((s) => (
              <State key={s} label={`${s}px`}><AppMark size={s} /></State>
            ))}
            <State label="Standalone, with a label"><AppMark size={32} label={app.name} /></State>
            <State label="With the name, in the rail">
              <span className="flex items-center gap-2.5">
                <AppMark size={28} />
                <span>
                  <span className="block text-md leading-tight font-semibold tracking-[-0.015em]">{app.name}</span>
                  <span className="t-eyebrow mt-0.5 block">{app.workspace}</span>
                </span>
              </span>
            </State>
          </div>
        </Specimen>
      ))}
      <Specimen label="Accents" note="The tile is the accent, so the mark follows a rebrand.">
        {(['indigo', 'cobalt', 'jade', 'graphite'] as const).map((a) => (
          <State key={a} label={a}><span data-accent={a}><AppMark size={32} /></span></State>
        ))}
      </Specimen>
    </>
  );
}
