// @vitest-environment node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { payloadBytes, sha256 } from '../cli/src/files.ts';
import { finalize, start, type Context, type Release, type Run } from '../cli/src/session.ts';

const ui = (n: string) => `src/components/ui/${n}/index.tsx`;
const tmp: string[] = [];
afterEach(() => { for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });
const mk = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-fv-')); tmp.push(d); return d; };
const put = (root: string, files: Record<string, string>) => { for (const [p, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), c); } };
const git = (root: string, ...a: string[]) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...a], { cwd: root, encoding: 'utf8' });
function release(version: string, files: Record<string, string>): Release {
  const tree = mk();
  put(tree, files);
  return { version, payload: Object.keys(files).sort(), tree, hashes: new Map(Object.entries(files).map(([p, c]) => [p, sha256(c)])), agents: null, changelog: '', pkg: {} };
}
const BASE = { [ui('a')]: 'a1', [ui('b')]: 'b1' };
/** The release's own size baseline, as a created project inherits it: the team-owned file the payload ships. */
const RELEASED_BASELINE = payloadBytes('scripts/verify.baseline.json').toString('utf8');
const TARGET = { [ui('a')]: 'a2', [ui('b')]: 'b2', 'scripts/verify.baseline.json': RELEASED_BASELINE };

/** An adopted 0.3.0 project whose team edited one Meridian file, so the update stages it and waits for finalize. */
function project(extra: Record<string, string> = {}) {
  const root = mk();
  put(root, {
    [ui('a')]: 'a1', [ui('b')]: 'b-ours', 'package.json': '{\n  "name": "team-app"\n}\n', '.gitignore': 'node_modules\n',
    '.meridian/manifest.json': JSON.stringify({ version: '0.3.0', route: 'adopt', brand: { name: 'Acme' }, files: Object.fromEntries(Object.entries(BASE).map(([p, c]) => [p, sha256(c)])) }, null, 2) + '\n',
    ...extra,
  });
  git(root, 'init', '-q');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'the team project');
  return root;
}
const PPR = 'export default { cacheComponents: true, partialPrefetching: true };\n';
const ownBaseline = (route: string) => JSON.stringify({ method: 'route-bundle-stats firstLoadChunkPaths, deduplicated, uncompressed bytes', recordedBy: 'sizes.ts', routes: { [route]: 500 * 1024 } }, null, 2) + '\n';
function ctx(root: string, verifyStatus = 0) {
  const lines: string[] = [];
  const ran: string[] = [];
  const run: Run = (_cmd, args) => {
    ran.push(args.join(' '));
    return args[0] === 'scripts/test-run.ts'
      ? { status: verifyStatus, output: 'test:t1: 12 test files, 90 tests (3 changed files since the last green run)\n' }
      : { status: 0, output: '' };
  };
  const c: Context = { root, version: '0.5.0', targetIntegrity: 'sha512-test', source: () => release('0.3.0', BASE), target: () => release('0.5.0', TARGET), run, log: (l) => lines.push(l) };
  return { c, lines, ran };
}
const resolve = (root: string) => fs.writeFileSync(path.join(root, '.meridian/update/0.5.0/resolutions.json'), JSON.stringify([
  { id: `file:${ui('b')}`, status: 'resolved', reason: 'Ours is deliberate.', files: { [ui('b')]: sha256(fs.readFileSync(path.join(root, ui('b')))) } },
]));
const opts = { dryRun: false, allowDirty: false, install: true, verbose: false };

describe('update --finalize', () => {
  it('validates with test:t1 and one build, and reports the checks the project cannot be judged on as not run', () => {
    // An adopted project keeps its own Next config, which sets neither flag the route policy presupposes, and has no
    // size baseline of its own: both checks are reported, never counted as passed and never failed.
    const root = project();
    expect(start(ctx(root).c, opts)).toBe(2);
    resolve(root);
    const done = ctx(root);
    expect(finalize(done.c), done.lines.join('\n')).toBe(0);
    expect(done.lines.join('\n')).toMatch(/^tests: the Tier 1 tests affected by the change and the static checks passed; lint and the type check reported$/m);
    expect(done.lines.join('\n')).toMatch(/^build: the production build passed$/m);
    expect(done.lines.join('\n')).toMatch(/^not run route policy: the project's next\.config sets no cacheComponents and partialPrefetching, which the route policy presupposes \(see the cache-components-config item in MERGE\.md\)$/m);
    expect(done.lines.join('\n')).toMatch(/^not run sizes: the project has no scripts\/verify\.baseline\.json; /m);
    expect(done.lines.join('\n')).toMatch(/outcome: complete/);
    // The bounded scope, and never the release suite: its browser sweeps and timed suites are the team's own gate.
    expect(done.ran).toEqual(['scripts/test-run.ts t1', 'node_modules/next/dist/bin/next build']);
    expect(done.ran.some((r) => /release/.test(r))).toBe(false);
  });
  it('judges the route policy when the project sets both flags, and only a size baseline it recorded itself', () => {
    const root = project({ 'next.config.ts': PPR, 'scripts/verify.baseline.json': ownBaseline('/') });
    start(ctx(root).c, opts);
    resolve(root);
    const done = ctx(root);
    expect(finalize(done.c), done.lines.join('\n')).toBe(0);
    expect(done.ran).toEqual(['scripts/test-run.ts t1', 'node_modules/next/dist/bin/next build', 'scripts/route-policy.ts', 'scripts/sizes.ts']);
    expect(done.lines.join('\n')).toMatch(/^build: the production build, the route policy and the size checks passed$/m);
    expect(done.lines.join('\n')).not.toMatch(/^not run (route policy|sizes):/m);
  });
  it('does not judge size growth against a baseline the project inherited from the release', () => {
    // Byte for byte the release's own baseline, and a baseline that carries no recording: neither is known to be the
    // project's own, so growth is not judged against either.
    const cases: [string, RegExp][] = [
      [RELEASED_BASELINE, /^not run sizes: scripts\/verify\.baseline\.json is the release's, not the project's; /m],
      ['{ "method": "x", "routes": { "/": 1 } }\n', /^not run sizes: scripts\/verify\.baseline\.json carries no sizes\.ts recording, so it is not known to be the project's; /m],
    ];
    for (const [baseline, line] of cases) {
      const root = project({ 'scripts/verify.baseline.json': baseline });
      start(ctx(root).c, opts);
      resolve(root);
      const done = ctx(root);
      expect(finalize(done.c), done.lines.join('\n')).toBe(0);
      expect(done.lines.join('\n')).toMatch(line);
      expect(done.ran).not.toContain('scripts/sizes.ts');
    }
  });
  it('fails the session when the tests fail', () => {
    const root = project();
    start(ctx(root).c, opts);
    resolve(root);
    const bad = ctx(root, 1);
    expect(finalize(bad.c)).toBe(1);
    expect(bad.lines.join('\n')).toMatch(/tests exited with 1/);
    expect(JSON.parse(fs.readFileSync(path.join(root, '.meridian/manifest.json'), 'utf8')).version).toBe('0.3.0');
  });
});
