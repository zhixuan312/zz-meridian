'use client';

import { useSurface } from '@/components/base/surface';
import { Banner } from '@/components/ui/banner';
import { Card } from '@/components/ui/card';
import { EmbedFrame } from '@/components/patterns/embed-frame';
import { Freshness } from '@/components/patterns/freshness';
import { AskAbout } from '@/components/patterns/ask-about';
import { StatusList } from '@/components/patterns/status-list';
import { ShareContext } from '@/components/base/use-share-view';
import { NowBody } from '@/views/now';
import { nowContext, unpackNow, type PackedNowData } from '@/views/now-context';
import { formatRelative } from '@/lib/format-date';

/** Inline, the services and the open incident, the most severe first; fullscreen, Now's whole body. The strips arrive packed, as the page's do. */
export function EmbedNow(packed: PackedNowData) {
  const s = useSurface();
  const p = unpackNow(packed);
  const lead = p.incidents?.open[0] ?? null;
  return (
    <EmbedFrame title="Now" meta={<Freshness updatedAt={new Date(p.updatedAt)} now={new Date(p.now)} />} consolePath="/engineering">
      {s.mode === 'fullscreen' ? (
        <NowBody {...p} />
      ) : (
        <div className="flex flex-col gap-3">
          <ShareContext context={nowContext(p)} />
          {lead ? (
            <Banner
              tone="warning"
              title={lead.title}
              action={<AskAbout question={`What is the impact of "${lead.title}" on my traffic?`} />}
            >
              {lead.state === 'monitoring' ? 'Fix in place, monitoring' : 'Investigating'} · started {formatRelative(lead.started, new Date(p.now))}
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
