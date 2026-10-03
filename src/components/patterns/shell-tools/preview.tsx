'use client';

import { Specimen, State } from '@/system/specimen';
import { POPOVER_CONTENT } from '@/components/ui/popover';
import { cn } from '@/lib/cn';
import { DEMO_NOW } from '@/system/fixtures/sample';
import { ALERTS } from '@/system/fixtures/sample-ops';
import { AlertsPanel, ShellTools } from '.';

const Bar = ({ stuck, title }: { stuck?: boolean; title?: string }) => (
  <div className={`flex h-14 w-full items-center gap-3 rounded-lg border px-4 ${stuck ? 'border-line bg-ground/72 backdrop-blur-xl' : 'border-transparent'}`}>
    <p className={`min-w-0 truncate text-sm font-semibold transition-opacity ${stuck ? 'opacity-100' : 'opacity-0'}`}>{title ?? 'Overview'}</p>
    <div className="ml-auto flex items-center gap-1.5"><ShellTools alerts={ALERTS} now={DEMO_NOW} /></div>
  </div>
);

export default function ShellToolsPreview() {
  return (
    <>
      <Specimen label="In the top bar" stack note="At rest the bar is clear and the page's own title is below it. Once the title scrolls out, the bar turns to glass and the compact title fades in.">
        <State label="At rest" className="w-full"><Bar /></State>
        <State label="Scrolled" className="w-full"><Bar stuck /></State>
      </Specimen>
      <Specimen label="Alerts panel" note="The bell opens it. The live incident leads; each row links to where it is handled, and opening one marks it read.">
        <State label="One new"><div className={cn(POPOVER_CONTENT, 'w-88 p-0')}><AlertsPanel alerts={ALERTS} now={DEMO_NOW} onMarkAll={() => {}} /></div></State>
        <State label="Nothing new"><div className={cn(POPOVER_CONTENT, 'w-88 p-0')}><AlertsPanel alerts={[]} now={DEMO_NOW} /></div></State>
      </Specimen>
      <Specimen label="Phone" note="Under 640px the search pill folds to its icon; the keyboard hint goes.">
        <div className="w-90 max-w-full rounded-lg border border-line"><Bar stuck title="Requests" /></div>
      </Specimen>
    </>
  );
}
