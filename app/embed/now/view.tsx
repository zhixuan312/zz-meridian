'use client';

import { useSurface } from '@/components/base/surface';
import { Banner } from '@/components/ui/banner';
import { Card } from '@/components/ui/card';
import { EmbedFrame } from '@/components/patterns/embed-frame';
import { Freshness } from '@/components/patterns/freshness';
import { AskAbout } from '@/components/patterns/ask-about';
import { StatusList } from '@/components/patterns/status-list';
import { ShareContext } from '@/components/base/use-share-view';
import dynamic from 'next/dynamic';
import { nothingArrived, nowContext, unpackNow, type PackedNowData } from '@/views/now-context';
import { formatRelative } from '@/lib/format-date';

// Now's whole body is the fullscreen view, and the inline one only when nothing has arrived: its charts, tables and
// feed are a chunk of their own, so the inline view a chat shows first downloads the banner and the list alone. In one
// created project the embed's first-load JS was 820 KiB, at the cap, with the body in it.
const NowBody = dynamic(() => import('@/views/now').then((m) => m.NowBody));
const NoServices = dynamic(() => import('@/views/now').then((m) => m.NoServices));

/**
 * Inline, the services and the open incident, the most severe first; fullscreen, and inline when nothing has arrived
 * yet, Now's whole body. With the services unread or none monitored, inline says so where the list would be, and never
 * that every service is operational. The strips arrive packed, as the page's do.
 */
export function EmbedNow(packed: PackedNowData) {
  const s = useSurface();
  const p = unpackNow(packed);
  const lead = p.incidents?.open[0] ?? null;
  return (
    <EmbedFrame title="Now" meta={<Freshness updatedAt={new Date(p.updatedAt)} now={new Date(p.now)} />} consolePath="/engineering">
      {s.mode === 'fullscreen' || nothingArrived(p) ? (
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
          {p.services.length && !p.unread.includes('the services') ? (
            <Card className="overflow-hidden">
              <StatusList services={p.services} end={new Date(p.now)} descriptions={false} />
            </Card>
          ) : <NoServices data={p} />}
        </div>
      )}
    </EmbedFrame>
  );
}
