import { Suspense } from 'react';
import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { Busy } from '@/components/patterns/page-loading';
import { RecordsSkeleton } from '@/components/templates/records';
import { gate, gatedMetadata } from '@/data/access';
import { readRuns } from '@/data/engineering';
import { TestsView } from '@/views/tests';

export function generateMetadata() {
  return gatedMetadata('tests', { title: 'Tests' });
}

/**
 * The page asks its feature before it reads anything; the rail hiding the route is presentation, this gate is the check.
 * It changes nothing, so the masthead has no state to share and is drawn here, with the view as its body. Every row comes
 * from `readRuns`, the read the assistant's tool also uses, so the tiles, the table and what the assistant is told are the
 * same figures.
 */
export default async function TestsPage() {
  const denied = await gate('tests');
  if (denied) return denied;
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Tests"
      description="What ran against each release, what failed and why, and where to look next."
    >
      <Suspense
        fallback={
          <Busy name="tests">
            <RecordsSkeleton tiles={3} rows={8} />
          </Busy>
        }
      >
        <Runs />
      </Suspense>
    </PageFrame>
  );
}

async function Runs() {
  const { rows, observedAt } = await readRuns();
  return <TestsView rows={rows} now={observedAt} />;
}
