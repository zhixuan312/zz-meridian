import { fireEvent, render, screen } from '@testing-library/react';
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
import type { RequestsData } from '@/views/requests-context';
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
