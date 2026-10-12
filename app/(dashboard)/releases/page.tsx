import { Suspense } from 'react';
import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { Busy } from '@/components/patterns/page-loading';
import { RecordsSkeleton } from '@/components/templates/records';
import { gate } from '@/data/access';
import { readReleases } from '@/data/engineering';
import { ReleasesView } from '@/views/releases';

export const metadata = { title: 'Releases' };

/**
 * The page asks its feature before it reads anything; the rail hiding the route is presentation, this gate is the check.
 * It changes nothing, so the masthead has no state to share and is drawn here, with the view as its body. Every row comes
 * from `readReleases`, the read the assistant's tool also uses, so the tiles, the table and what the assistant is told are the
 * same figures.
 */
export default async function ReleasesPage() {
  const denied = await gate('releases');
  if (denied) return denied;
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Releases"
      description="What is live in each environment, what is ready to go out, and what is still in testing."
    >
      <Suspense
        fallback={
          <Busy name="releases">
            <RecordsSkeleton tiles={3} rows={8} />
          </Busy>
        }
      >
        <ReleaseList />
      </Suspense>
    </PageFrame>
  );
}

async function ReleaseList() {
  const { rows, observedAt } = await readReleases();
  return <ReleasesView rows={rows} now={observedAt} />;
}
