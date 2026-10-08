'use client';

import { SurfaceOverride } from '@/components/base/surface';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Specimen, State } from '@/system/specimen';
import { AskAbout } from '.';

export default function AskAboutPreview() {
  return (
    <>
      <Specimen label="Where an agent listens" note="In an MCP host with an agent connected. One press posts the question into the conversation, as the person.">
        <SurfaceOverride surface={{ kind: 'embed', connected: true, ask: () => {} }}>
          <Card className="w-full max-w-120">
            <CardHeader title="Requests per day" description="Last 7 days" actions={<AskAbout question="Why did requests fall on 27 September?" />} />
            <CardBody><p className="t-small text-ink-2">The chart sits here.</p></CardBody>
          </Card>
        </SurfaceOverride>
      </Specimen>
      <Specimen label="States">
        <SurfaceOverride surface={{ kind: 'embed', connected: true, ask: () => {} }}>
          <State label="Rest"><AskAbout question="What drove the trend in requests?" /></State>
          <State label="Hover"><AskAbout question="What drove the trend in requests?" className="bg-accent-tint" /></State>
          <State label="Focus" still><AskAbout question="What drove the trend in requests?" className="outline-2 outline-offset-2 outline-accent" /></State>
        </SurfaceOverride>
        <State label="Console: nothing is drawn">
          <span className="t-caption inline-flex h-7 items-center rounded-md border border-dashed border-line-strong px-2">(no control)</span>
        </State>
      </Specimen>
    </>
  );
}
