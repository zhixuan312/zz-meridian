import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ usePathname: () => '/requests/x', useRouter: () => ({ refresh() {}, push, replace() {} }) }));
const toasts = vi.hoisted(() => [] as { tone: string; title: string; description?: string; action?: { label: string; onClick: () => void } }[]);
vi.mock('@/components/ui/toast', () => ({ toast: (t: (typeof toasts)[number]) => { toasts.push(t); } }));

import { RequestView } from '@/views/request';
import { REQUESTS } from '@/system/fixtures/sample';
import { payloadsOf, traceOf } from '@/data/sample';

const failed = REQUESTS.find((r) => r.status >= 500)!;
const view = (replay: (id: string) => Promise<{ ok: true; id: string; status: number } | { ok: false; error: string }>) =>
  render(<RequestView request={failed} trace={traceOf(failed)} payloads={payloadsOf(failed)} now="2026-10-05T09:00:00.000Z" replay={replay} />);

describe('Replay on a failed request', () => {
  it('sends it again and offers the new request', async () => {
    const replay = vi.fn(async () => ({ ok: true as const, id: 'requests_999', status: 200 }));
    view(replay);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Replay' })); });
    expect(replay).toHaveBeenCalledWith(failed.id);
    expect(toasts.at(-1)).toMatchObject({ tone: 'positive', title: 'Replayed: 200 OK' });
    toasts.at(-1)!.action!.onClick();
    expect(push).toHaveBeenCalledWith('/requests/requests_999');
  });
  it('says why when the replay is refused', async () => {
    view(async () => ({ ok: false, error: 'You do not have permission to replay requests.' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Replay' })); });
    expect(toasts.at(-1)).toMatchObject({ tone: 'critical', title: 'Not replayed', description: 'You do not have permission to replay requests.' });
  });
  it('states no API key it does not know', () => {
    view(async () => ({ ok: false, error: 'unused' }));
    expect(screen.queryByText('Production backend')).toBeNull();
  });
});
