// @vitest-environment node
// The browser stopped drawing frames twice in the field — 2026-11-14 in the navigation run, 2026-11-15 inside a product's
// own timed check, where it cost 46 routes and about 16 minutes of a Tier 2 stage. The navigation run had its answer inline
// and every other timed script had none, so the recovery is one export now and each script measures its own way.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { NOT_RUN_EXIT } from '../scripts/lib/coverage.ts';
import type { Page } from '../scripts/lib/chrome.ts';
import { StallGuard, browserGone } from '../scripts/lib/stall.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

/** A browser that drew `frames` in a fresh tab, and remembers being closed. */
function browser(frames = 60) {
  const page = { closed: false, frames: async () => frames, close: () => { page.closed = true; } };
  return page as unknown as Page & { closed: boolean };
}

/** process.exit throws here, so a call that leaves the run is asserted rather than ending the worker. */
class Exited extends Error {
  constructor(readonly code: number) { super(`exit ${code}`); }
}

function capture() {
  const lines: string[] = [];
  const exits: number[] = [];
  vi.spyOn(console, 'log').mockImplementation((m: unknown) => { lines.push(String(m)); });
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => { exits.push(code ?? 0); throw new Exited(code ?? 0); }) as never);
  return { lines, exits };
}

afterEach(() => { vi.restoreAllMocks(); });

const WHY = 'shows the heading "Settings", but the page stopped drawing frames, so nothing timed it';

describe('the guard a timed script holds when the browser stops painting', () => {
  it('asks a fresh tab, never the page that failed, whether the browser is still painting', async () => {
    const guard = new StallGuard(async () => browser());
    expect(await guard.stopped(browser(50))).toBe(false);
    // One frame is what a tab counts as it is created inside a browser that has stopped: measured 1 against 49-50 healthy.
    expect(await guard.stopped(browser(1))).toBe(true);
    expect(await guard.stopped(browser(0))).toBe(true);
  });

  it('relaunches once, prepares the fresh browser, closes the stalled one and names the work it came for', async () => {
    const { lines } = capture();
    const stalled = browser();
    const fresh = browser();
    const prepared: Page[] = [];
    const guard = new StallGuard(async () => fresh, async (p) => { prepared.push(p); });
    const page = await guard.restart(stalled, { route: '/requests', device: 'phone' }, WHY);
    expect(page).toBe(fresh);
    expect(stalled.closed).toBe(true);
    // A fresh browser has no instrumentation: the script's own prepare is what gives it any.
    expect(prepared).toEqual([fresh]);
    expect(lines).toEqual(['warn    the browser stopped drawing frames; relaunching it once and measuring /requests phone again']);
    expect(guard.relaunched).toEqual([{ route: '/requests', device: 'phone' }]);
  });

  it('asks for no prepare when the script has none', async () => {
    capture();
    const fresh = browser();
    const guard = new StallGuard(async () => fresh);
    await expect(guard.restart(browser(), { route: '/requests' }, WHY)).resolves.toBe(fresh);
  });

  it('stops the run with the not-run code when the same work stalls on the fresh browser, and names the work once', async () => {
    const { lines, exits } = capture();
    let launches = 0;
    const guard = new StallGuard(async () => { launches++; return browser(); });
    const fresh = await guard.restart(browser(), { route: '/requests', device: 'phone' }, WHY);
    await expect(guard.restart(fresh, { route: '/requests', device: 'phone' }, WHY)).rejects.toBeInstanceOf(Exited);
    expect(exits).toEqual([NOT_RUN_EXIT]);
    expect(launches).toBe(1);
    expect(lines).toContain('not run: the browser stopped drawing frames (' + WHY + ')');
  });

  it('gives a different route its own relaunch, so one stall is not a run that cannot be measured', async () => {
    capture();
    let launches = 0;
    const guard = new StallGuard(async () => { launches++; return browser(); });
    const after = await guard.restart(browser(), { route: '/requests' }, WHY);
    await expect(guard.restart(after, { route: '/members' }, WHY)).resolves.toBeDefined();
    expect(launches).toBe(2);
    expect(guard.relaunched).toEqual([{ route: '/requests' }, { route: '/members' }]);
  });

  it('reports a relaunch that cannot be made as a check that could not run, never as a stack trace', async () => {
    const { lines, exits } = capture();
    const guard = new StallGuard(async () => { throw new Error('Chrome did not start a page within 30 s'); });
    await expect(guard.restart(browser(), { route: '/requests' }, WHY)).rejects.toBeInstanceOf(Exited);
    expect(exits).toEqual([NOT_RUN_EXIT]);
    // The attempt itself is on the record before its outcome: a relaunch that fails still happened.
    expect(lines).toEqual([
      'warn    the browser stopped drawing frames; relaunching it once and measuring /requests again',
      'not run: the browser could not be started again (Chrome did not start a page within 30 s)',
    ]);
  });

  it('reports a fresh browser that cannot be prepared the same way', async () => {
    const { lines, exits } = capture();
    const fresh = browser();
    const guard = new StallGuard(async () => fresh, async () => { throw new Error('Page.navigate timed out'); });
    await expect(guard.restart(browser(), { route: '/requests' }, WHY)).rejects.toBeInstanceOf(Exited);
    expect(exits).toEqual([NOT_RUN_EXIT]);
    expect(lines).toEqual([
      'warn    the browser stopped drawing frames; relaunching it once and measuring /requests again',
      'not run: the relaunched browser could not be prepared (Page.navigate timed out)',
    ]);
    expect(fresh.closed).toBe(true);
  });

  it('counts what it did in one closing line, and says nothing when it did nothing', async () => {
    const quiet = capture();
    new StallGuard(async () => browser()).report();
    expect(quiet.lines).toEqual([]);

    vi.restoreAllMocks();
    const { lines } = capture();
    const guard = new StallGuard(async () => browser());
    // Two relaunches, counted: a recurring stall must not hide inside a green run.
    const after = await guard.restart(browser(), { route: '/requests', device: 'phone' }, WHY);
    await guard.restart(after, { route: '/members' }, WHY);
    lines.length = 0;
    guard.report();
    expect(lines).toEqual(['reported: the browser stopped drawing frames 2 times; relaunched (/requests phone, /members)']);
  });

  it('loads under the node that runs the scripts, not only under the test transform', () => {
    // The first version of this module used a parameter property, which tsc accepted, vitest ran, and `node` refused
    // outright (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`): the scripts run under node's own type-stripping, and no unit test
    // that imports them through vitest can see that. Found by driving the navigation suite, kept as a check.
    const r = spawnSync(process.execPath, ['-e', "import('./scripts/lib/stall.ts').then((m) => console.log(m.StallGuard.name))"], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.trim()).toBe('StallGuard');
  });
});

// The same browser class, a different symptom: the connection is gone rather than the frames stopped. A dashboard's 0.39.8
// release run met it on 2026-11-16 — `Runtime.evaluate: Chrome closed the connection` — and nothing caught it, so every
// stage after the personas went unreported.
describe('what a dead browser connection looks like', () => {
  it('recognises the errors Chrome reports when the connection is gone', () => {
    for (const m of [
      'Runtime.evaluate: Chrome closed the connection',
      'Protocol error (Page.navigate): Target closed.',
      'Session closed. Most likely the page has been closed.',
      'WebSocket is already in a closed state',
      'Inspector.detached',
    ]) expect(browserGone(new Error(m)), m).toBe(true);
  });

  it("leaves a page's own failure alone, which is the product's and stays one", () => {
    for (const m of ['timed out waiting for the content', 'AssertionError: expected 3 rows, got 0', 'net::ERR_NAME_NOT_RESOLVED']) {
      expect(browserGone(new Error(m)), m).toBe(false);
    }
    expect(browserGone('some string')).toBe(false);
  });
});
