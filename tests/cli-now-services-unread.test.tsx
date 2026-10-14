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
import { ACTIVITY, DEMO_NOW, DEMO_UPDATED_AT, INCIDENTS, MODELS } from '@/system/fixtures/sample';
import { COMPUTE, ENDPOINTS, USAGE, demoSeries } from '@/system/fixtures/company';
import { RELEASES, RUNS, TICKETS } from '@/system/fixtures/sample-engineering';
import { NowBody } from '@/views/now';
import { nowData, type NowReads } from '@/views/now-parts';

const reads: NowReads = {
  // As a page is handed them: the record without the id of its ticket, an owner only when there is one.
  services: null, incidents: INCIDENTS.map(({ owner, ticketId: _, ...i }) => ({ ...i, ...(owner ? { owner } : {}) })),
  releases: RELEASES.map((r) => ({ ...r, verification: verificationOf(r, RUNS) })),
  runs: RUNS.map((r) => ({ ...r, release: null })),
  history: demoSeries('all').current, usage: USAGE, models: MODELS, compute: COMPUTE, endpoints: ENDPOINTS,
  tickets: TICKETS.map((t) => ({ ...t, assignee: null })),
  activity: ACTIVITY, reader: 'members_1', updatedAt: DEMO_UPDATED_AT.toISOString(), now: DEMO_NOW.toISOString(),
};

describe('Now, when the services cannot be read', () => {
  it('says so in "Services, now", and does not say that no service is monitored', () => {
    const html = renderToStaticMarkup(<Tooltip.Provider><NowBody {...nowData(reads)} /></Tooltip.Provider>);
    expect(html).toContain('The services could not be read');
    expect(html).not.toContain('No service is monitored yet');
  });
});
