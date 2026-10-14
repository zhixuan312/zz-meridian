import { Suspense } from 'react';
import { packNow } from '@/views/now-context';
import { nowTool } from '@/views/tools';
import { EmbedNow } from './view';

export const metadata = { title: 'Now' };

/**
 * Tool: `zz_meridian_now {}` (`nowTool` in `src/views/tools.ts`), rendered from the tool's own read, at request time
 * for whoever is asking. Inline: the status list and the open incident. Fullscreen: the Now page's body.
 */
export default function Page() {
  return (
    <Suspense>
      <Now />
    </Suspense>
  );
}

async function Now() {
  const { data } = await nowTool.read({});
  return <EmbedNow {...packNow(data)} />;
}
