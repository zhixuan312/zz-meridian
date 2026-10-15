// Named cli-* so the payload leaves it out: it is about the sample's own Now page, which a product replaces.
import { renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/engineering',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { verificationOf } from '@/data/verification';
import { ACTIVITY, DEMO_NOW, DEMO_UPDATED_AT, INCIDENTS, MODELS, SERVICES } from '@/system/fixtures/sample';
import { COMPUTE, ENDPOINTS, USAGE } from '@/system/fixtures/company';
import { RELEASES, RUNS, TICKETS } from '@/system/fixtures/sample-engineering';
import { NowBody } from '@/views/now';
import { nowData, type NowReads } from '@/views/now-parts';

const reads: NowReads = {
  services: SERVICES, incidents: INCIDENTS.map(({ owner, ticketId: _, ...i }) => ({ ...i, ...(owner ? { owner } : {}) })),
  releases: RELEASES.map((r) => ({ ...r, verification: verificationOf(r, RUNS) })),
  runs: RUNS.map((r) => ({ ...r, release: null })),
  history: null, usage: USAGE, models: MODELS, compute: COMPUTE, endpoints: ENDPOINTS,
  tickets: TICKETS.map((t) => ({ ...t, assignee: null })),
  activity: ACTIVITY, reader: 'members_1', updatedAt: DEMO_UPDATED_AT.toISOString(), now: DEMO_NOW.toISOString(),
};

describe('Now, when the days cannot be read', () => {
  // The Featured metric of the days inside the band stands first; its unread state is the page's one word on the days,
  // so the band's own part below it does not say it again.
  it('says so once, in the Featured metric\'s place', () => {
    const html = renderToStaticMarkup(<Tooltip.Provider><NowBody {...nowData(reads)} /></Tooltip.Provider>);
    expect(html.match(/The days could not be read/g) ?? []).toHaveLength(1);
  });
});
