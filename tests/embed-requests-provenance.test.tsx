import { fireEvent, render, screen } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

const url = vi.hoisted(() => ({ search: '?status=5xx' }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/embed/requests',
  useSearchParams: () => new URLSearchParams(url.search),
  useRouter: () => ({ replace: (to: string) => { url.search = to.includes('?') ? to.slice(to.indexOf('?')) : ''; }, push() {}, refresh() {} }),
}));

import { SurfaceOverride } from '@/components/base/surface';
import { EmbedRequests } from '../app/embed/requests/view';
import { requestsQuery } from '@/data/requests';
import type { RequestsData } from '@/logic/requests-context';
import { REQUESTS } from '@/system/fixtures/sample';

const { state } = requestsQuery({ status: '5xx' });
const summary: RequestsData['summary'] = { count: 0, errorShare: 0, p95: 0, buckets: { count: [], errors: [], p95: [] }, deltas: { count: null, errors: null, p95: null }, halves: { before: 0, after: 0 }, span: null, common: { all: { count: 0, route: null, customer: null, region: null }, errors: { count: 0, route: null, customer: null, region: null } }, rows: 0, partial: false };
const view = () => (
  <SurfaceOverride surface={{ mode: 'fullscreen' }}>
    <EmbedRequests rows={REQUESTS.slice(0, 10)} total={REQUESTS.length} state={state} summary={summary} pageSize={10} updatedAt="2026-10-05T08:56:00.000Z" now="2026-10-05T09:00:00.000Z" />
  </SurfaceOverride>
);

describe('the embed requests view, provenance', () => {
  it('says the tool set the filters until a person changes one, then stops saying it', () => {
    const { rerender } = render(view());
    expect(screen.getByText('Set by Claude')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: /clear/i })[0]);
    rerender(view());
    expect(screen.queryByText('Set by Claude')).toBeNull();
  });
  it('pages by the size the server read, not the table default', () => {
    const { container } = render(
      <SurfaceOverride surface={{ mode: 'fullscreen' }}>
        <EmbedRequests rows={REQUESTS.slice(0, 10)} total={25} state={state} summary={summary} pageSize={10} updatedAt="2026-10-05T08:56:00.000Z" now="2026-10-05T09:00:00.000Z" />
      </SurfaceOverride>,
    );
    expect(container.textContent).toMatch(/1\D+10\D+of\D+25/);
  });
});

// The inline Ask asked why the requests were failing whatever the tool asked for: over the latest requests, most of
// them 2xx, and over status 2xx too. It asks what the console's Ask asks of the same rows.
describe("the embed requests view's inline Ask", () => {
  const asked = (filter: Parameters<typeof requestsQuery>[0]) => {
    render(
      <Tooltip.Provider>
        <SurfaceOverride surface={{ mode: 'inline', ask: () => {} }}>
          <EmbedRequests rows={REQUESTS.slice(0, 10)} total={REQUESTS.length} state={requestsQuery(filter).state} summary={summary} pageSize={10} updatedAt="2026-10-05T08:56:00.000Z" now="2026-10-05T09:00:00.000Z" />
        </SurfaceOverride>
      </Tooltip.Provider>,
    );
    return screen.getByRole('button', { name: /^Ask: / }).getAttribute('aria-label');
  };
  it('asks what stands out when nothing is filtered', () => expect(asked({})).toBe('Ask: What stands out in the latest requests, and why?'));
  it('asks what the filtered requests have in common, not why they fail', () => {
    const q = asked({ status: '2xx' });
    expect(q).toMatch(/^Ask: What do these requests with .*2xx.* have in common, and why\?$/);
  });
});
