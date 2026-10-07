import { Suspense } from 'react';
import { healthTool } from '@/views/tools';
import { EmbedHealth } from './view';

export const metadata = { title: 'Health' };

/**
 * Tool: `zz_meridian_health {}` (`healthTool` in `src/views/tools.ts`), rendered from the tool's own read, at request
 * time for whoever is asking. Inline: the status list and the live incident. Fullscreen: the console's Health rows.
 */
export default function Page() {
  return (
    <Suspense>
      <Health />
    </Suspense>
  );
}

async function Health() {
  const { data } = await healthTool.read({});
  return <EmbedHealth {...data} />;
}
