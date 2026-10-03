'use client';

import { ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { Specimen, Plane } from '@/system/specimen';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardFooter, CardHeader } from '.';

const ROWS = [
  ['POST /v1/messages', '612ms'],
  ['GET /v1/search', '188ms'],
  ['POST /v1/embeddings', '241ms'],
];

export default function CardPreview() {
  return (
    <>
      <Specimen label="Default" note="Header, body and an optional footer. The canvas shows around it." stack>
        <Plane>
          <Card className="max-w-md">
            <CardHeader title="Monthly quota" description="Requests used this billing month" actions={<Button variant="ghost" size="sm" aria-label="More"><MoreHorizontal /></Button>} />
            <CardBody>
              <p className="t-figure t-num">8.2M<span className="unit">of 10M</span></p>
              <p className="t-caption mt-2">Resets on 1 November</p>
            </CardBody>
            <CardFooter>
              <a className="row-link inline-flex items-center gap-1 font-medium text-ink" href="#">Billing <ArrowUpRight className="size-3.5" /></a>
            </CardFooter>
          </Card>
        </Plane>
      </Specimen>
      <Specimen label="Divided" note="A hairline under the head when the body is a list or table that runs edge to edge." stack>
        <Plane>
          <Card className="max-w-md">
            <CardHeader title="Slowest endpoints" description="p95, last 24 hours" divided actions={<Badge tone="warning" dot>1 slow</Badge>} />
            <CardBody flush>
              <ul>
                {ROWS.map(([r, v]) => (
                  <li key={r} className="flex items-center justify-between border-b border-line px-(--card-pad) py-3 text-sm last:border-0">
                    <span className="font-mono text-xs">{r}</span>
                    <span className="t-num font-medium">{v}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Plane>
      </Specimen>
      <Specimen label="Interactive" note="The whole card is one link: the border strengthens and it lifts on hover." stack>
        <Plane className="grid gap-4 sm:grid-cols-2">
          <Card interactive className="p-(--card-pad)">
            <p className="t-caption">Rest</p>
            <p className="t-card mt-1">Northwind Labs</p>
            <p className="t-small mt-0.5 text-ink-2">Enterprise · 642K requests</p>
          </Card>
          <Card interactive className="border-line-strong p-(--card-pad) shadow-raise">
            <p className="t-caption">Hover</p>
            <p className="t-card mt-1">Halcyon Health</p>
            <p className="t-small mt-0.5 text-ink-2">Enterprise · 391K requests</p>
          </Card>
        </Plane>
      </Specimen>
      <Specimen label="Planes" note="Frame, canvas, surface: each step is lighter toward the reader. On dark, a lit top edge replaces the shadow." stack>
        <Plane on="frame" className="p-3">
          <Plane className="p-5">
            <Card className="p-(--card-pad)">
              <p className="t-card">Surface</p>
              <p className="t-small mt-0.5 text-ink-2">On the canvas, on the frame.</p>
            </Card>
          </Plane>
        </Plane>
      </Specimen>
    </>
  );
}
