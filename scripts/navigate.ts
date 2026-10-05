/**
 * Navigation readiness against the built app: for each route, how long until the shell is there, until the data is, and
 * until a control works, on a desktop and through the real phone drawer.
 *
 *   node scripts/navigate.ts --base http://127.0.0.1:3000 [--routes /,/requests,/settings] [--mode default|full] [--samples 1]
 *
 * Each journey starts from another rail route, waits for what a visitor would wait for (every router prefetch to finish
 * when it was visible, the drawer on a phone), presses the destination in the rail and times three things from that press:
 * the shell (the path and the heading), the data (the mapping's `readySelector` and `readyText`) and the interaction (its
 * `probe` on `controlSelector`, observed on `resultSelector`). The phone is 390 wide, 4x CPU throttled, 150 ms and 1.6 Mbps,
 * and the drawer-open-to-navigation time is reported apart.
 *
 * A timing over its budget is retaken twice and gated on the median of three (scripts/lib/timing.ts). A wrong result, a
 * page that never gets ready and a control that does nothing are failures and are never retaken. A route with no mapping
 * is measured for its shell only; its data and interaction are `not-configured`, never passed. Nothing here writes:
 * probes only open, sort, filter, toggle or follow.
 *
 * One line per route and device, one per device for the prefetch bytes, and a JSON summary on the last line:
 *
 *   ok|FAIL|warn|not run <route> <device> shell <ms> · data <ms|not-configured> · interactive <ms|not-configured>[ · noisy][ · <reasons>]
 *   navigate: {...}
 *
 * The exit code is non-zero on a FAIL and on a configuration error. Missing Chrome makes every line `not run`: exit 0 in
 * the default mode, non-zero in `full`. The mappings and budgets come from scripts/verify.config.ts, which `--config` can
 * replace and `--rail` can name the rail routes for (the readiness fixtures, which have no src/app.config.ts).
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { budgetsOf, type BudgetsConfig, type NavigationCheck } from './lib/budgets.ts';
import { launch, type Page } from './lib/chrome.ts';
import { resolveCoverage, selectSmokeRoutes } from './lib/coverage.ts';
import { railRoutes } from './lib/routes.ts';
import { isPrefetch, prefetchProblems } from './lib/sizes.ts';
import { judge } from './lib/timing.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const base = (opt('--base') ?? process.env.BASE ?? 'http://localhost:3000').replace(/\/$/, '');
const mode = (opt('--mode') ?? 'default') as 'default' | 'full';
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Device = 'desktop' | 'phone';
type Metric = 'shell' | 'data' | 'interactive';
const DEVICES: Device[] = ['desktop', 'phone'];
const METRICS: Metric[] = ['shell', 'data', 'interactive'];
const BUDGET_KEY = { shell: 'shellMs', data: 'dataMs', interactive: 'interactiveMs' } as const;
/** The phone is slow by design: its waits are longer, never its budgets. */
const PATIENCE: Record<Device, number> = { desktop: 10_000, phone: 30_000 };
/** How long a press may take to show its result before the control is called dead: past every cold interactive budget. */
const RESULT_WAIT: Record<Device, number> = { desktop: 5000, phone: 12_000 };
const KIB = 1024;

/** The fields of the team's config that navigate reads, each optional: an older product's config has none of them. */
type NavConfig = BudgetsConfig & { navigationChecks?: NavigationCheck[]; smokeRoutes?: string[] };

// ---- what a journey can end in ----

type Kind = 'never-ready' | 'wrong-result' | 'control-dead';
/** A failure that is the answer, not a measurement to repeat. */
class Fail extends Error {
  kind: Kind;
  constructor(kind: Kind, message: string) { super(message); this.kind = kind; }
}
type Measured = { ms: number } | { fail: Fail };
type Sample = { shell: Measured; data: Measured | null; interactive: Measured | null; drawerMs?: number; prefetchCapped: boolean };

// ---- in the page ----

/** Before the app runs: remembers every router prefetch, so the bytes can be summed and the destination's awaited. */
const INSTRUMENT = `(() => {
  const nav = window.__nav = { prefetches: [] };
  try { performance.setResourceTimingBufferSize(2000); } catch { /* keep the default */ }
  const headerOf = (input, init, name) => {
    const h = (init && init.headers) || (input instanceof Request ? input.headers : null);
    if (!h) return null;
    if (h instanceof Headers) return h.get(name);
    if (Array.isArray(h)) { const hit = h.find(([k]) => String(k).toLowerCase() === name); return hit ? hit[1] : null; }
    const key = Object.keys(h).find((k) => k.toLowerCase() === name);
    return key ? h[key] : null;
  };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (headerOf(input, init, 'next-router-prefetch') === null) return nativeFetch(input, init);
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
    const seen = { url: url.href, path: url.pathname, done: false, headers: { 'next-router-prefetch': String(headerOf(input, init, 'next-router-prefetch')) } };
    nav.prefetches.push(seen);
    // Done is the whole body read, not the headers: a response still streaming is still on the link.
    return nativeFetch(input, init).then((r) => { r.clone().arrayBuffer().then(() => { seen.done = true; }, () => { seen.done = true; }); return r; }, (e) => { seen.done = true; throw e; });
  };
})()`;

/**
 * The first element of `selector` a person could press now: shown, and once the page is a Next one, hydrated, because a
 * press before hydration does nothing. Null when there is none.
 */
const pickable = (selector: string) => `(() => {
  const hydrated = typeof self.__next_f === 'undefined' ? () => true : (el) => Object.keys(el).some((k) => k.startsWith('__reactProps$'));
  return [...document.querySelectorAll(${JSON.stringify(selector)})].find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && hydrated(el);
  }) ?? null;
})()`;

/** What a probe's result looks like now: the address, how many elements, their text and their state attributes. */
const snapshot = (selector: string) => `(() => location.href + '|' + [...document.querySelectorAll(${JSON.stringify(selector)})].slice(0, 40)
  .map((el) => (el.textContent ?? '').trim().slice(0, 80) + ['aria-sort', 'aria-expanded', 'aria-pressed', 'aria-checked', 'aria-selected', 'data-state', 'open'].map((a) => el.getAttribute(a)).join(','))
  .join(';'))()`;

/** Where the centre of the first pressable element of `selector` is, or null while none is or something covers it. */
async function point(page: Page, selector: string): Promise<{ x: number; y: number } | null> {
  return page.eval<{ x: number; y: number } | null>(`(() => {
    const el = ${pickable(selector)};
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return hit && (hit === el || el.contains(hit)) ? { x, y } : null;
  })()`);
}

/** Presses with the mouse; resolves with the time of the press. */
async function press(page: Page, at: { x: number; y: number }): Promise<number> {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at, button: 'left', clickCount: 1 });
  const t = Date.now();
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at, button: 'left', clickCount: 1 });
  return t;
}

/** Polls `read` until it returns something, or `until` (a clock time) passes. */
async function poll<T>(read: () => Promise<T | null | false>, until: number): Promise<T | null> {
  for (;;) {
    const v = await read();
    if (v) return v;
    if (Date.now() > until) return null;
    await sleep(15);
  }
}

// ---- the journey ----

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

async function throttle(page: Page, device: Device) {
  await page.send('Network.enable');
  await page.send('Network.clearBrowserCache');
  // 1.6 Mbps down is 200 000 bytes a second.
  await page.send('Network.emulateNetworkConditions', device === 'phone'
    ? { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 200_000 }
    : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.send('Emulation.setCPUThrottlingRate', { rate: device === 'phone' ? 4 : 1 });
}

async function openStart(page: Page, device: Device, start: string) {
  await throttle(page, device);
  await page.open(base + start, { ...(device === 'phone' ? PHONE : DESKTOP), theme: 'dark', wait: 200 });
  const ready = await poll(() => page.eval<boolean>(`document.readyState === 'complete' && !!document.querySelector('h1')`), Date.now() + PATIENCE[device]);
  if (!ready) throw new Fail('never-ready', `the starting page ${start} did not load in ${PATIENCE[device]} ms`);
}

/** How long a warm press waits for the router's prefetches: all of them, so none still shares the link with the navigation. */
const PREFETCH_WAIT = 6000;

/** Waits until every prefetch issued so far has its whole body; false when the cap passed first. A page that never prefetches is idle at once. */
async function awaitPrefetch(page: Page): Promise<boolean> {
  return (await poll(() => page.eval<boolean>(`window.__nav.prefetches.every((p) => p.done)`), Date.now() + PREFETCH_WAIT)) !== null;
}

async function journey(page: Page, device: Device, start: string, route: string, check: NavigationCheck | undefined): Promise<Sample> {
  await openStart(page, device, start);
  const link = `nav a[href=${JSON.stringify(route)}]`;
  const cap = PATIENCE[device];
  let drawerMs: number | undefined;
  let idle = true;
  if (device === 'phone') {
    const opened = await poll(() => point(page, 'button[aria-label="Open navigation"]'), Date.now() + cap);
    if (!opened) throw new Fail('never-ready', 'the Open navigation button is not pressable on the phone');
    const t = await press(page, opened);
    if (!(await poll(() => point(page, link), t + cap))) throw new Fail('never-ready', `the drawer did not show a link to ${route}`);
    drawerMs = Date.now() - t;
    idle = await awaitPrefetch(page);
  } else {
    if (!(await poll(() => point(page, link), Date.now() + cap))) throw new Fail('never-ready', `the rail has no pressable link to ${route}`);
    idle = await awaitPrefetch(page);
  }
  const prefetchCapped = !idle;
  const at = await poll(() => point(page, link), Date.now() + cap);
  if (!at) throw new Fail('never-ready', `the link to ${route} is covered or gone`);
  const t0 = await press(page, at);
  const since = () => Date.now() - t0;
  const heading = JSON.stringify(check?.title ?? '');

  // The shell: the path and the target heading.
  const shellOk = await poll(() => page.eval<boolean>(`location.pathname === ${JSON.stringify(route)} && (() => { const h = document.querySelector('h1'); return !!h && h.textContent.trim() !== '' && h.textContent.includes(${heading}); })()`).then((v) => v && since()), t0 + cap);
  if (shellOk === null) {
    const now = await page.eval<{ p: string; h: string }>(`({ p: location.pathname, h: document.querySelector('h1')?.textContent.trim() ?? '' })`);
    const wrong = now.p === route;
    return {
      shell: { fail: new Fail(wrong ? 'wrong-result' : 'never-ready', wrong ? `${route} shows the heading "${now.h}", not "${check?.title}"` : `still on ${now.p} ${cap} ms after pressing ${route}`) },
      data: check ? { fail: new Fail('never-ready', 'the shell was never reached') } : null,
      interactive: check ? { fail: new Fail('never-ready', 'the shell was never reached') } : null,
      drawerMs,
      prefetchCapped,
    };
  }
  const shell = { ms: shellOk };
  if (!check) return { shell, data: null, interactive: null, drawerMs, prefetchCapped };

  // Data and interaction run side by side: a control that is there at once does not wait for a body that is not.
  const [data, interactive] = await Promise.all([measureData(page, route, check, t0, cap), measureInteraction(page, route, check, t0, cap, RESULT_WAIT[device])]);
  if (check.probe === 'dialog') await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  return { shell, data, interactive, drawerMs, prefetchCapped };
}

async function measureData(page: Page, route: string, check: NavigationCheck, t0: number, cap: number): Promise<Measured> {
  const text = JSON.stringify((check.readyText ?? '').toLowerCase());
  const ms = await poll(() => page.eval<boolean>(`location.pathname === ${JSON.stringify(route)} && [...document.querySelectorAll(${JSON.stringify(check.readySelector)})].some((el) => el.textContent.toLowerCase().includes(${text}))`).then((v) => v && Date.now() - t0), t0 + cap);
  if (ms !== null) return { ms };
  const there = await page.eval<boolean>(`!!document.querySelector(${JSON.stringify(check.readySelector)})`);
  return { fail: new Fail(there ? 'wrong-result' : 'never-ready', there ? `${check.readySelector} is there but never shows "${check.readyText}"` : `${check.readySelector} did not appear in ${cap} ms`) };
}

async function measureInteraction(page: Page, route: string, check: NavigationCheck, t0: number, cap: number, wait: number): Promise<Measured> {
  const where = await poll(async () => (await page.eval<boolean>(`location.pathname === ${JSON.stringify(route)}`)) && point(page, check.controlSelector), t0 + cap);
  if (!where) return { fail: new Fail('never-ready', `the control ${check.controlSelector} was not pressable in ${cap} ms`) };
  const before = await page.eval<string>(snapshot(check.resultSelector));
  const isInput = await page.eval<boolean>(`(() => { const el = ${pickable(check.controlSelector)}; return !!el && el.tagName === 'INPUT' && ['text', 'search'].includes(el.type); })()`);
  await press(page, where);
  if (isInput) await page.send('Input.insertText', { text: 'a' });
  const pressed = Date.now();
  const changed = await poll(async () => (await page.eval<string>(snapshot(check.resultSelector))) !== before, pressed + wait);
  if (!changed) return { fail: new Fail('control-dead', `pressing ${check.controlSelector} (${check.probe}) changed nothing on ${check.resultSelector} in ${wait} ms`) };
  return { ms: Date.now() - t0 };
}

// ---- the retake rule, per route and device ----

type Verdict = 'pass' | 'fail' | 'not-configured' | 'not-run';
type Reported = { ms: number | null; limit?: number; verdict: Verdict; reason?: string };
type Line = {
  route: string;
  device: Device;
  status: 'ok' | 'warn' | 'FAIL' | 'not run';
  shell: Reported;
  data: Reported;
  interactive: Reported;
  drawerMs?: number;
  prefetchCapped: boolean;
  noisy: boolean;
  problems: string[];
};

const value = (m: Measured | null): number | null => (m && 'ms' in m ? m.ms : null);

async function measure(page: Page, device: Device, start: string, route: string, check: NavigationCheck | undefined, limits: Record<Metric, number>): Promise<Line> {
  const line: Line = { route, device, status: 'ok', shell: { ms: null, verdict: 'pass' }, data: { ms: null, verdict: 'not-configured' }, interactive: { ms: null, verdict: 'not-configured' }, noisy: false, prefetchCapped: false, problems: [] };
  const fill = (name: Metric, m: Measured | null) => {
    if (m === null) return;
    if ('fail' in m) {
      line[name] = { ms: null, limit: limits[name], verdict: 'fail', reason: `${m.fail.kind}: ${m.fail.message}` };
      line.problems.push(`${name} ${m.fail.kind}: ${m.fail.message}`);
    } else line[name] = { ms: m.ms, limit: limits[name], verdict: 'pass' };
  };
  const first = await journey(page, device, start, route, check);
  line.drawerMs = first.drawerMs;
  line.prefetchCapped = first.prefetchCapped;
  for (const name of METRICS) fill(name, first[name]);
  // A wrong result, a never-ready page or a dead control is the answer: no retake can replace it.
  if (line.problems.length) return finish(line);
  const over = METRICS.filter((name) => { const v = value(first[name]); return v !== null && judge([v], limits[name]).verdict === 'retake'; });
  if (over.length) {
    const retakes = [await journey(page, device, start, route, check), await journey(page, device, start, route, check)];
    const all = [first, ...retakes];
    for (const retake of retakes) for (const name of METRICS) {
      const m = retake[name];
      if (m && 'fail' in m) line.problems.push(`${name} ${m.fail.kind} on a retake: ${m.fail.message}`);
    }
    if (line.problems.length) { for (const name of METRICS) fill(name, retakes.map((r) => r[name]).find((m) => m && 'fail' in m) ?? first[name]); return finish(line); }
    for (const name of METRICS) {
      const samples = all.map((s) => value(s[name])).filter((v): v is number => v !== null);
      if (samples.length !== 3) continue;
      const j = judge(samples, limits[name]);
      line[name] = { ms: j.median, limit: limits[name], verdict: j.verdict === 'pass' ? 'pass' : 'fail', reason: j.verdict === 'pass' ? undefined : `median of ${samples.join(', ')} ms over ${limits[name]} ms` };
      if (j.verdict !== 'pass') line.problems.push(`${name} ${j.median} ms over its ${limits[name]} ms budget (samples ${samples.join(', ')})`);
      line.noisy ||= j.noisy;
    }
  }
  return finish(line);
}

function finish(line: Line): Line {
  line.status = line.problems.length ? 'FAIL' : line.noisy || line.data.verdict === 'not-configured' || line.interactive.verdict === 'not-configured' ? 'warn' : 'ok';
  return line;
}

const cell = (r: Reported): string => (r.verdict === 'not-configured' ? 'not-configured' : r.verdict === 'not-run' ? 'not run' : r.ms === null ? 'failed' : `${Math.round(r.ms)} ms`);
const text = (l: Line): string =>
  `${l.status.padEnd(7)} ${l.route} ${l.device} shell ${cell(l.shell)} · data ${cell(l.data)} · interactive ${cell(l.interactive)}`
  + (l.noisy ? ' · noisy' : '')
  + (l.prefetchCapped ? ` · prefetch not idle after ${PREFETCH_WAIT / 1000} s` : '')
  + (l.drawerMs !== undefined ? ` · drawer ${l.drawerMs} ms` : '')
  + (l.problems.length ? ` · ${l.problems.join('; ')}` : '');

// ---- prefetch ----

/** The compressed bytes of every router prefetch the landing route makes by the time it is idle. */
async function prefetchKiB(page: Page, device: Device, landing: string): Promise<number> {
  await openStart(page, device, landing);
  // Idle: two looks, 700 ms apart, that find the same prefetches and all of them answered.
  for (let i = 0, last = -1; i < 10; i++) {
    const now = await page.eval<{ n: number; done: boolean }>(`({ n: window.__nav.prefetches.length, done: window.__nav.prefetches.every((p) => p.done) })`);
    if (now.n === last && now.done) break;
    last = now.n;
    await sleep(700);
  }
  const seen = await page.eval<{ headers: Record<string, string>; url: string }[]>(`window.__nav.prefetches`);
  const urls = JSON.stringify(seen.filter((p) => isPrefetch({ headers: p.headers })).map((p) => p.url));
  return page.eval<number>(`(() => { const urls = new Set(${urls}); return performance.getEntriesByType('resource').filter((e) => urls.has(e.name)).reduce((n, e) => n + e.transferSize, 0); })()`);
}

// ---- main ----

const summary = (o: Record<string, unknown>) => console.log(`navigate: ${JSON.stringify(o)}`);

async function main(): Promise<number> {
  if (mode !== 'default' && mode !== 'full') { console.error(`--mode must be default or full, got ${mode}`); return 1; }
  if ((opt('--samples') ?? '1') !== '1') { console.error('--samples: one sample and two retakes is the only protocol here; --perf takes the 20-sample one'); return 1; }

  const config = ((await import(pathToFileURL(path.resolve(ROOT, opt('--config') ?? 'scripts/verify.config.ts')).href)) as { default?: NavConfig }).default ?? {};
  const budgets = budgetsOf(config);
  const checks = Array.isArray(config.navigationChecks) ? config.navigationChecks : [];

  let rail: { routes: string[]; landing: string };
  try {
    const named = opt('--rail')?.split(',').filter(Boolean);
    rail = named ? { routes: named, landing: named.includes('/') ? '/' : named[0] } : await railRoutes();
  } catch (e) {
    const reason = (e as Error).message;
    // The default smoke cannot choose its routes without a rail; the deeper modes treat that as an error.
    console.log(`${mode === 'full' ? 'FAIL   ' : 'not run'} navigate: ${reason}`);
    summary({ mode, status: mode === 'full' ? 'FAIL' : 'not-run', reason });
    return mode === 'full' ? 1 : 0;
  }

  const requested = opt('--routes')?.split(',').filter(Boolean);
  let routes: string[];
  try {
    routes = requested ?? (mode === 'full' ? rail.routes : selectSmokeRoutes({ smokeRoutes: config.smokeRoutes, nav: rail.routes, landing: rail.landing }));
  } catch (e) {
    console.log(`FAIL    navigate: ${(e as Error).message}`);
    summary({ mode, status: 'FAIL', errors: [(e as Error).message] });
    return 1;
  }

  // Everything that can be wrong with the routes and mappings is wrong before Chrome starts.
  const outside = routes.filter((r) => !rail.routes.includes(r));
  if (outside.length) {
    const errors = outside.map((r) => `${r}: not one of the rail routes (${rail.routes.join(', ')})`);
    errors.forEach((e) => console.log(`FAIL    ${e}`));
    summary({ mode, status: 'FAIL', routes, errors });
    return 1;
  }
  const coverage = resolveCoverage(mode, routes, checks, rail.routes);
  for (const w of coverage.warnings) console.log(`warn    ${w}`);
  if (coverage.errors.length) {
    for (const e of coverage.errors) console.log(`FAIL    ${e}`);
    summary({ mode, status: 'FAIL', routes, errors: coverage.errors });
    return 1;
  }

  let page: Page;
  try {
    // A missing Chrome binary is an error event on the child process, which nothing here can listen to: take it as the answer.
    let missing: (e: Error) => void = () => {};
    const gone = new Promise<never>((_, reject) => { missing = reject; });
    const onError = (e: Error) => missing(e);
    process.once('uncaughtException', onError);
    try { page = await Promise.race([launch(), gone]); } finally { process.off('uncaughtException', onError); }
  } catch (e) {
    const reason = `Chrome could not start (${(e as Error).message.split('\n')[0]})`;
    const lines = routes.flatMap((route) => DEVICES.map((device) => `not run ${route} ${device} shell not run · data not run · interactive not run · ${reason}`));
    lines.forEach((l) => console.log(l));
    for (const device of DEVICES) console.log(`not run prefetch ${device} · ${reason}`);
    summary({ mode, status: 'not-run', routes, reason });
    return mode === 'full' ? 1 : 0;
  }

  const lines: Line[] = [];
  let prefetch: { desktopKiB: number; phoneClosedKiB: number } | undefined;
  let problems: string[] = [];
  try {
    await page.send('Network.enable');
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: INSTRUMENT });
    for (const route of routes) {
      const check = checks.find((c) => c.path === route);
      // Each journey comes from another rail route, so the destination is a navigation and not the page already shown.
      const start = rail.routes.find((r) => r !== route) ?? route;
      for (const device of DEVICES) {
        const limits = Object.fromEntries(METRICS.map((m) => [m, budgets.navigation.warm[BUDGET_KEY[m]][device]])) as Record<Metric, number>;
        let line: Line;
        try {
          line = await measure(page, device, start, route, check, limits);
        } catch (e) {
          // The starting page never loading is a failure of this route and device, not of the run.
          const reason = e instanceof Fail ? `${e.kind}: ${e.message}` : (e as Error).message;
          line = finish({ route, device, status: 'FAIL', shell: { ms: null, verdict: 'fail', reason }, data: { ms: null, verdict: 'not-run' }, interactive: { ms: null, verdict: 'not-run' }, noisy: false, prefetchCapped: false, problems: [reason] });
        }
        if (!check) {
          line.data = { ms: null, verdict: 'not-configured' };
          line.interactive = { ms: null, verdict: 'not-configured' };
          finish(line);
        }
        lines.push(line);
        console.log(text(line));
      }
    }
    const bytes = { desktop: await prefetchKiB(page, 'desktop', rail.landing), phoneClosed: await prefetchKiB(page, 'phone', rail.landing) };
    prefetch = { desktopKiB: bytes.desktop / KIB, phoneClosedKiB: bytes.phoneClosed / KIB };
    problems = prefetchProblems({ desktopBytes: bytes.desktop, phoneClosedBytes: bytes.phoneClosed }, budgets.prefetchKb);
    const lineFor = (device: string, kib: number, cap: number) => `${kib > cap ? 'FAIL   ' : 'ok     '} prefetch ${device} ${kib.toFixed(1)} KiB compressed · cap ${cap} KiB`;
    console.log(lineFor('desktop', prefetch.desktopKiB, budgets.prefetchKb.desktop));
    console.log(lineFor('phone-closed', prefetch.phoneClosedKiB, budgets.prefetchKb.phoneClosed));
    for (const p of problems) console.log(`FAIL    ${p}`);
  } finally {
    page.close();
  }

  const failed = lines.some((l) => l.status === 'FAIL') || problems.length > 0;
  const status = failed ? 'FAIL' : lines.some((l) => l.status === 'warn') ? 'warn' : 'ok';
  summary({
    mode,
    status,
    routes,
    warnings: coverage.warnings,
    lines: lines.map(({ route, device, status: s, shell, data, interactive, drawerMs, prefetchCapped, noisy, problems: p }) => ({ route, device, status: s, shell, data, interactive, drawerMs, prefetchCapped, noisy, problems: p })),
    prefetch: prefetch && { ...prefetch, problems },
  });
  return failed ? 1 : 0;
}

process.exit(await main());
