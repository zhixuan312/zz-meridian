'use client';

import { Specimen, State } from '@/system/specimen';
import { Button } from '@/components/ui/button';
import { ToastView, toast } from '.';

export default function ToastPreview() {
  return (
    <>
      <Specimen label="Tones" note="Positive confirms, critical reports a failure, neutral informs." stack>
        <div className="flex w-full max-w-95 flex-col gap-2">
          <ToastView tone="positive" title="Key revoked" description="relay_live_7Hc2…q91 no longer signs requests." />
          <ToastView tone="critical" title="Export failed" description="The file was over 50 MB. Narrow the period and try again." />
          <ToastView tone="neutral" title="Copied request ID" />
        </div>
      </Specimen>
      <Specimen label="With Undo" note="An action that can be reversed offers Undo, and stays eight seconds instead of five.">
        <div className="w-full max-w-95">
          <ToastView tone="positive" title="Webhook paused" description="Events queue for up to 72 hours." action={{ label: 'Undo', onClick: () => {} }} onDismiss={() => {}} />
        </div>
      </Specimen>
      <Specimen label="Live">
        <State label="Fires a real toast, bottom right">
          <Button onClick={() => toast({ tone: 'positive', title: 'Key revoked', description: 'relay_live_7Hc2…q91 no longer signs requests.' })}>Revoke key</Button>
        </State>
      </Specimen>
    </>
  );
}
