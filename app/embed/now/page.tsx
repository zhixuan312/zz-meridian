import { Suspense } from 'react';
import { packNow } from '@/logic/now-context';
import { nowTool } from '@/logic/tools';
import { EmbedBusy, EmbedFailed } from '@/components/patterns/embed-frame';
import { EmbedNow } from './view';

export const metadata = { title: 'Now' };

/**
 * Tool: `zz_meridian_now {}` (`nowTool` in `src/logic/tools.ts`), rendered from the tool's own read, at request time
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
    <EmbedBusy title="Now" consolePath="/engineering" name="Now" blocks={['tiles', 'table']} />
  );
}

async function Now() {
  // A read that threw is this view's own failure, drawn in the frame. The segment's error boundary is the last net
  // under it, and imports nothing, because anything a boundary imports lands in every embed's first load.
  const read = await nowTool.read({}).catch(() => null);
  return read ? <EmbedNow {...packNow(read.data)} /> : <EmbedFailed title="Now" consolePath="/engineering" name="Now" />;
}
