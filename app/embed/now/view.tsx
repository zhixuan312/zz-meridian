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
import { nowContext, type NowData } from '@/views/now-context';
import { formatRelative } from '@/lib/format-date';

export function EmbedNow(p: NowData) {
  const s = useSurface();
  return (
    <EmbedFrame title="Now" meta={<Freshness updatedAt={new Date(p.updatedAt)} now={new Date(p.now)} />} consolePath="/engineering">
      {s.mode === 'fullscreen' ? (
        <NowBody {...p} />
      ) : (
        <div className="flex flex-col gap-3">
          <ShareContext context={nowContext(p)} />
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
