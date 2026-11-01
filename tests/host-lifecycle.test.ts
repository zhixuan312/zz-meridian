import { afterEach, describe, expect, it, vi } from 'vitest';
import { HostBridge } from '@/lib/host';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('host request lifetime', () => {
  it('rejects pending requests on disposal and clears their timers', async () => {
    vi.useFakeTimers();
    const sent = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    const bridge = new HostBridge(window);
    const outcome = bridge.callTool('read', {}).then(() => 'resolved', (error: Error) => error.message);
    bridge.dispose();
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(0);
    expect(await outcome).toMatch(/disposed/i);
    await expect(bridge.request('ui/open-link')).rejects.toThrow(/disposed/i);
    expect(sent).toHaveBeenCalledTimes(1);
  });

  it('stops an initialization retry after the bridge is disposed', async () => {
    vi.useFakeTimers();
    const sent = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    const bridge = new HostBridge(window);
    let outcome: string | undefined;
    void bridge.initialize('sample', '1').then(() => { outcome = 'resolved'; }, (error: Error) => { outcome = error.message; });
    bridge.dispose();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(outcome).toMatch(/disposed/i);
    expect(sent).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('returns a rejected request and leaves no timer when transport posting fails', async () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'postMessage').mockImplementation(() => { throw new Error('post refused'); });
    const bridge = new HostBridge(window);
    try {
      let promise!: Promise<unknown>;
      expect(() => { promise = bridge.request('ui/open-link'); }).not.toThrow();
      await expect(promise).rejects.toThrow('post refused');
      expect(vi.getTimerCount()).toBe(0);
    } finally { bridge.dispose(); }
  });
});
