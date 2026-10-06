// @vitest-environment node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sha256 } from '../cli/src/files.ts';
import { start, type Context, type Release } from '../cli/src/session.ts';
import { packageDigest } from '../cli/src/update.ts';
import { parseJournal } from '../cli/src/update-session.ts';

const ui = (n: string) => `src/components/ui/${n}/index.tsx`;
const tmp: string[] = [];
afterEach(() => { for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });
const mk = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-apply-')); tmp.push(d); return d; };
const put = (root: string, files: Record<string, string>) => {
  for (const [p, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), c); }
};
const read = (root: string, p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const has = (root: string, p: string) => fs.existsSync(path.join(root, p));
const git = (root: string, ...a: string[]) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...a], { cwd: root, encoding: 'utf8' });

function release(version: string, files: Record<string, string>): Release {
  const tree = mk();
  put(tree, files);
  return { version, payload: Object.keys(files).sort(), tree, hashes: new Map(Object.entries(files).map(([p, c]) => [p, sha256(c)])), agents: null, changelog: `# Changelog\n\n## [${version}]\n\n- A test release.\n`, pkg: {} };
}
const BASE = { [ui('a')]: 'a1', [ui('b')]: 'b1', [ui('c')]: 'c1', [ui('d')]: 'd1', [ui('k')]: 'k1' };
const TARGET = { [ui('a')]: 'a2', [ui('b')]: 'b2', [ui('k')]: 'k2', [ui('e')]: 'e2', [ui('f')]: 'f2' };
const KEEP = [{ path: ui('k'), reason: 'Our loading treatment is deliberate.' }];

function project(o: { version?: string; disk?: Record<string, string>; absent?: string[]; recorded?: Record<string, string>; keep?: unknown; manifest?: string } = {}) {
  const root = mk();
  const recorded = { ...Object.fromEntries(Object.entries(BASE).map(([p, c]) => [p, sha256(c)])), 'src/app.config.ts': sha256('cfg'), ...o.recorded };
  put(root, {
    ...BASE, [ui('b')]: 'b-ours', [ui('d')]: 'd-ours', [ui('k')]: 'k-ours', [ui('f')]: 'f-team', 'src/app.config.ts': 'cfg',
    'package.json': '{\n  "name": "team-app"\n}\n',
    '.meridian/manifest.json': o.manifest ?? JSON.stringify({ version: o.version ?? '0.3.0', route: 'adopt', brand: { name: 'Acme' }, files: recorded }, null, 2) + '\n',
    ...o.disk,
  });
  for (const p of o.absent ?? []) fs.rmSync(path.join(root, p));
  if (o.keep !== undefined) put(root, { '.meridian/keep.json': JSON.stringify(o.keep) });
  git(root, 'init', '-q');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'the team project');
  return root;
}
function ctx(root: string, over: { base?: Release; target?: Release } = {}) {
  const lines: string[] = [];
  const base = over.base ?? release('0.3.0', BASE);
  const target = over.target ?? release('0.5.0', TARGET);
  const c: Context = { root, version: target.version, targetIntegrity: 'sha512-test', source: () => base, target: () => target, run: () => ({ status: 0, output: '' }), log: (l) => lines.push(l) };
  return { c, lines };
}
const session = (root: string) => path.join(root, '.meridian/update/0.5.0');
const opts = { dryRun: false, allowDirty: false, install: false, verbose: false };
const unchanged = (root: string) => {
  expect(has(root, '.meridian/update')).toBe(false);
  expect(has(root, '.meridian/update.lock')).toBe(false);
  expect(read(root, ui('a'))).toBe('a1');
  expect(git(root, 'status', '--porcelain')).toBe('');
};

describe('update applies what is safe and stages the rest', () => {
  it('writes, deletes, stages and keeps by the table, and keeps the original manifest', () => {
    const root = project({ keep: KEEP });
    const manifestBefore = read(root, '.meridian/manifest.json');
    const { c } = ctx(root);
    expect(start(c, opts)).toBe(2);
    expect(read(root, ui('a'))).toBe('a2');
    expect(has(root, ui('c'))).toBe(false);
    expect(read(root, ui('e'))).toBe('e2');
    expect(read(root, ui('b'))).toBe('b-ours');
    expect(read(root, ui('d'))).toBe('d-ours');
    expect(read(root, ui('f'))).toBe('f-team');
    expect(read(root, ui('k'))).toBe('k-ours');
    expect(read(root, 'src/app.config.ts')).toBe('cfg');
    expect(read(root, '.meridian/manifest.json')).toBe(manifestBefore);
    expect(has(root, '.meridian/update.lock')).toBe(false);

    const j = parseJournal(read(session(root), 'state.json'));
    const by = Object.fromEntries(j.operations.map((o) => [o.path, `${o.disposition}/${o.action}`]));
    expect(by).toMatchObject({
      [ui('a')]: 'untouched/write', [ui('b')]: 'edited/stage', [ui('c')]: 'removed/delete', [ui('d')]: 'removed/stage',
      [ui('e')]: 'added/write', [ui('f')]: 'collision/stage', [ui('k')]: 'kept/leave', 'src/app.config.ts': 'team-preserved/leave',
    });
    expect(j.phase).toBe('needs-resolution');
    expect(j.sourceVersion).toBe('0.3.0');
    expect(j.targetVersion).toBe('0.5.0');
    expect(j.targetIntegrity).toBe('sha512-test');
    const op = (p: string) => j.operations.find((o) => o.path === p)!;
    expect(op(ui('d')).target).toEqual({ exists: false, hash: null });
    expect(op(ui('f')).base).toEqual({ exists: false, hash: null });
    expect(op(ui('a')).applied).toBe(true);
    expect(op(ui('a')).appliedHash).toBe(sha256('a2'));

    const s = session(root);
    expect(read(s, `base/${ui('b')}`)).toBe('b1');
    expect(read(s, `ours/${ui('b')}`)).toBe('b-ours');
    expect(read(s, `new/${ui('b')}`)).toBe('b2');
    expect(read(s, `base/${ui('d')}`)).toBe('d1');
    expect(read(s, `ours/${ui('d')}`)).toBe('d-ours');
    expect(has(s, `new/${ui('d')}`)).toBe(false);
    expect(has(s, `base/${ui('f')}`)).toBe(false);
    expect(read(s, `ours/${ui('f')}`)).toBe('f-team');
    expect(read(s, `new/${ui('f')}`)).toBe('f2');
    expect(read(s, `backup/${ui('a')}`)).toBe('a1');
    expect(read(s, `backup/${ui('c')}`)).toBe('c1');
    expect(has(s, `backup/${ui('b')}`)).toBe(false);
    expect(JSON.parse(read(s, 'resolutions.json'))).toEqual([]);
    const merge = read(s, 'MERGE.md');
    for (const p of [ui('b'), ui('d'), ui('f'), ui('k')]) expect(merge).toContain(p);
    expect(merge).toContain('npx zz-meridian@0.5.0 update --finalize');
    expect(merge).toContain('## [0.5.0]');
  });

  it('writes a session and its report even with nothing to stage', () => {
    const root = project({ disk: { [ui('b')]: 'b1', [ui('d')]: 'd1', [ui('k')]: 'k1' }, absent: [ui('f')] });
    const { c, lines } = ctx(root);
    expect(start(c, opts)).toBe(2);
    expect(has(session(root), 'MERGE.md')).toBe(true);
    expect(lines.filter((l) => !l.startsWith('migration ')).length).toBeLessThanOrEqual(20);
    expect(lines.join('\n')).not.toContain(ui('a'));
  });

  it('lists every path with --verbose', () => {
    const root = project({ disk: { [ui('b')]: 'b1', [ui('d')]: 'd1', [ui('k')]: 'k1' }, absent: [ui('f')] });
    const { c, lines } = ctx(root);
    start(c, { ...opts, verbose: true });
    for (const p of [ui('a'), ui('b'), ui('c'), ui('d'), ui('e'), ui('f'), ui('k')]) expect(lines.join('\n')).toContain(p);
  });

  it('records a kept file that the target removed as retired, and leaves it', () => {
    const { [ui('k')]: _gone, ...withoutK } = TARGET;
    const root = project({ keep: KEEP });
    const { c } = ctx(root, { target: release('0.5.0', withoutK) });
    expect(start(c, opts)).toBe(2);
    const j = parseJournal(read(session(root), 'state.json'));
    expect(j.operations.find((o) => o.path === ui('k'))).toMatchObject({ disposition: 'retired-kept', action: 'leave' });
    expect(j.retired).toEqual([{ path: ui('k'), baselineHash: sha256('k1'), reason: KEEP[0].reason }]);
    expect(read(root, ui('k'))).toBe('k-ours');
  });

  it('writes nothing on a dry-run', () => {
    const root = project({ keep: KEEP });
    const { c, lines } = ctx(root);
    expect(start(c, { ...opts, dryRun: true })).toBe(0);
    unchanged(root);
    expect(lines.join('\n')).toMatch(/edited\s+src\/components\/ui\/b\/index\.tsx\s+merge required/);
    for (const harmless of [ui('a'), ui('c'), ui('e')]) expect(lines.join('\n')).not.toContain(harmless);
  });
});

describe('update refuses before writing anything', () => {
  it('on a dirty tree, unless allowed', () => {
    const root = project();
    fs.writeFileSync(path.join(root, 'src/app.config.ts'), 'cfg, uncommitted');
    expect(start(ctx(root).c, opts)).toBe(1);
    expect(has(root, '.meridian/update')).toBe(false);
    expect(read(root, ui('a'))).toBe('a1');
    expect(start(ctx(root).c, { ...opts, allowDirty: true })).toBe(2);
  });
  it('while another session is active', () => {
    const root = project();
    expect(start(ctx(root).c, opts)).toBe(2);
    const { c, lines } = ctx(root);
    expect(start(c, { ...opts, allowDirty: true })).toBe(1);
    expect(lines.join('\n')).toMatch(/session/);
  });
  it.each([
    ['a missing manifest', { absent: ['.meridian/manifest.json'] }],
    ['a manifest path that leaves the project', { recorded: { '../outside.ts': sha256('x') } }],
    ['a keep entry without a reason', { keep: [{ path: ui('k') }] }],
    ['a keep entry for a file Meridian never managed', { keep: [{ path: 'src/app.config.ts', reason: 'ours' }] }],
    ['a malformed manifest', { manifest: '{}' }],
    ['a source older than 0.3.0', { version: '0.2.0' }],
  ])('on %s', (_name, o) => {
    const root = project(o);
    expect(start(ctx(root).c, opts)).toBe(1);
    unchanged(root);
  });
  it('on a target that is not newer', () => {
    const root = project();
    expect(start(ctx(root, { target: release('0.3.0', TARGET) }).c, opts)).toBe(1);
    unchanged(root);
  });
  it('on a stale lock, which it names and never deletes', () => {
    const lock = JSON.stringify({ pid: 999999, startedAt: '2026-10-05T09:00:00Z' });
    const root = project({ disk: { '.meridian/update.lock': lock } });
    const { c, lines } = ctx(root);
    expect(start(c, opts)).toBe(1);
    expect(lines.join('\n')).toContain('update.lock');
    expect(read(root, '.meridian/update.lock')).toBe(lock);
    expect(read(root, ui('a'))).toBe('a1');
    expect(git(root, 'status', '--porcelain')).toBe('');
  });
  it('when a recorded file does not match the replayed base, naming it', () => {
    const root = project();
    const { c, lines } = ctx(root, { base: release('0.3.0', { ...BASE, [ui('a')]: 'a1, not as recorded' }) });
    expect(start(c, opts)).toBe(1);
    unchanged(root);
    expect(lines.join('\n')).toContain(ui('a'));
  });
});

describe('the package digest', () => {
  it('follows the code and the template, not package.json', () => {
    const dir = mk();
    put(dir, { 'dist/cli.js': 'run();\n', 'payload/src/lib/cn.ts': 'export const cn = 1;\n', 'package.json': '{"version":"0.5.0"}\n' });
    const first = packageDigest(dir);
    expect(first).toMatch(/^sha512-[A-Za-z0-9+/]+=*$/);
    fs.writeFileSync(path.join(dir, 'package.json'), '{"version":"0.5.0","_resolved":"x"}\n');
    expect(packageDigest(dir)).toBe(first);
    fs.writeFileSync(path.join(dir, 'payload/src/lib/cn.ts'), 'export const cn = 2;\n');
    expect(packageDigest(dir)).not.toBe(first);
  });
});
