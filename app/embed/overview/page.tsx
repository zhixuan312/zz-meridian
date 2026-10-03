import { DEMO_NOW, DEMO_UPDATED_AT, demoSeries, demoTotals, ENDPOINTS, STATUS_MIX, ACTIVITY } from '@/system/fixtures/sample';
import { parsePeriod } from '@/lib/period';
import { EmbedOverview } from './view';

export const metadata = { title: 'Overview' };

/** Tool: `zz_meridian_overview { period }`. Inline: three figures and the trend. Fullscreen: the console's Overview rows. */
export default async function Page({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const period = parsePeriod((await searchParams).period);
  return (
    <EmbedOverview
      period={period}
      series={demoSeries(period).current}
      totals={demoTotals(period)}
      endpoints={ENDPOINTS}
      mix={STATUS_MIX}
      activity={ACTIVITY}
      updatedAt={DEMO_UPDATED_AT.toISOString()}
      now={DEMO_NOW.toISOString()}
    />
  );
}
