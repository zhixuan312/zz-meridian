'use client';

import { DollarSign, KeyRound, Link2 } from 'lucide-react';
import { Specimen, State } from '@/system/specimen';
import { Input } from '.';

export default function InputPreview() {
  return (
    <>
      <Specimen label="Default" note="Always inside a Field, which names it." stack>
        <Input aria-label="Endpoint name" placeholder="/v1/messages" className="max-w-80" frameClassName="max-w-80" />
      </Specimen>
      <Specimen label="Slots" note="A leading icon; a trailing unit or action." stack>
        <div className="grid w-full max-w-160 gap-3 sm:grid-cols-2">
          <Input aria-label="Webhook URL" leading={<Link2 />} placeholder="https://hooks.northwind.dev/zz-meridian" />
          <Input aria-label="Monthly budget" leading={<DollarSign />} defaultValue="2,400" trailing={<span className="text-xs">per month</span>} />
          <Input aria-label="Key name" leading={<KeyRound />} defaultValue="production-signing" />
          <Input aria-label="Rate limit" type="number" defaultValue={2000} trailing={<span className="text-xs">rpm</span>} />
        </div>
      </Specimen>
      <Specimen label="Sizes" note="sm 30 · md 36 · lg 44px." stack>
        <div className="grid w-full max-w-160 items-end gap-3 sm:grid-cols-3">
          <State label="Small"><Input size="sm" aria-label="Small" defaultValue="meridian-swift" /></State>
          <State label="Medium"><Input aria-label="Medium" defaultValue="meridian-swift" /></State>
          <State label="Large"><Input size="lg" aria-label="Large" defaultValue="meridian-swift" /></State>
        </div>
      </Specimen>
      <Specimen label="States" stack>
        <div className="grid w-full max-w-160 gap-x-3 gap-y-4 sm:grid-cols-2">
          <State label="Rest"><Input aria-label="Rest" placeholder="Name this key" /></State>
          <State label="Hover"><Input aria-label="Hover" placeholder="Name this key" frameClassName="border-line-control/40" /></State>
          <State label="Focus"><Input aria-label="Focus" defaultValue="staging-readonly" frameClassName="border-accent ring-3 ring-accent/22" /></State>
          <State label="Invalid"><Input aria-label="Invalid" invalid defaultValue="prod key!" /></State>
          <State label="Disabled"><Input aria-label="Disabled" disabled defaultValue="zzm_live_••••••••4f2a" /></State>
          <State label="Read only"><Input aria-label="Read only" readOnly defaultValue="us-east-1" frameClassName="bg-surface-sunk" /></State>
        </div>
      </Specimen>
    </>
  );
}
