import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/members' }));
const action = vi.hoisted(() => ({ result: { ok: true } as { ok: true } | { ok: false; status: 401 } }));
vi.mock('@/data/live-actions', () => ({ refreshCollections: async () => action.result }));
const seen = vi.hoisted(() => ({ refresh: null as null | ((names: string[]) => Promise<void>) }));
vi.mock('@/lib/live', () => ({ LiveProvider: (p: { refresh: (names: string[]) => Promise<void>; children: unknown }) => { seen.refresh = p.refresh; return p.children; } }));

import { ConsoleLive } from '@/views/console-live';

describe('the console live refresh', () => {
  it('reads the route again after a successful refresh', async () => {
    render(<ConsoleLive scope={new Promise(() => {})}>{null}</ConsoleLive>);
    action.result = { ok: true };
    await seen.refresh!(['members']);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
  it('turns a refusal into a 401 error the live client pauses on, without reading the route', async () => {
    router.refresh.mockClear();
    render(<ConsoleLive scope={new Promise(() => {})}>{null}</ConsoleLive>);
    action.result = { ok: false, status: 401 };
    await expect(seen.refresh!(['members'])).rejects.toMatchObject({ status: 401 });
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
