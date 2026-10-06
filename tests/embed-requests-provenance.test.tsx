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
import { REQUESTS } from '@/system/fixtures/sample';

const { state } = requestsQuery({ status: '5xx' });
const view = () => (
  <SurfaceOverride surface={{ mode: 'fullscreen' }}>
    <EmbedRequests rows={REQUESTS.slice(0, 10)} total={REQUESTS.length} state={state} pageSize={10} now="2026-10-05T09:00:00.000Z" />
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
        <EmbedRequests rows={REQUESTS.slice(0, 10)} total={25} state={state} pageSize={10} now="2026-10-05T09:00:00.000Z" />
      </SurfaceOverride>,
    );
    expect(container.textContent).toMatch(/1\D+10\D+of\D+25/);
  });
});
