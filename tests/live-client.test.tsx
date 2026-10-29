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
  since() { return new URL(this.url, 'http://localhost').searchParams.get('since'); }
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
  // The stream's first frame is always a resync (src/data/live-stream.ts), and the open has just asked for that very
  // read. Answering both read every collection twice on every open: measured on a built app, a cold load of `/` made
  // two refresh actions and two router reads of the page, and the second read sent every rail prefetch out again.
  it('reads once when a stream opens, and again for a resync the stream sends later', async () => {
    const refresh = vi.fn(async () => {});
    const { c, states } = client(refresh);
    c.setNames(['members']);
    live()[0].open();
    live()[0].send('resync', { collections: ['members'] });
    await flush(600);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toBe('live');
    // Later, it is the server saying hints were lost, which nothing else has answered.
    live()[0].send('resync', { collections: ['members'] });
    await flush(600);
    expect(refresh).toHaveBeenCalledTimes(2);
    c.dispose();
  });
  it('reads again for a resync that follows a hint, and treats every new stream\'s first frame alike', async () => {
    const refresh = vi.fn(async () => {});
    const { c } = client(refresh);
    c.setNames(['members']);
    live()[0].open();
    await flush(600);
    refresh.mockClear();
    // No greeting on this stream: its first frame is a hint, so the resync after it is news.
    live()[0].send('change', { collection: 'members' });
    await flush(600);
    live()[0].send('resync', { collections: ['members'] });
    await flush(600);
    expect(refresh).toHaveBeenCalledTimes(2);
    // A stream that replaces it greets again, and its open is again the one read.
    refresh.mockClear();
    live()[0].fail();
    await flush(1100);
    live().at(-1)!.open();
    live().at(-1)!.send('resync', { collections: ['members'] });
    await flush(600);
    expect(refresh).toHaveBeenCalledTimes(1);
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
  it('tries the stream at once when a poll answers after one that did not, as a restarted server does', async () => {
    let down = false;
    const refresh = vi.fn(async () => { if (down) throw new Error('network'); });
    const { c, states } = client(refresh, 1000);
    c.setNames(['members']);
    for (let i = 0; i < 3; i++) { live().at(-1)!.fail(); await flush(1100); }
    expect(states.at(-1)).toBe('polling');
    down = true;
    await flush(1000);
    const opened = FakeSource.all.length;
    down = false;
    await flush(1000);
    // The poll that answered opened a stream; without the rule the next try would wait for the fifth poll.
    expect(FakeSource.all.length).toBe(opened + 1);
    live().at(-1)!.open();
    await flush(600);
    expect(states.at(-1)).toBe('live');
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

describe('the observation time', () => {
  it('moves only when a refresh succeeds: a failed refresh and a quiet stream leave it where it was', async () => {
    let observed = 'T0';
    let fail = false;
    const refresh = vi.fn(async () => { if (fail) throw new Error('network'); observed = `T${refresh.mock.calls.length}`; });
    const { c, states } = client(refresh, 1_000_000);
    c.setNames(['members']);
    live()[0].open();
    await flush(600);
    expect(states.at(-1)).toBe('live');
    const settled = observed;
    expect(settled).not.toBe('T0');
    await flush(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(observed).toBe(settled);
    fail = true;
    live()[0].send('change', { collection: 'members' });
    await flush(600);
    expect(states.at(-1)).toBe('stale');
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(observed).toBe(settled);
    c.dispose();
  });
});

describe('a first open with the revisions the page was served', () => {
  const served = () => ({ members: 'boot1:4' });
  function opened(refresh: (names: string[]) => Promise<void>, since: () => Record<string, string> | undefined = served) {
    const states: LiveState[] = [];
    const c = createLiveClient({ refresh, since, pollMs: 60_000, EventSource: FakeSource as unknown as typeof EventSource, onState: (s: LiveState) => states.push(s) });
    return { c, states };
  }
  it('sends them as since, and a synced greeting is live with no read', async () => {
    const refresh = vi.fn(async () => {});
    const { c, states } = opened(refresh);
    c.setNames(['members']);
    expect(live()[0].since()).toBe('members:boot1:4');
    live()[0].open();
    live()[0].send('synced', {});
    await flush(600);
    expect(refresh).not.toHaveBeenCalled();
    expect(states.at(-1)).toBe('live');
    c.dispose();
  });
  it('reads once, and only what the greeting names, when it is a resync', async () => {
    const refresh = vi.fn(async () => {});
    const { c, states } = opened(refresh, () => ({ members: 'boot1:4', keys: 'boot1:2' }));
    c.setNames(['keys', 'members']);
    live()[0].open();
    live()[0].send('resync', { collections: ['members'] });
    await flush(600);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith(['members']);
    expect(states.at(-1)).toBe('live');
    // A later resync is lost hints, read as ever.
    live()[0].send('resync', { collections: ['keys', 'members'] });
    await flush(600);
    expect(refresh).toHaveBeenCalledTimes(2);
    c.dispose();
  });
  it('refreshes on a resync when the page was served no revisions', async () => {
    const refresh = vi.fn(async () => {});
    const { c, states } = opened(refresh, () => undefined);
    c.setNames(['members']);
    expect(live()[0].since()).toBeNull();
    live()[0].open();
    live()[0].send('resync', { collections: ['members'] });
    await flush(600);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toBe('live');
    c.dispose();
  });
  it('is sent again by an open for new names, as a client navigation makes one (#54)', async () => {
    const refresh = vi.fn(async () => {});
    let held: Record<string, string> = { members: 'boot1:4' };
    const { c, states } = opened(refresh, () => held);
    c.setNames(['members']);
    live()[0].open();
    live()[0].send('synced', {});
    await flush(600);
    held = { keys: 'boot1:2' };
    c.setNames(['keys']);
    expect(live()).toHaveLength(1);
    expect(live()[0].since()).toBe('keys:boot1:2');
    live()[0].open();
    live()[0].send('synced', {});
    await flush(600);
    expect(refresh).not.toHaveBeenCalled();
    expect(states.at(-1)).toBe('live');
    c.dispose();
  });
  it('is not sent by a reopen after a gap: a reconnect sends none and reads', async () => {
    const refresh = vi.fn(async () => {});
    const { c } = opened(refresh);
    c.setNames(['members']);
    live()[0].open();
    live()[0].send('synced', {});
    await flush(600);
    live()[0].fail();
    await flush(1100);
    expect(live()).toHaveLength(1);
    expect(live()[0].since()).toBeNull();
    live()[0].open();
    live()[0].send('resync', { collections: ['members'] });
    await flush(600);
    expect(refresh).toHaveBeenCalledTimes(1);
    c.dispose();
  });
  it('is sent by the provider as the oldest revision of one boot, and left out where boots differ', async () => {
    function Shows({ names, since }: { names: string[]; since: Record<string, string> }) { useLive(names, since); return null; }
    render(
      <LiveProvider refresh={async () => {}} scopeKey="demo/owner">
        <Shows names={['members', 'keys']} since={{ members: 'b1:7', keys: 'b1:3' }} />
        <Shows names={['members', 'keys']} since={{ members: 'b1:5', keys: 'b2:3' }} />
      </LiveProvider>,
    );
    await flush(0);
    expect(live()[0].since()).toBe('members:b1:5');
  });
  it('is sent by the provider for the page a client navigation mounts, which then reads nothing', async () => {
    function Shows({ names, since }: { names: string[]; since: Record<string, string> }) { useLive(names, since); return null; }
    const refresh = vi.fn(async () => {});
    const view = render(<LiveProvider refresh={refresh} scopeKey="demo/owner"><Shows key="home" names={['members']} since={{ members: 'b1:7' }} /></LiveProvider>);
    await flush(0);
    live()[0].open();
    live()[0].send('synced', {});
    await flush(600);
    view.rerender(<LiveProvider refresh={refresh} scopeKey="demo/owner"><Shows key="keys" names={['keys']} since={{ keys: 'b1:3' }} /></LiveProvider>);
    await flush(0);
    expect(live()).toHaveLength(1);
    expect(live()[0].since()).toBe('keys:b1:3');
    live()[0].open();
    live()[0].send('synced', {});
    await flush(600);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('LiveProvider', () => {
  function Uses({ names }: { names: string[] }) { useLive(names); return null; }
  const setHidden = (hidden: boolean) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  };
  afterEach(() => { Reflect.deleteProperty(document, 'visibilityState'); });
  it('closes the stream when the document is hidden and resyncs when it returns', async () => {
    const refresh = vi.fn(async () => {});
    render(<LiveProvider refresh={refresh} scopeKey="demo/owner"><Uses names={['members']} /></LiveProvider>);
    await flush(0);
    const first = live()[0];
    first.open();
    await flush(600);
    expect(refresh).toHaveBeenCalledTimes(1);
    setHidden(true);
    expect(first.closed).toBe(true);
    expect(live()).toHaveLength(0);
    refresh.mockClear();
    setHidden(false);
    expect(live()).toHaveLength(1);
    live()[0].open();
    await flush(600);
    expect(refresh).toHaveBeenCalledWith(['members']);
  });
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
