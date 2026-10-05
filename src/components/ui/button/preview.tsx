'use client';

import { ArrowRight, Download, Plus, RotateCw, Trash2 } from 'lucide-react';
import { Specimen, State } from '@/system/specimen';
import { Button } from '.';

export default function ButtonPreview() {
  return (
    <>
      <Specimen label="Variants" note="One primary per view.">
        <Button variant="primary" icon={<Plus />}>Create key</Button>
        <Button icon={<Download />}>Export</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger" icon={<Trash2 />}>Revoke key</Button>
      </Specimen>
      <Specimen label="Sizes" note="sm 30 · md 36 · lg 44px; compact density 26 · 30 · 36.">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg" variant="primary" trailing={<ArrowRight />}>Large</Button>
      </Specimen>
      <Specimen label="States">
        <State label="Rest"><Button variant="primary">Save changes</Button></State>
        <State label="Hover"><Button variant="primary" className="brightness-[0.94]">Save changes</Button></State>
        <State label="Focus"><Button variant="primary" className="outline-2 outline-offset-2 outline-accent">Save changes</Button></State>
        <State label="Busy"><Button variant="primary" busy>Saving</Button></State>
        <State label="Disabled"><Button variant="primary" disabled>Save changes</Button></State>
      </Specimen>
      <Specimen label="Secondary states">
        <State label="Rest"><Button icon={<RotateCw />}>Retry</Button></State>
        <State label="Hover"><Button icon={<RotateCw />} className="border-line-control/40 bg-surface-sunk">Retry</Button></State>
        <State label="Disabled"><Button icon={<RotateCw />} disabled>Retry</Button></State>
      </Specimen>
      <Specimen label="Block" note="Fills its container: standalone screens and sheets on phones.">
        <div className="w-full max-w-80"><Button variant="primary" size="lg" block>Sign in</Button></div>
      </Specimen>
    </>
  );
}
