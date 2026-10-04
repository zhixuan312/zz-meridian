'use client';

import { Plane, Specimen } from '@/system/specimen';
import { Prose } from '.';

const REVIEW = `# Elevated latency on Inference API

p95 latency for requests routed through **eu-west-1** rose above 900ms at 05:48 UTC. Traffic moved to eu-central-1 at
06:54 and p95 was back under 650ms by 08:24. No request failed; 3,412 were slower than their SLO.

## What happened

A model host in eu-west-1 lost half its GPUs to a firmware update that ran outside the change window. The gateway kept
routing to it because its health check measures liveness, not capacity.

## What we are changing

- [x] Shift traffic when a region's p95 doubles for five minutes, not only when hosts fail
- [x] Pause firmware updates outside the change window
- [ ] Health checks report capacity, so the gateway sees a half-empty host

| Change | Owner | Where |
|---|---|---|
| Capacity-aware health check | Jonas Weber | \`services/gateway/health/capacity_probe.go\` |
| Change-window guard | Amara Okafor | \`infra/fleet/firmware/rollout-policy.yaml\` |

\`\`\`sh
curl https://api.zz-meridian.example/v1/health?region=eu-west-1
\`\`\`

> The status page said "operational" for 66 minutes while p95 was over SLO. It now reads the same p95 we alert on.

See the [runbook](https://runbooks.zz-meridian.example/latency) for the shift itself.`;

const HOSTILE = `A reply pasted from somewhere else:

<script>alert('hi')</script> <b>bold?</b>

[A link that runs script](javascript:alert(1)) and an [ordinary one](https://zz-meridian.example/docs).

![A tracking pixel](https://elsewhere.example/pixel.png)`;

export default function ProsePreview() {
  return (
    <>
      <Specimen label="A document" note="Headings, lists and task boxes, a table with long paths, code and a quote, on Meridian's roles; nothing scrolls sideways." stack>
        <Plane on="surface">
          <div className="p-6"><Prose>{REVIEW}</Prose></div>
        </Plane>
      </Specimen>
      <Specimen label="Content nobody vetted" note="Raw HTML stays text; a javascript: link becomes plain words; an image from another site reads as its alt text instead of being fetched." stack>
        <Plane on="surface">
          <div className="p-6"><Prose size="sm">{HOSTILE}</Prose></div>
        </Plane>
      </Specimen>
      <Specimen label="Narrow" note="At 320px the long paths and the code break anywhere rather than push the card." stack>
        <Plane on="surface">
          <div className="w-80 p-4"><Prose size="sm">{REVIEW.split('## What we are changing')[1]}</Prose></div>
        </Plane>
      </Specimen>
    </>
  );
}
