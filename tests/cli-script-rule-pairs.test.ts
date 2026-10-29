// @vitest-environment node
// Named cli-* so the payload leaves it out: it copies Meridian's own scripts into temp projects and reads their source.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { firstLoad, firstLoadProblems, htmlGrowthProblems, htmlProblems, prefetchProblems } from '../scripts/lib/sizes.ts';
import { emptyShells, offenders } from '../scripts/route-policy.ts';

/**
 * Every rule `scripts/sizes.ts` (with `scripts/lib/sizes.ts`), `scripts/route-policy.ts` and `scripts/contrast.ts` judge,
 * each with an input that makes it report its failure and an input where that report is absent. A rule with only a clean
 * run is one nothing shows can fire, and one with only a failing run might fire on everything; these are the gates that
 * hold the size budgets, the prerender policy and WCAG contrast, so a rule that went silent is a regression nobody sees.
 * A rule that lives in a pure function is called with crafted inputs; one that lives only in a script's main path runs
 * the script in a temp project (a fake build folder, a baseline, a stub server), never against this repository's `.next`.
 * The completeness scan reads each script's text, finds every place it can fail from, and fails naming any that no rule
 * here claims by its `source`: a new failure site is a new rule listed here.
 */
type Rule = {
  id: string;
  /** Text at the place in the script the rule fails from (a literal substring of its line): the place still exists, and no place goes unclaimed. */
  source: string;
  /** The input that makes it report, and the input where the report is absent; each asserts itself. */
  fail: () => void | Promise<void>;
  pass: () => void | Promise<void>;
};
type Script = { file: string; site: RegExp; rules: Rule[] };

const ROOT = path.resolve(import.meta.dirname, '..');
const KiB = 1024;
const tmp: string[] = [];
const servers: http.Server[] = [];
afterAll(() => {
  for (const d of tmp) fs.rmSync(d, { recursive: true, force: true });
  for (const s of servers) s.close();
});

// ── A temp project holding copies of the scripts under test ──────────────────────────────────────────
type Run = { out: string; err: string; status: number | null };
const memo = <T>(make: () => Promise<T>) => {
  let p: Promise<T> | undefined;
  return () => (p ??= make());
};
const text = (run: Run) => run.out + run.err;

/** A project with the named files of this repository copied in and `files` written over them; `src/lib/color.ts` is always present. */
function project(copy: string[], files: Record<string, string | Buffer> = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-script-pairs-'));
  tmp.push(dir);
  for (const f of [...copy, 'src/lib/color.ts', 'package.json']) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    if (fs.statSync(path.join(ROOT, f)).isDirectory()) fs.cpSync(path.join(ROOT, f), path.join(dir, f), { recursive: true });
    else fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  }
  for (const [f, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), body);
  }
  return dir;
}
const run = (dir: string, script: string, args: string[] = []) =>
  new Promise<Run>((resolve) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: dir });
    let out = '';
    let err = '';
    child.stdout.on('data', (d: Buffer) => (out += d));
    child.stderr.on('data', (d: Buffer) => (err += d));
    child.on('close', (status) => resolve({ out, err, status }));
  });
const lines = (run: Run, re: RegExp) => run.out.split('\n').filter((l) => re.test(l));
const summaryOf = (r: Run) => JSON.parse(r.out.trim().split('\n').pop()!.replace(/^sizes: /, '')) as { status: string };

// ── scripts/sizes.ts ─────────────────────────────────────────────────────────────────────────────────
const SIZES_FILES = ['scripts/sizes.ts', 'scripts/lib/args.ts', 'scripts/lib/sizes.ts', 'scripts/lib/budgets.ts', 'scripts/lib/next-config.ts'];
/** Incompressible bytes, so a page's gzipped size is its length. */
const blob = (n: number) => {
  const parts: Buffer[] = [];
  for (let i = 0; parts.length * 32 < n; i++) parts.push(createHash('sha256').update(String(i)).digest());
  return Buffer.concat(parts).subarray(0, n);
};
type Pages = Record<string, { status: number; bytes: number }>;
async function serve(pages: Pages): Promise<string> {
  const server = http.createServer((req, res) => {
    const page = pages[req.url ?? ''];
    res.writeHead(page?.status ?? 404);
    res.end(blob(page?.bytes ?? 10));
  });
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
type Build = {
  stats?: unknown;
  chunks?: Record<string, number>;
  baseline?: unknown;
  config?: string;
};
const CLEAN: Required<Build> = {
  stats: [
    { route: '/', firstLoadChunkPaths: ['chunks/a.js'] },
    { route: '/services', firstLoadChunkPaths: ['chunks/a.js', 'chunks/b.js'] },
    { route: '/api/live', firstLoadChunkPaths: ['chunks/a.js'] },
  ],
  chunks: { 'chunks/a.js': 100 * KiB, 'chunks/b.js': 50 * KiB },
  baseline: { method: 'x', routes: { '/': 100 * KiB, '/services': 150 * KiB }, html: { method: 'x', routes: { '/': 20 * KiB, '/services': 20 * KiB } } },
  config: 'export default {};\n',
};
const CLEAN_PAGES: Pages = { '/': { status: 200, bytes: 20 * KiB }, '/services': { status: 200, bytes: 20 * KiB } };
/** `null` leaves a file out; a string is written as it is. */
async function sizesRun(build: Build = {}, pages: Pages | string | null = CLEAN_PAGES, args: string[] = []): Promise<Run> {
  const b = { ...CLEAN, ...build };
  const files: Record<string, string | Buffer> = { 'scripts/verify.config.ts': b.config };
  if (b.stats !== null) files['.next/diagnostics/route-bundle-stats.json'] = typeof b.stats === 'string' ? b.stats : JSON.stringify(b.stats);
  for (const [f, n] of Object.entries(b.chunks)) files[f] = Buffer.alloc(n);
  if (b.baseline !== null) files['scripts/verify.baseline.json'] = typeof b.baseline === 'string' ? b.baseline : JSON.stringify(b.baseline);
  const dir = project(SIZES_FILES, files);
  const base = pages === null ? [] : ['--base', typeof pages === 'string' ? pages : await serve(pages)];
  return run(dir, 'scripts/sizes.ts', [...base, ...args]);
}
const sizesClean = memo(() => sizesRun());
const sizesNoBase = memo(() => sizesRun({}, null));
const refusal = (r: Run, re: RegExp) => {
  expect(r.out).toMatch(re);
  expect(r.status).toBe(1);
  expect(summaryOf(r).status).toBe('FAIL');
};
const cleanOf = async (re: RegExp) => {
  const r = await sizesClean();
  expect(r.out).not.toMatch(re);
  expect(r.status).toBe(0);
  expect(summaryOf(r).status).toBe('ok');
};
const HUGE = { stats: [{ route: '/big', firstLoadChunkPaths: ['chunks/big.js'] }], chunks: { 'chunks/big.js': 900 * KiB } };
const GROWN = { chunks: { 'chunks/a.js': 120 * KiB, 'chunks/b.js': 50 * KiB } };
const ROUTE_STATS = [{ route: '/x', bytes: 900 * KiB }, { route: '/y', bytes: 535 * KiB }];
const KB = (n: number) => n * KiB;

const SIZES_LIB: Rule[] = [
  { id: 'a chunk with no known size is an error, never zero', source: 'has no known size',
    fail: () => expect(() => firstLoad([{ route: '/x', firstLoadChunkPaths: ['a', 'gone'] }], (c) => (c === 'a' ? 1 : null))).toThrow(/\/x: first-load chunk gone has no known size/),
    pass: () => expect(firstLoad([{ route: '/x', firstLoadChunkPaths: ['a', 'a'] }], () => 7)).toEqual([{ route: '/x', bytes: 7 }]) },
  { id: 'a route is over the first-load cap', source: 'KiB over the ${capKiB} KiB cap',
    fail: () => expect(firstLoadProblems(ROUTE_STATS, { capKiB: 820, growthPct: 5, baseline: null }).problems).toEqual(['/x: first-load JS 900 KiB over the 820 KiB cap']),
    pass: () => expect(firstLoadProblems([{ route: '/y', bytes: 820 * KiB }], { capKiB: 820, growthPct: 5, baseline: null }).problems).toEqual([]) },
  { id: 'the cap binds only a route the baseline does not hold, when asked', source: '!(capUnheldOnly && held) && bytes',
    fail: () => expect(firstLoadProblems([{ route: '/new', bytes: KB(900) }], { capKiB: 820, growthPct: 5, baseline: { '/old': 1 }, capUnheldOnly: true }).problems).toEqual(['/new: first-load JS 900 KiB over the 820 KiB cap']),
    pass: () => expect(firstLoadProblems([{ route: '/old', bytes: KB(900) }], { capKiB: 820, growthPct: 5, baseline: { '/old': KB(900) }, capUnheldOnly: true }).problems).toEqual([]) },
  { id: 'a route grew past its first-load allowance', source: 'first-load JS grew ${grew.toFixed(1)}% over its baseline',
    fail: () => expect(firstLoadProblems([{ route: '/y', bytes: KB(535) }], { capKiB: 820, growthPct: 5, baseline: { '/y': KB(500) } }).problems).toEqual(['/y: first-load JS grew 7.0% over its baseline (cap 5%)']),
    pass: () => expect(firstLoadProblems([{ route: '/y', bytes: KB(524) }], { capKiB: 820, growthPct: 5, baseline: { '/y': KB(500) } }).problems).toEqual([]) },
  { id: 'a page grew past its HTML allowance', source: 'HTML grew ${grew.toFixed(1)}% over its baseline',
    fail: () => expect(htmlGrowthProblems({ '/s': KB(21.5) }, { growthPct: 5, baseline: { '/s': KB(20) } }).problems).toEqual(['/s: HTML grew 7.5% over its baseline (cap 5%)']),
    pass: () => expect(htmlGrowthProblems({ '/s': KB(20.5) }, { growthPct: 5, baseline: { '/s': KB(20) } }).problems).toEqual([]) },
  { id: 'a page is over its absolute HTML cap', source: 'KiB over its ${cap} KiB cap',
    fail: () => expect(htmlProblems({ '/services': KB(131) }, { '/services': 100 })).toEqual(['/services: HTML 131 KiB over its 100 KiB cap']),
    pass: () => expect(htmlProblems({ '/services': KB(100) }, { '/services': 100 })).toEqual([]) },
  { id: 'the desktop prefetch is over its cap', source: "desktop: prefetch ${kib(desktopBytes)}",
    fail: () => expect(prefetchProblems({ desktopBytes: KB(90), phoneClosedBytes: 0 }, { desktop: 80, phoneClosed: 0 })).toEqual(['desktop: prefetch 90 KiB over its 80 KiB cap']),
    pass: () => expect(prefetchProblems({ desktopBytes: KB(80), phoneClosedBytes: 0 }, { desktop: 80, phoneClosed: 0 })).toEqual([]) },
  { id: 'the phone prefetch with the drawer closed is over its cap', source: 'phone with the drawer closed: prefetch',
    fail: () => expect(prefetchProblems({ desktopBytes: 0, phoneClosedBytes: KB(2) }, { desktop: 80, phoneClosed: 0 })).toEqual(['phone with the drawer closed: prefetch 2 KiB over its 0 KiB cap']),
    pass: () => expect(prefetchProblems({ desktopBytes: 0, phoneClosedBytes: 0 }, { desktop: 80, phoneClosed: 0 })).toEqual([]) },
];

const SIZES_MAIN: Rule[] = [
  { id: 'a build with no route stats is refused', source: '; run next build first',
    fail: async () => refusal(await sizesRun({ stats: null }, null), /^FAIL\s+no \.next\/diagnostics\/route-bundle-stats\.json; run next build first/m),
    pass: () => cleanOf(/run next build first/) },
  { id: 'route stats that are not JSON are refused', source: '${path.relative(ROOT, file)} is not JSON',
    fail: async () => refusal(await sizesRun({ stats: '{' }, null), /^FAIL\s+\.next\/diagnostics\/route-bundle-stats\.json is not JSON/m),
    pass: () => cleanOf(/is not JSON/) },
  { id: 'a refusal prints FAIL, a summary and exits 1', source: '`FAIL    ${message}`',
    fail: async () => { const r = await sizesRun({ stats: null }, null); expect(r.out).toMatch(/^sizes: \{"status":"FAIL","error":"no /m); expect(r.status).toBe(1); },
    pass: () => cleanOf(/"error"/) },
  { id: 'the script relays the lib\'s unknown-size error as a refusal', source: 'fail((e as Error).message)',
    fail: async () => refusal(await sizesRun({ chunks: { 'chunks/a.js': 1 } }, null), /^FAIL\s+\/services: first-load chunk chunks\/b\.js has no known size/m),
    pass: () => cleanOf(/has no known size/) },
  { id: 'a baseline that is not JSON is refused', source: '${rel} is not JSON',
    fail: async () => refusal(await sizesRun({ baseline: 'nope' }, null), /^FAIL\s+scripts\/verify\.baseline\.json is not JSON/m),
    pass: () => cleanOf(/baseline\.json is not JSON/) },
  { id: 'a baseline of the wrong shape is refused', source: '${rel} must be ${SHAPE}',
    fail: async () => refusal(await sizesRun({ baseline: { method: 'x', routes: { '/': 0 } } }, null), /^FAIL\s+scripts\/verify\.baseline\.json must be \{ "method": string/m),
    pass: () => cleanOf(/must be \{/) },
  { id: 'a route over the cap is reported and fails the run', source: 'for (const p of size.problems) lines.push(`FAIL',
    fail: async () => { const r = await sizesRun({ ...HUGE, baseline: null }, null); refusal(r, /^FAIL\s+\/big: first-load JS 900 KiB over the 830 KiB cap/m); expect(summaryOf(r)).toMatchObject({ firstLoad: { status: 'FAIL' } }); },
    pass: () => cleanOf(/first-load JS/) },
  { id: 'a route that grew past its baseline fails the run', source: 'within ${budgets.firstLoadGrowthPct}% of the baseline',
    fail: async () => refusal(await sizesRun(GROWN, null), /^FAIL\s+first-load 2 routes[\s\S]*^FAIL\s+\/: first-load JS grew 20\.0% over its baseline \(cap 5%\)/m),
    pass: async () => expect((await sizesClean()).out).toMatch(/^ok\s+first-load 2 routes, largest \/services 150 KiB · cap 830 KiB · growth within 5% of the baseline/m) },
  { id: 'a page that grew past its HTML baseline fails the run', source: 'for (const p of html.problems) lines.push(`FAIL',
    fail: async () => refusal(await sizesRun({}, { ...CLEAN_PAGES, '/services': { status: 200, bytes: KB(30) } }), /^FAIL\s+\/services: HTML grew 5\d\.\d% over its baseline \(cap 5%\)/m),
    pass: () => cleanOf(/HTML grew/) },
  { id: 'a page over its absolute HTML cap fails the run', source: 'htmlProblems(got.sizes, budgets.htmlKb)',
    fail: async () => refusal(await sizesRun({ config: 'export default { budgets: { htmlKb: { "/": 10 } } };\n' }), /^FAIL\s+\/: HTML 20 KiB over its 10 KiB cap/m),
    pass: () => cleanOf(/over its \d+ KiB cap/) },
  { id: 'a held page that does not answer 200 is reported', source: 'but the route answered ${res.status}',
    fail: async () => refusal(await sizesRun({}, { ...CLEAN_PAGES, '/services': { status: 404, bytes: 10 } }), /^FAIL\s+\/services: its HTML is held, but the route answered 404/m),
    pass: () => cleanOf(/the route answered/) },
  { id: 'a held page that cannot be fetched is reported', source: 'could not be fetched from ${base}',
    fail: async () => refusal(await sizesRun({}, 'http://127.0.0.1:1'), /^FAIL\s+\/: could not be fetched from http:\/\/127\.0\.0\.1:1 \(/m),
    pass: () => cleanOf(/could not be fetched/) },
  { id: 'first-load growth without a baseline is a warning, never a pass', source: 'not-configured (no scripts/verify.baseline.json)',
    fail: async () => {
      const r = await sizesRun({ baseline: null }, null);
      expect(r.out).toMatch(/^warn\s+first-load 2 routes.*not-configured \(no scripts\/verify\.baseline\.json\)/m);
      expect(summaryOf(r)).toMatchObject({ status: 'warn', firstLoad: { status: 'warn', growth: 'not-configured' } });
      expect(r.status).toBe(0);
    },
    pass: async () => expect((await sizesNoBase()).out).toMatch(/^ok\s+first-load 2 routes.*growth within 5%/m) },
  { id: 'HTML growth without an HTML baseline is a warning, never a pass', source: 'not-configured (no html in scripts/verify.baseline.json',
    fail: async () => {
      const r = await sizesRun({ baseline: { method: 'x', routes: { '/': KB(100), '/services': KB(150) } } });
      expect(r.out).toMatch(/^warn\s+html 0 pages.*not-configured \(no html in scripts\/verify\.baseline\.json/m);
      expect(summaryOf(r)).toMatchObject({ status: 'warn', html: { status: 'warn' } });
      expect(r.status).toBe(0);
    },
    pass: async () => expect((await sizesClean()).out).toMatch(/^ok\s+html 2 pages gzipped.*growth within 5%/m) },
  { id: 'recording the baseline leaves out a page it cannot measure, and warns', source: '; left out of the HTML baseline',
    fail: async () => {
      const r = await sizesRun({}, { ...CLEAN_PAGES, '/services': { status: 404, bytes: 10 } }, ['--write-baseline']);
      expect(r.out).toMatch(/^warn\s+\/services: a page, but the route answered 404; left out of the HTML baseline/m);
      expect(r.status).toBe(0);
    },
    pass: async () => {
      const r = await sizesRun({}, CLEAN_PAGES, ['--write-baseline']);
      expect(r.out).not.toMatch(/left out of the HTML baseline/);
      expect(r.out).toMatch(/^ok\s+wrote scripts\/verify\.baseline\.json: first-load of 2 routes, the HTML of 2 pages/m);
      expect(r.status).toBe(0);
    } },
  { id: 'the exit code is 1 on any FAIL and 0 otherwise', source: 'return failed ? 1 : 0',
    fail: async () => expect((await sizesRun({ ...HUGE, baseline: null }, null)).status).toBe(1),
    pass: async () => expect((await sizesClean()).status).toBe(0) },
];

// ── scripts/route-policy.ts ──────────────────────────────────────────────────────────────────────────
const POLICY_FILES = ['scripts/route-policy.ts', 'scripts/lib/next-config.ts'];
type Mode = 'STATIC' | 'PARTIALLY_STATIC' | undefined;
type Built = { routes: Record<string, Mode>; shells?: Record<string, number>; declared?: { path: string; reason: string }[] };
const CLEAN_BUILD: Built = {
  routes: { '/': 'STATIC', '/services': 'PARTIALLY_STATIC', '/reports': undefined, '/api/live': undefined, '/requests/[id]': 'PARTIALLY_STATIC' },
  shells: { '/requests/[id]': 4096 },
  declared: [{ path: '/reports', reason: 'Reads the signed-in user on every request.' }],
};
async function policyRun(built: Built | null): Promise<Run> {
  const files: Record<string, string | Buffer> = {};
  files['scripts/verify.config.ts'] = `export default ${JSON.stringify({ requestDependentRoutes: built?.declared ?? [] })};\n`;
  if (built) {
    const entry = (m: Mode) => (m ? { renderingMode: m } : null);
    const staticRoutes: Record<string, unknown> = {};
    const dynamicRoutes: Record<string, unknown> = {};
    const app: Record<string, string> = {};
    for (const [p, m] of Object.entries(built.routes)) {
      app[`${p}/page`] = p;
      if (!m) continue;
      (p.includes('[') ? dynamicRoutes : staticRoutes)[p] = entry(m);
    }
    files['.next/app-path-routes-manifest.json'] = JSON.stringify(app);
    files['.next/prerender-manifest.json'] = JSON.stringify({ routes: staticRoutes, dynamicRoutes });
    for (const [p, bytes] of Object.entries(built.shells ?? {})) files[`.next/server/app/${p}.html`] = Buffer.alloc(bytes);
  }
  return run(project(POLICY_FILES, files), 'scripts/route-policy.ts');
}
const policyClean = memo(() => policyRun(CLEAN_BUILD));
const POLICY_ROUTES = [
  { path: '/', kind: 'partial' }, { path: '/services', kind: 'static' }, { path: '/members', kind: 'dynamic' },
  { path: '/api/live', kind: 'dynamic' },
] as { path: string; kind: 'static' | 'partial' | 'dynamic' }[];
const policyPasses = async (re: RegExp) => {
  const r = await policyClean();
  expect(text(r)).not.toMatch(re);
  expect(r.out).toMatch(/^route-policy: 1 static, 2 partial, 0 dynamic of 4 non-API routes; 0 empty shells$/m);
  expect(r.status).toBe(0);
};

const POLICY: Rule[] = [
  { id: 'a declaration without a reason is refused', source: 'has no reason; say why it cannot be prerendered',
    fail: () => expect(() => offenders(POLICY_ROUTES, [{ path: '/members', reason: ' ' }])).toThrow(/requestDependentRoutes: \/members has no reason/),
    pass: () => expect(offenders(POLICY_ROUTES, [{ path: '/members', reason: 'Reads the user.' }])).toEqual([]) },
  { id: 'a declaration for a route the build lacks is refused', source: 'is not a route of this build',
    fail: () => expect(() => offenders(POLICY_ROUTES, [{ path: '/nowhere', reason: 'x' }])).toThrow(/requestDependentRoutes: \/nowhere is not a route of this build/),
    pass: () => expect(offenders(POLICY_ROUTES, [{ path: '/members', reason: 'x' }])).toEqual([]) },
  { id: 'the script prints a refused declaration and exits 1', source: 'console.error(`route-policy: ${(e as Error).message}`)',
    fail: async () => {
      const r = await policyRun({ ...CLEAN_BUILD, declared: [{ path: '/reports', reason: '' }] });
      expect(r.err).toMatch(/^route-policy: requestDependentRoutes: \/reports has no reason/m);
      expect(r.status).toBe(1);
    },
    pass: () => policyPasses(/has no reason/) },
  { id: 'a build that was never made is refused', source: 'no production build in',
    fail: async () => {
      const r = await policyRun(null);
      expect(r.err).toMatch(/^route-policy: no production build in \.next; run next build first/m);
      expect(r.status).toBe(1);
    },
    pass: () => policyPasses(/no production build/) },
  { id: 'a dynamic route nobody declared is named', source: 'prerender it, or declare it in requestDependentRoutes with a reason',
    fail: async () => {
      const r = await policyRun({ ...CLEAN_BUILD, declared: [] });
      expect(r.out).toMatch(/^dynamic route \/reports: prerender it, or declare it in requestDependentRoutes with a reason$/m);
      expect(r.out).not.toMatch(/dynamic route \/api\/live/);
      expect(r.out).toMatch(/1 dynamic of 4 non-API routes/);
      expect(r.status).toBe(1);
    },
    pass: () => policyPasses(/dynamic route /) },
  { id: 'a partial route whose shell for an unknown parameter is empty is named', source: 'empty shell ${p}: nothing is prerendered',
    fail: async () => {
      const r = await policyRun({ ...CLEAN_BUILD, shells: { '/requests/[id]': 0 } });
      expect(r.out).toMatch(/^empty shell \/requests\/\[id\]: nothing is prerendered for a parameter the build did not know/m);
      expect(r.out).toMatch(/; 1 empty shells$/m);
      expect(r.status).toBe(1);
    },
    pass: async () => {
      expect(emptyShells([{ path: '/keys/[id]', bytes: 17565 }, { path: '/reports/[id]', bytes: null }])).toEqual([]);
      await policyPasses(/empty shell /);
    } },
  { id: 'a route is named only when it is dynamic and not declared', source: 'r.kind === \'dynamic\' && !r.path.startsWith(\'/api/\')',
    fail: () => expect(offenders(POLICY_ROUTES, [])).toEqual(['/members']),
    pass: () => expect(offenders(POLICY_ROUTES, [{ path: '/members', reason: 'Reads the user.' }])).toEqual([]) },
  { id: 'the exit code is 1 on a dynamic route or an empty shell, 0 otherwise', source: 'process.exit(bad.length || empty.length ? 1 : 0)',
    fail: async () => expect((await policyRun({ ...CLEAN_BUILD, declared: [] })).status).toBe(1),
    pass: async () => expect((await policyClean()).status).toBe(0) },
];

// ── scripts/contrast.ts ──────────────────────────────────────────────────────────────────────────────
const CONTRAST_FILES = ['scripts/contrast.ts', 'scripts/tokens.ts', 'scripts/lib/contrast-pairs.ts', 'tokens'];
const NS = 'dev.zz.meridian';
const ACCENTS = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'tokens/zz-meridian.resolver.json'), 'utf8')).modifiers.accent.contexts);
type Token = { $value?: unknown; $extensions?: Record<string, unknown> };
type Edit = { file: 'theme.dark' | 'theme.light'; token: string; change: (t: Token) => void };
const hexOf = (hex: string): Edit['change'] => (t) => { t.$value = { hex }; };
const cssOf = (css: string): Edit['change'] => (t) => { t.$extensions = { [NS]: { css } }; };
async function contrastRun(edits: Edit[], args: string[] = []): Promise<Run> {
  const dir = project(CONTRAST_FILES);
  for (const e of edits) {
    const file = path.join(dir, `tokens/${e.file}.tokens.json`);
    const json = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, Record<string, Token>>;
    const group = Object.values(json).find((g) => typeof g === 'object' && e.token in g);
    if (!group) throw new Error(`${e.file} has no token ${e.token}`);
    e.change(group[e.token]);
    fs.writeFileSync(file, JSON.stringify(json, null, 2));
  }
  return run(dir, 'scripts/contrast.ts', args);
}
const contrastClean = memo(() => contrastRun([]));
/** The dark theme with a pair, two chart slots and the stack mix pushed out of bounds. */
const contrastDark = memo(() => contrastRun([
  { file: 'theme.dark', token: 'ink-2', change: hexOf('#1a1a1a') },
  { file: 'theme.dark', token: 'series-1', change: hexOf('#ffffff') },
  { file: 'theme.dark', token: 'series-2', change: hexOf('#6b6b6b') },
  { file: 'theme.dark', token: 'chart-stack-hi', change: (t) => { t.$value = 0.1; } },
]));
/** Light slots 3 and 4 a red and a green that read apart in normal vision and together under protan and deutan. */
const contrastCvd = memo(() => contrastRun([
  { file: 'theme.light', token: 'series-3', change: hexOf('#3f9a4a') },
  { file: 'theme.light', token: 'series-4', change: hexOf('#c9503f') },
]));
/** Light slots 3 and 4 the same colour. */
const contrastSame = memo(() => contrastRun([
  { file: 'theme.light', token: 'series-3', change: hexOf('#3f9a4a') },
  { file: 'theme.light', token: 'series-4', change: hexOf('#3f9a4a') },
]));
const contrastPasses = async (re: RegExp) => {
  const r = await contrastClean();
  expect(text(r)).not.toMatch(re);
  expect(r.out).toMatch(/^contrast: \d+ pairs across every theme and accent, 0 failures$/m);
  expect(r.status).toBe(0);
};

const CONTRAST: Rule[] = [
  { id: 'a specified foreground under its contrast fails, in every accent', source: 'of PAIRS) report(measure(',
    fail: async () => {
      const r = await contrastDark();
      const hit = lines(r, /^FAIL dark .*ink-2 on ground: secondary copy on the page/);
      for (const a of ACCENTS) expect(hit.some((l) => new RegExp(`^FAIL dark\\s+${a}\\s+\\s*\\d+\\.\\d\\d:1 \\(needs 4\\.5\\)`).test(l)), `${a}\n${r.out}`).toBe(true);
      expect(r.status).toBe(1);
    },
    pass: () => contrastPasses(/^FAIL .* on /m) },
  { id: 'a failure prints as a FAIL line with the measured ratio and what it needs', source: "${ok ? 'ok  ' : 'FAIL'}",
    fail: async () => expect((await contrastDark()).out).toMatch(/^FAIL dark\s+indigo\s+\s*\d+\.\d\d:1 \(needs 4\.5\)\s+ink-2 on ground/m),
    pass: async () => {
      const r = await contrastRun([], ['--all']);
      expect(r.out).toMatch(/^ok\s+dark\s+indigo\s+\s*\d+\.\d\d:1 \(needs 4\.5\)\s+ink on ground/m);
      expect(r.out).not.toMatch(/^FAIL/m);
    } },
  { id: 'a mixed mark under its contrast fails', source: 'of MIXES) report(measureMix(',
    fail: async () => expect((await contrastDark()).out).toMatch(/^FAIL dark\s+indigo\s+\s*\d+\.\d\d:1 \(needs 3\)\s+accent at chart-stack-hi on surface: the deepest part of a stack/m),
    pass: () => contrastPasses(/the deepest part of a stack/) },
  { id: 'a chart slot outside the lightness band fails', source: 'lightness ${L.toFixed(3)} outside',
    fail: async () => expect((await contrastDark()).out).toMatch(/^FAIL dark chart palette: series-1 #ffffff lightness 1\.000 outside 0\.48-0\.67$/mi),
    pass: () => contrastPasses(/lightness/) },
  { id: 'a chart slot under the chroma floor fails', source: 'chroma ${C.toFixed(3)} under 0.10',
    fail: async () => expect((await contrastDark()).out).toMatch(/^FAIL dark chart palette: series-2 #6b6b6b chroma 0\.000 under 0\.10$/mi),
    pass: () => contrastPasses(/chroma/) },
  { id: 'adjacent slots that colour-blind readers cannot tell apart fail', source: 'adjacent CVD separation',
    fail: async () => expect((await contrastCvd()).out).toMatch(/^FAIL light chart palette: adjacent CVD separation \d+\.\d under 8$/m),
    pass: () => contrastPasses(/adjacent CVD separation/) },
  { id: 'adjacent slots that look alike in normal vision fail', source: 'adjacent normal-vision separation',
    fail: async () => {
      expect((await contrastSame()).out).toMatch(/^FAIL light chart palette: adjacent normal-vision separation 0\.0 under 15$/m);
      // The red and green above look apart to a normal eye, so only the CVD line speaks there.
      expect((await contrastCvd()).out).not.toMatch(/adjacent normal-vision separation/);
    },
    pass: () => contrastPasses(/adjacent normal-vision separation/) },
  { id: 'a palette failure is relayed with its theme', source: 'chart palette: ${f}',
    fail: async () => expect(lines(await contrastDark(), /^FAIL dark chart palette: /).length).toBeGreaterThanOrEqual(3),
    pass: () => contrastPasses(/chart palette/) },
  { id: 'a custom property that refers to itself is refused', source: 'cycle at --${name}',
    fail: async () => {
      const r = await contrastRun([{ file: 'theme.dark', token: 'ink', change: cssOf('var(--ink)') }]);
      expect(r.err).toMatch(/cycle at --ink/);
      expect(r.status).not.toBe(0);
    },
    pass: () => contrastPasses(/cycle at/) },
  { id: 'a custom property that is not defined is refused', source: '--${name} is not defined',
    fail: async () => {
      const r = await contrastRun([{ file: 'theme.dark', token: 'ink-2', change: cssOf('var(--nope-token)') }]);
      expect(r.err).toMatch(/--nope-token is not defined/);
      expect(r.status).not.toBe(0);
    },
    pass: () => contrastPasses(/is not defined/) },
  { id: 'the exit code is 1 on any failure and 0 otherwise', source: 'process.exit(fails ? 1 : 0)',
    fail: async () => expect((await contrastDark()).status).toBe(1),
    pass: async () => expect((await contrastClean()).status).toBe(0) },
];

// ── The registry, the cases, and the completeness scan ───────────────────────────────────────────────
const SCRIPTS: Script[] = [
  { file: 'scripts/lib/sizes.ts', site: /throw new Error\(|problems\.push\(|KiB over its/, rules: SIZES_LIB },
  { file: 'scripts/sizes.ts', site: /\bfail\(|problems\.push\(|lines\.push\(`FAIL|for \(const p of [a-z]+\.problems\) lines\.push|console\.log\(`(?:FAIL|warn)|not-configured \(|return failed|htmlProblems\(got/, rules: SIZES_MAIN },
  { file: 'scripts/route-policy.ts', site: /throw new Error\(|console\.error\(|console\.log\(`(?:dynamic route|empty shell)|process\.exit\(bad|r\.kind === 'dynamic'/, rules: POLICY },
  { file: 'scripts/contrast.ts', site: /throw new Error\(|fails\.push\(|of (?:PAIRS|MIXES)\) report|\$\{ok \? 'ok|chart palette: \$\{f\}|process\.exit\(fails/, rules: CONTRAST },
];

/** The lines of a script's text where it can fail from, and not a comment about one. */
const sitesOf = (src: string, site: RegExp) =>
  src.split('\n').map((l, i) => ({ n: i + 1, l })).filter(({ l }) => site.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l));
const unclaimed = (src: string, s: Script) => sitesOf(src, s.site).filter(({ l }) => !s.rules.some((r) => l.includes(r.source))).map(({ n }) => n);

describe('every rule is listed once, with a failing and a passing way to show it', () => {
  for (const s of SCRIPTS) {
    it(s.file, () => {
      expect(new Set(s.rules.map((r) => r.id)).size).toBe(s.rules.length);
    });
  }
});

describe('every place a script can fail from belongs to a listed rule', () => {
  for (const s of SCRIPTS) {
    const src = fs.readFileSync(path.join(ROOT, s.file), 'utf8');
    it(`${s.file}: each rule's source is at a failure site`, () => {
      const at = sitesOf(src, s.site);
      for (const r of s.rules) expect(at.some(({ l }) => l.includes(r.source)), `${r.id}: ${s.file} no longer holds "${r.source}" at a failure site`).toBe(true);
    });
    it(`${s.file}: no failure site goes unclaimed`, () => {
      expect(unclaimed(src, s).map((n) => `${s.file}:${n} can fail from here and no rule claims it: ${src.split('\n')[n - 1].trim().slice(0, 120)}`)).toEqual([]);
    });
    it(`${s.file}: names a failure site planted in a copy of the script`, () => {
      const plant: Record<string, string> = {
        'scripts/lib/sizes.ts': "  problems.push('a rule nobody listed');",
        'scripts/sizes.ts': "  return fail('a rule nobody listed');",
        'scripts/route-policy.ts': "  console.error('a rule nobody listed');",
        'scripts/contrast.ts': "  fails.push('a rule nobody listed');",
      };
      const rows = src.split('\n');
      const at = Math.floor(rows.length / 2);
      const planted = [...rows.slice(0, at), plant[s.file], ...rows.slice(at)].join('\n');
      expect(unclaimed(planted, s)).toEqual([at + 1]);
    });
  }
});

for (const s of SCRIPTS) {
  describe(`${s.file}: each rule fails on its input and is silent on the corrected one`, () => {
    for (const r of s.rules) {
      it(`${r.id}: fails`, r.fail, 60_000);
      it(`${r.id}: passes`, r.pass, 60_000);
    }
  });
}
