'use client';

import { Specimen } from '@/system/specimen';
import { Button } from '@/components/ui/button';
import { Banner } from '.';

export default function BannerPreview() {
  return (
    <>
      <Specimen label="Tones" note="Icon, title and tint say the tone together; never colour alone." stack>
        <Banner tone="neutral" title="Usage is reported in UTC">Daily buckets close at midnight UTC, so a day here may differ from your local calendar.</Banner>
        <Banner tone="accent" title="Claude can now answer questions about this dashboard">Ask from Claude Desktop or the web, and approve any change it proposes before it runs.</Banner>
        <Banner tone="positive" title="Incident resolved">Upload failures for files over 50 MB stopped at 14:20 UTC. No data was lost.</Banner>
        <Banner tone="warning" title="Elevated latency in eu-west-1" action={<Button size="sm">View incident</Button>}>p95 is above 900ms for requests routed through eu-west-1. Traffic is shifting to eu-central-1.</Banner>
        <Banner tone="critical" title="Your production key expires in 2 days" action={<Button size="sm" variant="primary">Rotate key</Button>} onDismiss={() => {}}>Requests signed with zzm_live_7Hc2…q91 will fail with 401 after 5 October.</Banner>
      </Specimen>
      <Specimen label="Title only" note="When the title says it all." stack>
        <Banner tone="positive" title="All systems operational" onDismiss={() => {}} />
      </Specimen>
    </>
  );
}
