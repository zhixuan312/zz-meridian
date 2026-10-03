'use client';

import { Specimen, State } from '@/system/specimen';
import { Kbd } from '.';

export default function KbdPreview() {
  return (
    <>
      <Specimen label="Keys">
        <Kbd>⌘K</Kbd>
        <Kbd>/</Kbd>
        <Kbd>Esc</Kbd>
        <Kbd>↵</Kbd>
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
      </Specimen>
      <Specimen label="In context" className="gap-x-8">
        <State label="A hint beside an action">
          <p className="flex items-center gap-2 text-sm text-ink-2">Open search <Kbd>⌘K</Kbd></p>
        </State>
        <State label="A chord">
          <p className="flex items-center gap-1 text-sm text-ink-2"><Kbd>G</Kbd><span className="text-xs text-ink-3">then</span><Kbd>R</Kbd><span className="ml-1">Go to Requests</span></p>
        </State>
      </Specimen>
    </>
  );
}
