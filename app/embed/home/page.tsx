import { Suspense } from 'react';
import { homeTool } from '@/views/tools';
import { parsePeriod } from '@/lib/period';
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
 * The period stays in the address and is read by the view below, inside its boundary: a page that awaited it here would
 * wait for the request, and this route no longer prerenders. The fallback therefore names the view and not its period,
 * as Requests' names the view and not its filters, and both gain theirs with the read.
 */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Busy />}>
      <Home searchParams={searchParams} />
    </Suspense>
  );
}

/** The frame the host sees while the read runs: this view's title, and a body of the shape the read will fill. */
function Busy() {
  return (
    <EmbedBusy title="Home" consolePath="/" name="Home">
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
