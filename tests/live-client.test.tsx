import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveProvider, createLiveClient, useLive, type LiveState } from '@/lib/live';

class FakeSource {
  static all: FakeSource[] = [];
  url: string;
  closed = false;
  onopen: ((e: Event) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  private on = new Map<string, ((e: MessageEvent) => void)[]>();
  constructor(url: string) { this.url = url; FakeSource.all.push(this); }
  addEventListener(type: string, f: (e: MessageEvent) => void) { this.on.set(type, [...(this.on.get(type) ?? []), f]); }
  removeEventListener(type: string, f: (e: MessageEvent) => void) { this.on.set(type, (this.on.get(type) ?? []).filter((g) => g !== f)); }
  close() { this.closed = true; }
  open() { this.onopen?.(new Event('open')); for (const f of this.on.get('open') ?? []) f(new MessageEvent('open')); }
  fail() { this.onerror?.(new Event('error')); for (const f of this.on.get('error') ?? []) f(new MessageEvent('error')); }
  send(type: string, data: unknown) { for (const f of this.on.get(type) ?? []) f(new MessageEvent(type, { data: JSON.stringify(data) })); }
  names() { return new URL(this.url, 'http://localhost').searchParams.get('collections')?.split(',').sort() ?? []; }
}
const live = () => FakeSource.all.filter((s) => !s.closed);
const flush = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

beforeEach(() => { vi.useFakeTimers(); FakeSource.all = []; vi.stubGlobal('EventSource', FakeSource); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function client(refresh: (names: string[]) => Promise<void>, pollMs = 60_000) {
  const states: LiveState[] = [];
  const c = createLiveClient({ refresh, pollMs, EventSource: FakeSource as unknown as typeof EventSource, onState: (s: LiveState) => states.push(s) });
  return { c, states };
}

describe('the live client', () => {
  it('is live only after the first resync succeeds, and coalesces a short burst into one refresh', async () => {
    const refresh = vi.fn(async () => {});
    const { c, states } = client(refresh);
    c.setNames(['members']);
    expect(states.at(-1)).toBe('connecting');
    live()[0].open();
    await flush(600);
    expect(states.at(-1)).toBe('live');
    refresh.mockClear();
    for (let i = 0; i < 5; i++) { live()[0].send('change', { collection: 'members' }); await flush(50); }
    await flush(600);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith(['members']);
    c.dispose();
  });
  it('does not starve under a sustained burst: a refresh at least every 500 ms', async () => {
    const refresh = vi.fn(async () => {});
    const { c } = client(refresh);
    c.setNames(['members']);
    live()[0].open();
    await flush(600);
    refresh.mockClear();
    for (let i = 0; i < 20; i++) { live()[0].send('change', { collection: 'members' }); await flush(100); }
    expect(refresh.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(refresh.mock.calls.length).toBeLessThanOrEqual(6);
    c.dispose();
  });
  it('runs one refresh at a time and keeps what arrived meanwhile for the next', async () => {
    let release!: () => void;
    const refresh = vi.fn(() => new Promise<void>((r) => { release = r; }));
    const { c } = client(refresh);
    c.setNames(['keys', 'members']);
    live()[0].open();
    await flush(100);
    const calls = refresh.mock.calls.length;
    live()[0].send('change', { collection: 'members' });
    live()[0].send('change', { collection: 'keys' });
    await flush(600);
    expect(refresh.mock.calls.length).toBe(calls);
    await act(async () => { release(); });
    await flush(600);
    expect(refresh.mock.calls.length).toBe(calls + 1);
    c.dispose();
  });
  it('abandons a refresh slower than 10 s, so the next one still runs', async () => {
    const refresh = vi.fn(() => new Promise<void>(() => {}));
    const { c, states } = client(refresh, 20_000);
    c.setNames(['members']);
    live()[0].open();
    await flush(10_600);
    expect(states.at(-1)).toBe('stale');
    const calls = refresh.mock.calls.length;
    await flush(20_000);
    expect(refresh.mock.calls.length).toBeGreaterThan(calls);
    c.dispose();
  });
  it('refreshes on a schedule even while the stream looks healthy', async () => {
    const refresh = vi.fn(async () => {});
    const { c } = client(refresh, 1000);
    c.setNames(['members']);
    live()[0].open();
    await flush(600);
    refresh.mockClear();
    await flush(3100);
    expect(refresh.mock.calls.length).toBeGreaterThanOrEqual(3);
    c.dispose();
  });
  it('reconnects after 1 s, polls after the third failure, and tries the stream again on every fifth poll', async () => {
    const refresh = vi.fn(async () => {});
    const { c, states } = client(refresh, 1000);
    c.setNames(['members']);
    live().at(-1)!.fail();
    await flush(1100);
    expect(FakeSource.all).toHaveLength(2);
    live().at(-1)!.fail();
    await flush(1100);
    live().at(-1)!.fail();
    expect(states.at(-1)).toBe('polling');
    const opened = FakeSource.all.length;
    await flush(4500);
    expect(FakeSource.all.length).toBe(opened);
    await flush(1000);
    expect(FakeSource.all.length).toBe(opened + 1);
    c.dispose();
  });
  it('pauses on an authorization failure and goes stale on any other', async () => {
    const denied = client(async () => { throw Object.assign(new Error('no'), { status: 403 }); });
    denied.c.setNames(['members']);
    live()[0].open();
    await flush(600);
    expect(denied.states.at(-1)).toBe('paused');
    denied.c.dispose();
    const down = client(async () => { throw new Error('network'); });
    down.c.setNames(['members']);
    live().at(-1)!.open();
    await flush(600);
    expect(down.states.at(-1)).toBe('stale');
    down.c.dispose();
  });
  it('closes while hidden, resyncs on return, and ignores a disposed generation', async () => {
    const refresh = vi.fn(async () => {});
    const { c } = client(refresh);
    c.setNames(['members']);
    const first = live()[0];
    first.open();
    await flush(600);
    c.setVisible(false);
    expect(first.closed).toBe(true);
    refresh.mockClear();
    c.setVisible(true);
    live()[0].open();
    await flush(600);
    expect(refresh).toHaveBeenCalled();
    c.dispose();
    refresh.mockClear();
    first.send('change', { collection: 'members' });
    await flush(600);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('LiveProvider', () => {
  function Uses({ names }: { names: string[] }) { useLive(names); return null; }
  it('shares one stream across hooks, for the union of their names', async () => {
    render(<LiveProvider refresh={async () => {}} scopeKey="demo/owner"><Uses names={['members']} /><Uses names={['keys']} /></LiveProvider>);
    await flush(0);
    expect(live()).toHaveLength(1);
    expect(live()[0].names()).toEqual(['keys', 'members']);
  });
  it('opens nothing without a scope key, and replaces the stream when the key changes', async () => {
    const refresh = vi.fn(async () => {});
    const view = render(<LiveProvider refresh={refresh} scopeKey=""><Uses names={['members']} /></LiveProvider>);
    await flush(0);
    expect(FakeSource.all).toHaveLength(0);
    view.rerender(<LiveProvider refresh={refresh} scopeKey="demo/owner"><Uses names={['members']} /></LiveProvider>);
    await flush(0);
    const first = live()[0];
    view.rerender(<LiveProvider refresh={refresh} scopeKey="demo/another"><Uses names={['members']} /></LiveProvider>);
    await flush(0);
    expect(first.closed).toBe(true);
    expect(live()).toHaveLength(1);
    refresh.mockClear();
    first.send('change', { collection: 'members' });
    await flush(600);
    expect(refresh).not.toHaveBeenCalled();
  });
});
