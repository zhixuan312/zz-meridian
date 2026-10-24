// Named cli-* so the payload leaves it out: it is about the sample's own Now view, which a product replaces.
import { render, waitFor } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/embed/now',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { SurfaceOverride } from '@/components/base/surface';
import { verificationOf } from '@/data/verification';
import { ACTIVITY, DEMO_NOW, DEMO_UPDATED_AT, INCIDENTS, MODELS, SERVICES } from '@/system/fixtures/sample';
import { COMPUTE, ENDPOINTS, USAGE } from '@/system/fixtures/company';
import { RELEASES, RUNS, TICKETS } from '@/system/fixtures/sample-engineering';
import { packNow } from '@/logic/now-context';
import { nowData, type NowReads } from '@/logic/now-parts';
import { EmbedNow } from '../app/embed/now/view';

const reads: NowReads = {
  services: SERVICES, incidents: INCIDENTS.map(({ owner, ticketId: _, ...i }) => ({ ...i, ...(owner ? { owner } : {}) })),
  releases: RELEASES.map((r) => ({ ...r, verification: verificationOf(r, RUNS) })),
  runs: RUNS.map((r) => ({ ...r, release: null })),
  history: null, usage: USAGE, models: MODELS, compute: COMPUTE, endpoints: ENDPOINTS,
  tickets: TICKETS.map((t) => ({ ...t, assignee: null })),
  activity: ACTIVITY, reader: 'members_1', updatedAt: DEMO_UPDATED_AT.toISOString(), now: DEMO_NOW.toISOString(),
};
const NOTHING: NowReads = { ...reads, services: [], incidents: [], history: [], releases: [], runs: [], usage: [], models: [], compute: [], endpoints: [], tickets: [], activity: [] };

/**
 * The inline Now view's text, as the host draws it in a conversation, once it reads `expected`: Now's body and its
 * states are a chunk the view loads when it draws them, so a state other than the list arrives a moment after the frame.
 */
const inline = async (r: NowReads, expected: RegExp) => {
  const { container } = render(
    <Tooltip.Provider><SurfaceOverride surface={{ kind: 'embed', connected: false, mode: 'inline' }}><EmbedNow {...packNow(nowData(r))} /></SurfaceOverride></Tooltip.Provider>,
  );
  await waitFor(() => expect(container.textContent).toMatch(expected));
  return container.textContent ?? '';
};

describe("the inline Now view says what it knows of the services", () => {
  it('says the services could not be read when their read failed, and never that all are operational', async () => {
    const text = await inline({ ...reads, services: null }, /The services could not be read/);
    expect(text).not.toMatch(/All services operational/);
  });

  it('says no service is monitored yet when the services were read and there are none', async () => {
    const text = await inline({ ...reads, services: [] }, /No service is monitored yet/);
    expect(text).not.toMatch(/All services operational/);
  });

  it('says nothing has arrived yet when no part holds a record', async () => {
    const text = await inline(NOTHING, /No services yet/);
    expect(text).not.toMatch(/All services operational/);
  });

  it('draws the services with their summary when they were read', async () => {
    await inline(reads, /1 service degraded/);
  });
});
