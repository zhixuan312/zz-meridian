'use client';

import { Activity, BarChart3, Bell, Download, Gauge, KeyRound, LayoutGrid, Plus, Search, Settings, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Specimen, State } from '@/system/specimen';

const SET = [LayoutGrid, Activity, BarChart3, Gauge, Users, KeyRound, Settings, Search, Bell, Download, Plus, Zap];

export default function IconsPreview() {
  return (
    <>
      <Specimen label="The set" note="Lucide, at a 1.75 stroke, in currentColor. One family, never mixed.">
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
          {SET.map((I, i) => (
            <span key={i} className="grid size-10 place-items-center rounded-md border border-line bg-surface text-ink-2"><I className="size-4" strokeWidth={1.75} /></span>
          ))}
        </div>
      </Specimen>
      <Specimen label="Sizes">
        <State label="14px · small controls, tiles"><Zap className="size-3.5" strokeWidth={1.75} /></State>
        <State label="16px · default"><Zap className="size-4" strokeWidth={1.75} /></State>
        <State label="18px · large controls, the menu"><Zap className="size-[18px]" strokeWidth={1.75} /></State>
      </Specimen>
      <Specimen label="In use" note="An icon is decoration: the control carries the name, as a label or an aria-label.">
        <Button icon={<Download />}>Export</Button>
        <span className="flex h-9 w-52 items-center gap-3 rounded-md bg-accent-tint px-3 text-sm font-medium ring-1 ring-accent-line ring-inset">
          <LayoutGrid className="size-4 text-accent-ink" strokeWidth={1.75} />Overview
        </span>
        <span className="flex h-9 w-52 items-center gap-3 rounded-md px-3 text-sm text-ink-2">
          <Gauge className="size-4 text-ink-3" strokeWidth={1.75} />Health
        </span>
      </Specimen>
    </>
  );
}
