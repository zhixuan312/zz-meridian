'use client';

import { DEMO_NOW, DEMO_UPDATED_AT } from '@/system/fixtures/sample';
import { Specimen, State } from '@/system/specimen';
import { Freshness } from '.';

export default function FreshnessPreview() {
  return (
    <>
      <Specimen label="States" note="The time the data arrived, never now(). Past its contract (15 min by default) it says Stale.">
        <State label="Fresh: the dot breathes"><Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} /></State>
        <State label="Stale: past the contract"><Freshness updatedAt={new Date(DEMO_NOW.getTime() - 42 * 60_000)} now={DEMO_NOW} /></State>
        <State label="Hours old"><Freshness updatedAt={new Date(DEMO_NOW.getTime() - 5 * 3600_000)} now={DEMO_NOW} staleAfterMs={24 * 3600_000} /></State>
        <State label="Never updated"><Freshness updatedAt={null} now={DEMO_NOW} /></State>
      </Specimen>
      <Specimen label="In the masthead" note="Beside the actions, quieter than them.">
        <div className="flex flex-wrap items-center gap-2.5">
          <Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />
        </div>
      </Specimen>
    </>
  );
}
