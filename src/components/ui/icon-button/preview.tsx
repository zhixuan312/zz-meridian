'use client';

import { Copy, MoreHorizontal, RefreshCw, Star, X } from 'lucide-react';
import { Specimen, State } from '@/system/specimen';
import { IconButton } from '.';

export default function IconButtonPreview() {
  return (
    <>
      <Specimen label="Variants" note="Ghost in toolbars and card heads; secondary beside other outlined controls.">
        <State label="Ghost"><IconButton label="More actions" icon={<MoreHorizontal />} /></State>
        <State label="Secondary"><IconButton variant="secondary" label="Refresh" icon={<RefreshCw />} /></State>
        <State label="With tooltip"><IconButton variant="secondary" tooltip label="Copy request ID" icon={<Copy />} /></State>
      </Specimen>
      <Specimen label="Sizes" note="Square at the control height: 30, 36 and 44px.">
        <State label="sm"><IconButton variant="secondary" size="sm" label="Close" icon={<X />} /></State>
        <State label="md"><IconButton variant="secondary" size="md" label="Close" icon={<X />} /></State>
        <State label="lg"><IconButton variant="secondary" size="lg" label="Close" icon={<X />} /></State>
      </Specimen>
      <Specimen label="States">
        <State label="Rest"><IconButton variant="secondary" label="Refresh" icon={<RefreshCw />} /></State>
        <State label="Hover"><IconButton variant="secondary" label="Refresh" icon={<RefreshCw />} className="bg-surface-sunk text-ink" /></State>
        <State label="Focus"><IconButton variant="secondary" label="Refresh" icon={<RefreshCw />} className="outline-2 outline-offset-2 outline-accent" /></State>
        <State label="Pressed (toggle)"><IconButton label="Pin to overview" icon={<Star />} pressed /></State>
        <State label="Disabled"><IconButton variant="secondary" label="Refresh" icon={<RefreshCw />} disabled /></State>
      </Specimen>
    </>
  );
}
