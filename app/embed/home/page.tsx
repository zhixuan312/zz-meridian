import { Suspense } from 'react';
import { homeTool } from '@/views/tools';
import { PERIOD_LABEL, parsePeriod, type Period } from '@/lib/period';
import { EmbedBusy } from '@/components/patterns/embed-frame';
import { ChartSkeleton, TilesSkeleton } from '@/components/patterns/page-loading';
import { EmbedHome } from './view';

export const metadata = { title: 'Home' };

type SearchParams = Promise<{ period?: string; day?: string }>;

/**
 * Tool: `zz_meridian_home { period, day? }` (`homeTool` in `src/views/tools.ts`). The route renders from the
 * tool's own read, so what the model is told and what the view shows are one. Inline: the revenue card and its three tiles.
 * Fullscreen: the console's Home rows.
 *
 * The period is read from the address before the read runs, so the host is framed at once: a host that framed a bare
 * `<Suspense>` would show an empty rectangle for as long as the read took.
 */
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const period = parsePeriod((await searchParams).period);
  return (
    <Suspense fallback={<Busy period={period} />}>
      <Home searchParams={searchParams} />
    </Suspense>
  );
}

/** The frame the host sees while the read runs: this view's title, and a body of the shape the read will fill. */
function Busy({ period }: { period: Period }) {
  return (
    <EmbedBusy title={`Home · ${PERIOD_LABEL[period]}`} consolePath={`/?period=${period}`} name="Home">
      <ChartSkeleton height="h-40" />
      <TilesSkeleton count={3} />
    </EmbedBusy>
  );
}

async function Home({ searchParams }: { searchParams: SearchParams }) {
  const { period, day } = await searchParams;
  const { data } = await homeTool.read({ period: parsePeriod(period), day: /^\d{4}-\d{2}-\d{2}$/.test(day ?? '') ? day : undefined });
  return <EmbedHome {...data} />;
}
