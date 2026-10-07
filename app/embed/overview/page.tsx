import { Suspense } from 'react';
import { overviewTool } from '@/views/tools';
import { parsePeriod } from '@/lib/period';
import { EmbedOverview } from './view';

export const metadata = { title: 'Overview' };

type SearchParams = Promise<{ period?: string; day?: string }>;

/**
 * Tool: `zz_meridian_overview { period, day? }` (`overviewTool` in `src/views/tools.ts`). The route renders from the
 * tool's own read, so what the model is told and what the view shows are one. Inline: three figures and the trend.
 * Fullscreen: the console's Overview rows.
 */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense>
      <Overview searchParams={searchParams} />
    </Suspense>
  );
}

async function Overview({ searchParams }: { searchParams: SearchParams }) {
  const { period, day } = await searchParams;
  const { data } = await overviewTool.read({ period: parsePeriod(period), day: /^\d{4}-\d{2}-\d{2}$/.test(day ?? '') ? day : undefined });
  return <EmbedOverview {...data} />;
}
