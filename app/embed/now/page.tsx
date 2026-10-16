import { Suspense } from 'react';
import { packNow } from '@/views/now-context';
import { nowTool } from '@/views/tools';
import { EmbedBusy } from '@/components/patterns/embed-frame';
import { TableSkeleton, TilesSkeleton } from '@/components/patterns/page-loading';
import { EmbedNow } from './view';

export const metadata = { title: 'Now' };

/**
 * Tool: `zz_meridian_now {}` (`nowTool` in `src/views/tools.ts`), rendered from the tool's own read, at request time
 * for whoever is asking. Inline: the status list and the open incident. Fullscreen: the Now page's body.
 *
 * `Now` takes no argument, so its frame is the same whatever the host asks for: the host is framed at once rather than
 * shown an empty rectangle while the read runs.
 */
export default function Page() {
  return (
    <Suspense fallback={<Busy />}>
      <Now />
    </Suspense>
  );
}

/** The frame the host sees while the read runs: this view's title, and a body of the shape the read will fill. */
function Busy() {
  return (
    <EmbedBusy title="Now" consolePath="/engineering" name="Now">
      <TilesSkeleton count={3} />
      <TableSkeleton rows={4} filters={false} />
    </EmbedBusy>
  );
}

async function Now() {
  const { data } = await nowTool.read({});
  return <EmbedNow {...packNow(data)} />;
}
