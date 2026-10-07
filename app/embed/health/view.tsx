'use client';

import { useSurface } from '@/components/base/surface';
import { Banner } from '@/components/ui/banner';
import { Card } from '@/components/ui/card';
import { EmbedFrame } from '@/components/patterns/embed-frame';
import { Freshness } from '@/components/patterns/freshness';
import { AskAbout } from '@/components/patterns/ask-about';
import { StatusList } from '@/components/patterns/status-list';
import { HealthBody, ShareHealth } from '@/views/health';
import { formatRelative } from '@/lib/format-date';
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';

type Props = { services: Service[]; current: Incident | null; past: Incident[]; updatedAt: string; now: string };

export function EmbedHealth(p: Props) {
  const s = useSurface();
  return (
    <EmbedFrame title="Health" meta={<Freshness updatedAt={new Date(p.updatedAt)} now={new Date(p.now)} />} consolePath="/health">
      {s.mode === 'fullscreen' ? (
        <HealthBody {...p} />
      ) : (
        <div className="flex flex-col gap-3">
          <ShareHealth data={p} />
          {p.current ? (
            <Banner
              tone="warning"
              title={p.current.title}
              action={<AskAbout question={`What is the impact of "${p.current.title}" on my traffic?`} />}
            >
              {p.current.state === 'monitoring' ? 'Fix in place, monitoring' : 'Investigating'} · started {formatRelative(p.current.started, new Date(p.now))}
            </Banner>
          ) : null}
          <Card className="overflow-hidden">
            <StatusList services={p.services} end={new Date(p.now)} descriptions={false} />
          </Card>
        </div>
      )}
    </EmbedFrame>
  );
}
