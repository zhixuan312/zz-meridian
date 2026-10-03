'use client';

import { Specimen, State } from '@/system/specimen';
import { Spinner } from '.';

export default function SpinnerPreview() {
  return (
    <>
      <Specimen label="Sizes" note="14, 16 and 20px, in the current text colour.">
        <State label="sm"><Spinner size="sm" /></State>
        <State label="md"><Spinner /></State>
        <State label="lg"><Spinner size="lg" /></State>
      </Specimen>
      <Specimen label="In context" note="For an action in progress. Content that is loading gets a Skeleton.">
        <span className="flex items-center gap-2 text-sm text-ink-2"><Spinner size="sm" />Rotating key…</span>
        <span className="flex items-center gap-2 text-sm text-accent-ink"><Spinner size="sm" />Syncing</span>
      </Specimen>
    </>
  );
}
