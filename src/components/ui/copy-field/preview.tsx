'use client';

import { Specimen, State } from '@/system/specimen';
import { CopyField } from '.';
import { domain } from '@/app.config';

export default function CopyFieldPreview() {
  return (
    <>
      <Specimen label="Value" note="Copy turns into a check for 1.6s." stack>
        <CopyField label="Endpoint" value={`https://api.${domain}/v1/messages`} className="max-w-md" />
      </Specimen>
      <Specimen label="Secret" note="Masked until Reveal; Copy always copies the real value." stack>
        <State label="Masked" className="w-full max-w-md"><CopyField label="API key" value="zzm_live_7Hq2v9KxP4mN8sT1wZ6bC3dF" secret className="w-full" /></State>
      </Specimen>
    </>
  );
}
