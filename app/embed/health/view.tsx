'use client';

import { useSurface } from '@/components/base/surface';
import { useShareView } from '@/components/base/use-share-view';
import { Banner } from '@/components/ui/banner';
import { Card } from '@/components/ui/card';
import { EmbedFrame } from '@/components/patterns/embed-frame';
import { Freshness } from '@/components/patterns/freshness';
import { AskAbout } from '@/components/patterns/ask-about';
import { StatusList, summarise } from '@/components/patterns/status-list';
import { HealthBody } from '@/views/health';
import { formatRelative } from '@/lib/format-date';
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';
import { app } from '@/app.config';

type Props = { services: Service[]; current: Incident | null; past: Incident[]; updatedAt: string; now: string };

export function EmbedHealth(p: Props) {
  const s = useSurface();
  const sum = summarise(p.services);
  const affected = p.services.filter((x) => x.status !== 'operational');
  useShareView(
    `${app.name} health: ${sum.text}${affected.length ? ` (${affected.map((x) => `${x.name} ${x.status}`).join(', ')})` : ''}.${p.current ? ` Open incident: ${p.current.title}, ${p.current.state}.` : ''}`,
    { view: 'health', state: sum.status, affected: affected.map((x) => x.name), incident: p.current?.id ?? null },
  );
  return (
    <EmbedFrame title="Health" meta={<Freshness updatedAt={new Date(p.updatedAt)} now={new Date(p.now)} />} consolePath="/health">
      {s.mode === 'fullscreen' ? (
        <HealthBody services={p.services} current={p.current} past={p.past} now={p.now} />
      ) : (
        <div className="flex flex-col gap-3">
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
