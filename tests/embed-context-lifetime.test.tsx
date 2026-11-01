import { act, cleanup, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Surface } from '@/components/base/surface';

const host = vi.hoisted(() => ({ modelContext: vi.fn(), message: vi.fn(async () => {}), requestDisplayMode: vi.fn(), openLink: vi.fn(async () => {}), toast: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ toast: host.toast }));
vi.mock('@/lib/host', () => ({
  HostBridge: class {
    static framed() { return true; }
    onContext() { return () => {}; }
    initialize() { return Promise.resolve(); }
    sizeChanged() {}
    dispose() {}
    modelContext = host.modelContext;
    message = host.message;
    requestDisplayMode = host.requestDisplayMode;
    openLink = host.openLink;
  },
}));
import { EmbedSurface, useSurface } from '@/components/base/surface';
let surface: Surface;
function View() {
  const current = useSurface();
  useEffect(() => { surface = current; }, [current]);
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  host.modelContext.mockReset();
  host.message.mockClear();
  host.requestDisplayMode.mockReset();
  host.openLink.mockReset().mockResolvedValue(undefined);
  host.toast.mockClear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

async function mount() {
  const view = render(<EmbedSurface><View /></EmbedSurface>);
  await act(async () => {});
  return view;
}

describe('model context retry ownership', () => {
  it('opens the console once after a current expansion refusal and reports a failed open without retrying it', async () => {
    await mount();
    host.requestDisplayMode.mockRejectedValue(new Error('fullscreen refused'));
    host.openLink.mockRejectedValueOnce(new Error('open refused'));
    await act(async () => { surface.expand('/requests'); });
    expect(host.openLink).toHaveBeenCalledTimes(1);
    expect(host.openLink).toHaveBeenCalledWith(new URL('/requests', location.origin).href);
    expect(host.toast).toHaveBeenCalledTimes(1);
    expect(host.toast.mock.calls[0][0].description).toBe(new URL('/requests', location.origin).href);
  });
  it('does not fall back through a disposed bridge after an expansion is rejected', async () => {
    const view = await mount();
    const pending = Promise.withResolvers<{ mode: string }>();
    host.requestDisplayMode.mockReturnValue(pending.promise);
    surface.expand('/requests');
    view.unmount();
    await act(async () => { pending.reject(new Error('disposed')); });
    expect(host.openLink).not.toHaveBeenCalled();
    expect(host.toast).not.toHaveBeenCalled();
  });

  it('does not show a refused question toast after its bridge is disposed', async () => {
    const view = await mount();
    const pending = Promise.withResolvers<void>();
    host.message.mockReturnValueOnce(pending.promise);
    surface.ask?.('Why?');
    view.unmount();
    await act(async () => { pending.reject(new Error('disposed')); });
    expect(host.toast).not.toHaveBeenCalled();
  });
  it('does not resend A after B supersedes its refused update', async () => {
    await mount();
    const pending = Promise.withResolvers<void>();
    host.modelContext.mockReturnValueOnce(pending.promise).mockResolvedValue(undefined);
    surface.share('A');
    surface.share('B');
    await act(async () => { pending.reject(new Error('refused')); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(host.modelContext.mock.calls.map(([text]) => text)).toEqual(['A', 'B']);
  });

  it('does not resend a queued A retry after B replaces it', async () => {
    await mount();
    host.modelContext.mockRejectedValueOnce(new Error('refused')).mockResolvedValue(undefined);
    await act(async () => { surface.share('A'); });
    surface.share('B');
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(host.modelContext.mock.calls.map(([text]) => text)).toEqual(['A', 'B']);
  });

  it('does not send a queued retry through a disposed bridge', async () => {
    const view = await mount();
    host.modelContext.mockRejectedValue(new Error('refused'));
    await act(async () => { surface.share('A'); });
    view.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(host.modelContext).toHaveBeenCalledOnce();
  });

  it('still retries the current context once and carries its first line when both attempts fail', async () => {
    await mount();
    host.modelContext.mockRejectedValue(new Error('refused'));
    await act(async () => { surface.share('Current view\nDetails'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    surface.ask?.('Why?');
    expect(host.modelContext).toHaveBeenCalledTimes(2);
    expect(host.message).toHaveBeenCalledWith('Why? (Current view)');
  });
});
