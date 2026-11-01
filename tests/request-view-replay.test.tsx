import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/requests/x', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
vi.mock('@/components/ui/toast', () => ({ toast() {} }));

import { RequestView } from '@/views/request';
import { REQUESTS } from '@/system/fixtures/sample';
import { payloadsOf, traceOf } from '@/data/sample';

const failed = REQUESTS.find((r) => r.status >= 500)!;
const view = (replay: (id: string) => Promise<{ ok: true; id: string; status: number } | { ok: false; error: string }>) =>
  render(<RequestView routeP95={612} request={failed} trace={traceOf(failed)} payloads={payloadsOf(failed)} now="2026-10-05T09:00:00.000Z" replay={replay} />);

describe('Replay on a failed request', () => {
  it('releases pending Replay after a transport failure without replacing the page', async () => {
    const work = Promise.withResolvers<never>();
    view(() => work.promise);
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Replay' })).toHaveAttribute('aria-busy', 'true'));
    await act(async () => { work.reject(new Error('Failed to fetch')); });
    expect(screen.getByRole('button', { name: 'Replay' })).not.toHaveAttribute('aria-busy', 'true');
  });
});

describe('captured request body presence', () => {
  it('keeps an empty captured body copyable, distinct from no captured body', () => {
    const props = { routeP95: 612, request: failed, trace: traceOf(failed), now: '2026-10-05T09:00:00.000Z', replay: async () => ({ ok: false as const, error: 'Not replayed in this case' }) };
    const { rerender } = render(<RequestView {...props} payloads={{ request: '', response: '{}' }} />);
    expect(screen.getAllByRole('button', { name: 'Copy' })).toHaveLength(2);
    rerender(<RequestView {...props} payloads={{ request: null, response: '{}' }} />);
    expect(screen.getAllByRole('button', { name: 'Copy' })).toHaveLength(1);
  });
});
