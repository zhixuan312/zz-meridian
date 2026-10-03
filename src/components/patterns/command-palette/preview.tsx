'use client';

import { useMemo, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { nav } from '@/app.config';
import { Specimen, State } from '@/system/specimen';
import { CommandPanel, type Command } from '.';

function useCommands(): Command[] {
  return useMemo(
    () => [
      ...nav.flatMap((g) => g.items.map((it) => { const Icon = it.icon; return { id: it.href, group: 'Go to', label: it.label, hint: g.label, icon: <Icon />, run: () => {} }; })),
      { id: 'light', group: 'Appearance', label: 'Use the light theme', icon: <Sun />, run: () => {} },
      { id: 'dark', group: 'Appearance', label: 'Use the dark theme', icon: <Moon />, run: () => {} },
      { id: 'system', group: 'Appearance', label: 'Follow the system theme', icon: <Monitor />, run: () => {} },
    ],
    [],
  );
}

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full max-w-150 overflow-hidden rounded-xl bg-surface-raised shadow-overlay">{children}</div>
);

export default function CommandPalettePreview() {
  const all = useCommands();
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const shown = all.filter((c) => c.label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <Specimen label="Open" note="⌘K or Ctrl K from anywhere, or the Search pill in the top bar. Type to filter; this one is live.">
        <Frame>
          <CommandPanel query={q} onQuery={(v) => { setQ(v); setAt(0); }} commands={shown} at={at} onAt={setAt} onRun={() => {}} />
        </Frame>
      </Specimen>
      <Specimen label="States">
        <State label="Filtered: “he”" className="w-full max-w-150">
          <Frame>
            <CommandPanel query="he" onQuery={() => {}} commands={all.filter((c) => c.label.toLowerCase().includes('he'))} at={0} onAt={() => {}} onRun={() => {}} />
          </Frame>
        </State>
        <State label="No match" className="w-full max-w-150">
          <Frame>
            <CommandPanel query="invoices" onQuery={() => {}} commands={[]} at={0} onAt={() => {}} onRun={() => {}} />
          </Frame>
        </State>
      </Specimen>
    </>
  );
}
