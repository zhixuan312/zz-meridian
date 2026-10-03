import { DEMO_NOW, DEMO_UPDATED_AT, INCIDENTS, SERVICES } from '@/system/fixtures/sample';
import { PAST_INCIDENTS } from '@/system/fixtures/sample-ops';
import { EmbedHealth } from './view';

export const metadata = { title: 'Health' };

/** Tool: `zz_meridian_health {}`. Inline: the status list and the live incident. Fullscreen: the console's Health rows. */
export default function Page() {
  return (
    <EmbedHealth
      services={SERVICES}
      current={INCIDENTS.find((i) => i.state !== 'resolved') ?? null}
      past={PAST_INCIDENTS}
      updatedAt={DEMO_UPDATED_AT.toISOString()}
      now={DEMO_NOW.toISOString()}
    />
  );
}
