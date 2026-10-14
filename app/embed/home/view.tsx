'use client';

import { Row, Stack } from '@/components/base/shell';
import { useSurface } from '@/components/base/surface';
import { Meridian } from '@/components/charts/meridian';
import { EmbedFrame } from '@/components/patterns/embed-frame';
import { Freshness } from '@/components/patterns/freshness';
import { HomeBody, RevenueCard, ShareHome, companyTiles, isEmpty, meridianDates } from '@/views/home';
import type { HomeData } from '@/views/home-context';
import { PERIOD_LABEL } from '@/lib/period';

/** Inline: the revenue card and the three tiles beside it. Fullscreen: the console's Home, its nine parts. Both share the same context. */
export function EmbedHome(p: HomeData) {
  const s = useSurface();
  return (
    <EmbedFrame
      title={`Home · ${PERIOD_LABEL[p.period]}`}
      meta={<Freshness updatedAt={new Date(p.updatedAt)} now={new Date(p.now)} />}
      consolePath={`/?period=${p.period}`}
    >
      {s.mode === 'fullscreen' || isEmpty(p) ? <HomeBody {...p} /> : <Inline {...p} />}
    </EmbedFrame>
  );
}

/** The page's leading part, as narrow as a reply: the revenue card, then its three tiles, one column under 48rem. */
function Inline(p: HomeData) {
  const dates = meridianDates(p);
  return (
    <Meridian dates={dates} day={p.day}>
      <ShareHome data={p} />
      <Stack className="gap-3">
        <RevenueCard data={p} dates={dates} />
        <Row split="tiles" className="gap-3">
          {companyTiles(p)}
        </Row>
      </Stack>
    </Meridian>
  );
}
