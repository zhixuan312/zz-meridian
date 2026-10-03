import { DEMO_NOW, DEMO_UPDATED_AT, INCIDENTS, SERVICES } from '@/system/fixtures/relay';
import { PAST_INCIDENTS } from '@/system/fixtures/relay-ops';
import { EmbedHealth } from './view';

export const metadata = { title: 'Health' };

/** Tool: `relay_health {}`. Inline: the status list and the live incident. Fullscreen: the console's Health rows. */
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
