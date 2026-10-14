import { Suspense } from 'react';
import { homeTool } from '@/views/tools';
import { parsePeriod } from '@/lib/period';
import { EmbedHome } from './view';

export const metadata = { title: 'Home' };

type SearchParams = Promise<{ period?: string; day?: string }>;

/**
 * Tool: `zz_meridian_home { period, day? }` (`homeTool` in `src/views/tools.ts`). The route renders from the
 * tool's own read, so what the model is told and what the view shows are one. Inline: the revenue card and its three tiles.
 * Fullscreen: the console's Home rows.
 */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense>
      <Home searchParams={searchParams} />
    </Suspense>
  );
}

async function Home({ searchParams }: { searchParams: SearchParams }) {
  const { period, day } = await searchParams;
  const { data } = await homeTool.read({ period: parsePeriod(period), day: /^\d{4}-\d{2}-\d{2}$/.test(day ?? '') ? day : undefined });
  return <EmbedHome {...data} />;
}
