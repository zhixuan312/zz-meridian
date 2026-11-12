// @vitest-environment node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sha256 } from '../cli/src/files.ts';
import { abort, finalize, resume, start, type Context, type Release, type Run } from '../cli/src/session.ts';
import { parseJournal } from '../cli/src/update-session.ts';

const ui = (n: string) => `src/components/ui/${n}/index.tsx`;
const tmp: string[] = [];
afterEach(() => { for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });
const mk = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-session-')); tmp.push(d); return d; };
const put = (root: string, files: Record<string, string>) => {
  for (const [p, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), c); }
};
const read = (root: string, p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const has = (root: string, p: string) => fs.existsSync(path.join(root, p));
const git = (root: string, ...a: string[]) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...a], { cwd: root, encoding: 'utf8' });
const walk = (dir: string): string[] => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]) : [];

function release(version: string, files: Record<string, string>): Release {
  const tree = mk();
  put(tree, files);
  return { version, payload: Object.keys(files).sort(), tree, hashes: new Map(Object.entries(files).map(([p, c]) => [p, sha256(c)])), agents: null, changelog: '', pkg: {} };
}
const BASE = { [ui('a')]: 'a1', [ui('b')]: 'b1', [ui('c')]: 'c1', [ui('d')]: 'd1', [ui('k')]: 'k1' };
const TARGET = { [ui('a')]: 'a2', [ui('b')]: 'b2', [ui('k')]: 'k2', [ui('e')]: 'e2', [ui('f')]: 'f2' };
const SECRET = 'ASSISTANT_API_KEY=hunter2-secret';

function project(o: { disk?: Record<string, string>; absent?: string[] } = {}) {
  const root = mk();
  const recorded = { ...Object.fromEntries(Object.entries(BASE).map(([p, c]) => [p, sha256(c)])), 'src/app.config.ts': sha256('cfg') };
  put(root, {
    ...BASE, [ui('b')]: 'b-ours', [ui('d')]: 'd-ours', [ui('k')]: 'k-ours', [ui('f')]: 'f-team', 'src/app.config.ts': 'cfg',
    'package.json': '{\n  "name": "team-app"\n}\n', 'tsconfig.json': '{ "compilerOptions": { "incremental": true } }\n', '.gitignore': 'node_modules\n.env.local\n',
    '.meridian/keep.json': JSON.stringify([{ path: ui('k'), reason: 'Our loading treatment is deliberate.' }]),
    '.meridian/manifest.json': JSON.stringify({ version: '0.3.0', route: 'adopt', brand: { name: 'Acme' }, files: recorded }, null, 2) + '\n',
    ...o.disk,
  });
  for (const p of o.absent ?? []) fs.rmSync(path.join(root, p));
  git(root, 'init', '-q');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'the team project');
  put(root, { '.env.local': SECRET, 'node_modules/left-pad/index.js': 'module.exports = 1;' });
  return root;
}
function ctx(root: string, o: { run?: Run; version?: string; integrity?: string; interruptAfter?: number; base?: Release; target?: Release } = {}) {
  const lines: string[] = [];
  const base = o.base ?? release('0.3.0', BASE);
  const target = o.target ?? release('0.5.0', TARGET);
  const run: Run = (cmd, args, cwd) => o.run ? o.run(cmd, args, cwd) : { status: 0, output: '' };
  const c: Context = { root, version: o.version ?? '0.5.0', targetIntegrity: o.integrity ?? 'sha512-test', source: () => base, target: () => target, run, log: (l) => lines.push(l), interruptAfter: o.interruptAfter };
  return { c, lines };
}
const session = (root: string) => path.join(root, '.meridian/update/0.5.0');
const state = (root: string) => parseJournal(read(session(root), 'state.json'));
const manifest = (root: string) => JSON.parse(read(root, '.meridian/manifest.json'));
const opts = { dryRun: false, allowDirty: false, install: true, verbose: false };
const current = (root: string, p: string) => (has(root, p) ? sha256(fs.readFileSync(path.join(root, p))) : null);
const resolveAll = (root: string) => fs.writeFileSync(path.join(session(root), 'resolutions.json'), JSON.stringify(
  [[ui('b'), 'Ours is deliberate.'], [ui('d'), 'We still use it.'], [ui('f'), 'Ours is a different badge; we renamed nothing.']]
    .map(([p, reason]) => ({ id: `file:${p}`, status: 'resolved', reason, files: { [p]: current(root, p) } })),
));
const isTests = (args: string[]) => args.some((a) => a.endsWith('scripts/test-run.ts'));
const isBuild = (args: string[]) => args.includes('build');

describe('finalize', () => {
  it('waits for every resolution, then validates, writes the target baseline and archives the report', () => {
    const root = project();
    expect(start(ctx(root).c, opts)).toBe(2);
    const pending = ctx(root);
    expect(finalize(pending.c)).toBe(2);
    expect(pending.lines.join('\n')).toContain(`file:${ui('b')}`);
    expect(manifest(root).version).toBe('0.3.0');

    resolveAll(root);
    const done = ctx(root);
    expect(finalize(done.c)).toBe(0);
    const m = manifest(root);
    expect(m.version).toBe('0.5.0');
    expect(m.files).toEqual(Object.fromEntries(Object.entries(TARGET).map(([p, c]) => [p, sha256(c)])));
    expect(done.lines.join('\n')).toMatch(/tests: the Tier 1 tests affected by the change, the static checks and the type check passed/);
    expect(has(root, '.meridian/update/0.5.0')).toBe(false);
    const [archived] = fs.readdirSync(path.join(root, '.meridian/history/0.5.0'));
    const h = path.join(root, '.meridian/history/0.5.0', archived);
    expect(parseJournal(read(h, 'state.json')).phase).toBe('complete');
    for (const f of ['MERGE.md', 'resolutions.json']) expect(has(h, f)).toBe(true);
    for (const d of ['base', 'ours', 'new', 'backup']) expect(has(h, d)).toBe(false);
    expect(read(root, ui('b'))).toBe('b-ours');
    expect(read(root, ui('k'))).toBe('k-ours');
    expect(read(root, 'src/app.config.ts')).toBe('cfg');
  });

  it('refuses a resolution made stale by a later edit', () => {
    const root = project();
    start(ctx(root).c, opts);
    resolveAll(root);
    fs.writeFileSync(path.join(root, ui('b')), 'b-ours, edited again');
    const { c, lines } = ctx(root);
    expect(finalize(c)).toBe(2);
    expect(lines.join('\n')).toContain(ui('b'));
    expect(manifest(root).version).toBe('0.3.0');
  });

  it.each([
    ['replacement', ui('a'), 'a-edited-after-apply'],
    ['addition', ui('e'), 'e-edited-after-apply'],
    ['removal', ui('c'), 'c-recreated-after-apply'],
  ])('does not finalize a changed automatic %s', (_kind, file, bytes) => {
    const root = project();
    start(ctx(root).c, opts);
    resolveAll(root);
    put(root, { [file]: bytes });
    const commands: string[][] = [];
    const done = ctx(root, { run: (_cmd, args) => { commands.push(args); return { status: 0, output: '' }; } });
    expect(finalize(done.c)).toBe(2);
    expect(done.lines.join('\n')).toContain(`${file}: changed after the update applied it`);
    expect(commands).toEqual([]);
    expect(read(root, file)).toBe(bytes);
    expect(manifest(root).version).toBe('0.3.0');
    expect(has(session(root), 'backup')).toBe(true);
    if (Object.hasOwn(TARGET, file)) put(root, { [file]: TARGET[file] });
    else fs.unlinkSync(path.join(root, file));
    expect(finalize(ctx(root).c)).toBe(0);
  });

  it('keeps the session when a check fails, and completes on the retry', () => {
    const root = project();
    start(ctx(root).c, opts);
    resolveAll(root);
    expect(finalize(ctx(root, { run: (_c, a) => ({ status: isTests(a) ? 1 : 0, output: 'types fail' }) }).c)).toBe(1);
    expect(state(root).phase).toBe('failed');
    expect(manifest(root).version).toBe('0.3.0');
    expect(finalize(ctx(root).c)).toBe(0);
  });

  it('fails, keeps the current bytes and names the path when a check changes a protected input', () => {
    const root = project();
    start(ctx(root).c, opts);
    resolveAll(root);
    const writer: Run = (_c, a) => { if (isTests(a)) fs.writeFileSync(path.join(root, 'src/app.config.ts'), 'cfg, rewritten by a check'); return { status: 0, output: '' }; };
    expect(finalize(ctx(root, { run: writer }).c)).toBe(1);
    expect(read(root, 'src/app.config.ts')).toBe('cfg, rewritten by a check');
    expect(state(root).phase).toBe('failed');
    expect(state(root).failure).toContain('src/app.config.ts');
    expect(manifest(root).version).toBe('0.3.0');
  });

  it('keeps literal dollar sequences in a failed input path when updating the human report', () => {
    const file = "owned-$&-$`-$'.txt";
    const root = project({ disk: { [file]: 'before' } });
    start(ctx(root).c, opts);
    resolveAll(root);
    const writer: Run = (_c, args) => {
      if (isTests(args)) fs.writeFileSync(path.join(root, file), 'changed by validation');
      return { status: 0, output: '' };
    };
    expect(finalize(ctx(root, { run: writer }).c)).toBe(1);
    const failure = state(root).failure;
    expect(failure).toContain(file);
    expect(read(session(root), 'MERGE.md')).toContain(failure!);
    expect(manifest(root).version).toBe('0.3.0');
  });

  it('accepts the outputs a build is expected to write', () => {
    const root = project();
    start(ctx(root).c, opts);
    resolveAll(root);
    const builder: Run = (_c, a) => {
      if (isBuild(a)) put(root, { '.next/BUILD_ID': 'x', 'next-env.d.ts': '/// <reference types="next" />\n', 'tsconfig.tsbuildinfo': '{}', 'out/verify.txt': 'ok' });
      return { status: 0, output: '' };
    };
    expect(finalize(ctx(root, { run: builder }).c)).toBe(0);
  });

  it('refuses an output folder that is a symbolic link', () => {
    const root = project();
    start(ctx(root).c, opts);
    resolveAll(root);
    const linker: Run = (_c, a) => { if (isBuild(a)) fs.symlinkSync(path.join(root, 'src'), path.join(root, '.next')); return { status: 0, output: '' }; };
    expect(finalize(ctx(root, { run: linker }).c)).toBe(1);
    expect(state(root).failure).toContain('.next');
    expect(manifest(root).version).toBe('0.3.0');
  });

  it('carries a retired kept file through finalize and into the next update', () => {
    const { [ui('k')]: _gone, ...withoutK } = TARGET;
    const root = project();
    expect(start(ctx(root, { target: release('0.5.0', withoutK) }).c, opts)).toBe(2);
    resolveAll(root);
    expect(finalize(ctx(root, { target: release('0.5.0', withoutK) }).c)).toBe(0);
    expect(manifest(root).files[ui('k')]).toBeUndefined();
    expect(read(root, ui('k'))).toBe('k-ours');
    const [archived] = fs.readdirSync(path.join(root, '.meridian/history/0.5.0'));
    expect(parseJournal(read(path.join(root, '.meridian/history/0.5.0', archived), 'state.json')).retired.map((r) => r.path)).toEqual([ui('k')]);
    const next = ctx(root, { version: '0.5.1', base: release('0.5.0', withoutK), target: release('0.5.1', withoutK) });
    expect(start(next.c, { ...opts, allowDirty: true })).not.toBe(1);
    // What this case is about is that the retired kept file does not become the next update's problem: the next
    // session leaves it as the team's own, neither a collision nor a removal, and the file is still theirs. (The session
    // does come back needing resolution, as any update over a project with local edits does, so its return code says
    // nothing about the retirement.)
    const k = parseJournal(read(path.join(root, '.meridian/update/0.5.1'), 'state.json')).operations.filter((o) => o.path === ui('k'));
    expect(k.map((o) => [o.disposition, o.action])).toEqual([['team-preserved', 'leave']]);
    expect(read(root, ui('k'))).toBe('k-ours');
  });

  it('never copies a secret, a dependency or the repository into the session or the history', () => {
    const root = project();
    const logs: string[] = [];
    const logged = (o: Parameters<typeof ctx>[1] = {}) => { const x = ctx(root, o); return { ...x, c: { ...x.c, log: (l: string) => { logs.push(l); x.lines.push(l); } } }; };
    start(logged().c, opts);
    const check = () => {
      expect(logs.length).toBeGreaterThan(0);
      for (const l of logs) { expect(l).not.toContain('hunter2-secret'); expect(l).not.toContain(sha256(SECRET).slice('sha256-'.length)); }
      for (const f of walk(path.join(root, '.meridian'))) {
        expect(fs.readFileSync(f, 'utf8'), f).not.toContain('hunter2-secret');
        expect(fs.readFileSync(f, 'utf8'), f).not.toContain(sha256(SECRET).slice('sha256-'.length));
        expect(f).not.toMatch(/[\\/](\.git|node_modules)[\\/]/);
      }
    };
    check();
    resolveAll(root);
    expect(finalize(logged().c)).toBe(0);
    check();
  });

  it('reports a failed install, records its exit code and keeps the secret out of the session', () => {
    const root = project();
    const failing: Run = (cmd, args) => (args[0] === 'install' ? { status: 1, output: `${cmd} install failed: registry unreachable` } : { status: 0, output: '' });
    const { c, lines } = ctx(root, { run: failing });
    const code = start(c, opts);
    expect(code).not.toBe(0);
    expect(lines.join('\n')).toMatch(/install exited with 1/);
    expect(state(root).validation[0]).toMatchObject({ exitCode: 1, evidenceFile: 'evidence/0-install.log' });
    expect(read(session(root), 'evidence/0-install.log')).toContain('registry unreachable');
    expect(manifest(root).version).toBe('0.3.0');
    expect(lines.join('\n')).not.toContain('hunter2-secret');
  });

  it('belongs to the version and package that started the session', () => {
    const root = project();
    start(ctx(root).c, opts);
    resolveAll(root);
    const other = ctx(root, { version: '0.5.1' });
    expect(finalize(other.c)).toBe(1);
    expect(other.lines.join('\n')).toContain('0.5.0');
    expect(finalize(ctx(root, { integrity: 'sha512-other' }).c)).toBe(1);
    expect(manifest(root).version).toBe('0.3.0');
  });

  it('completes a zero-conflict update in one command', () => {
    const root = project({ disk: { [ui('b')]: 'b1', [ui('d')]: 'd1', [ui('k')]: 'k1', '.meridian/keep.json': '[]' }, absent: [ui('f')] });
    const { c, lines } = ctx(root);
    expect(start(c, opts)).toBe(0);
    expect(manifest(root).version).toBe('0.5.0');
    expect(lines.join('\n')).toMatch(/tests: the Tier 1 tests affected by the change, the static checks and the type check passed/);
  });
});

describe('a deliberate deletion', () => {
  const keepOf = (root: string) => JSON.parse(read(root, '.meridian/keep.json')) as { path: string; reason: string }[];
  /** The template's files as the recorded release had them, with one managed card removed and nothing else changed. */
  const clean = () => project({ disk: { [ui('b')]: 'b1', [ui('d')]: 'd1', [ui('k')]: 'k1', '.meridian/keep.json': '[]' }, absent: [ui('a'), ui('f')] });

  it('is recorded once as kept deleted, and no later update stages it again', () => {
    const root = clean();
    expect(start(ctx(root).c, opts)).toBe(0);
    expect(has(root, ui('a'))).toBe(false);
    expect(keepOf(root)).toEqual([{ path: ui('a'), reason: 'deleted by the team; found absent at update to 0.5.0' }]);
    const merge = fs.readdirSync(path.join(root, '.meridian/history/0.5.0')).map((d) => read(root, `.meridian/history/0.5.0/${d}/MERGE.md`)).join('\n');
    expect(merge).toContain(`${ui('a')}: kept deleted`);
    expect(merge).toMatch(/remove its entry and run the update again/);

    // The next release ships the same files: the register explains the absence, and nothing is staged or added again.
    const next = ctx(root, { version: '0.6.0', base: release('0.5.0', TARGET), target: release('0.6.0', TARGET) });
    expect(start(next.c, { ...opts, allowDirty: true })).toBe(0);
    expect(has(root, ui('a'))).toBe(false);
    expect(keepOf(root)).toHaveLength(1);
  }, 60_000);

  it('is taken back out of the register when the update is aborted', () => {
    const root = clean();
    const { c } = ctx(root);
    expect(start(c, { ...opts, install: false })).toBe(2);
    expect(keepOf(root)).toHaveLength(1);
    expect(abort(ctx(root).c)).toBe(0);
    expect(keepOf(root)).toEqual([]);
    expect(has(root, ui('a'))).toBe(false);
  }, 60_000);

  it('restores the file on the next update once its keep entry is removed', () => {
    const root = clean();
    expect(start(ctx(root).c, opts)).toBe(0);
    expect(has(root, ui('a'))).toBe(false);
    fs.writeFileSync(path.join(root, '.meridian/keep.json'), '[]\n');
    const next = ctx(root, { version: '0.6.0', base: release('0.5.0', TARGET), target: release('0.6.0', TARGET) });
    expect(start(next.c, { ...opts, allowDirty: true })).toBe(0);
    expect(read(root, ui('a'))).toBe('a2');
    expect(keepOf(root)).toEqual([]);
  }, 60_000);
});

describe('a managed file on the create route', () => {
  /**
   * `create` writes the payload, then brands it for a product: brand.ts removes the Design Atlas and its tests, and the
   * manifest records only what it kept. A release replayed by the update runs the same `create`, so its hashes hold
   * exactly what the project received — the payload alone does not.
   */
  const branded = (version: string, files: Record<string, string>, removed: string[]) => {
    const kept = Object.fromEntries(Object.entries(files).filter(([p]) => !removed.includes(p)));
    const r = release(version, kept);
    return { ...r, payload: [...r.payload, ...removed].sort() };
  };
  const release2 = { ...BASE, 'tests/atlas.test.tsx': 'atlas1' };
  const target2 = { ...TARGET, 'tests/atlas.test.tsx': 'atlas2' };
  const created = () => {
    const root = mk();
    const disk = Object.fromEntries(Object.entries(release2).filter(([p]) => p !== 'tests/atlas.test.tsx'));
    put(root, {
      ...disk,
      'package.json': '{\n  "name": "team-app"\n}\n', 'tsconfig.json': '{ "compilerOptions": { "incremental": true } }\n', '.gitignore': 'node_modules\n.env.local\n',
      '.meridian/manifest.json': JSON.stringify({ version: '0.3.0', route: 'create', brand: { name: 'Acme' }, files: Object.fromEntries(Object.entries(disk).map(([p, c]) => [p, sha256(c)])) }, null, 2) + '\n',
    });
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'created with 0.3.0');
    return root;
  };

  it('never delivered is left alone, while a test the target release adds is delivered', () => {
    const root = created();
    const base = branded('0.3.0', release2, ['tests/atlas.test.tsx']);
    const target = branded('0.5.0', { ...target2, 'tests/new.test.tsx': 'new2' }, ['tests/atlas.test.tsx']);
    expect(start(ctx(root, { base, target }).c, opts)).toBe(0);
    expect(has(root, 'tests/atlas.test.tsx')).toBe(false);
    expect(Object.keys(manifest(root).files)).not.toContain('tests/atlas.test.tsx');
    expect(read(root, 'tests/new.test.tsx')).toBe('new2');
    expect(has(root, '.meridian/keep.json')).toBe(false);

    // The next release still ships it, and it is still not added: the rule reads the replayed release, not progress.
    const next = ctx(root, { version: '0.6.0', base: target, target: { ...target, version: '0.6.0' } });
    expect(start(next.c, { ...opts, allowDirty: true })).toBe(0);
    expect(has(root, 'tests/atlas.test.tsx')).toBe(false);
  }, 60_000);

  it('delivered but never recorded, then deleted, is recorded as a deletion and restored once its entry is removed', () => {
    // A project `create` made before 0.29.0: the test was written by `create`, and the manifest recorded no test but
    // `tests/setup.ts`. The team has since deleted this one.
    const root = created();
    const gone = ['tests/atlas.test.tsx'];
    const files = { ...release2, 'tests/old.test.tsx': 'old1' };
    const later = { ...target2, 'tests/old.test.tsx': 'old2', 'tests/new.test.tsx': 'new2' };
    expect(start(ctx(root, { base: branded('0.3.0', files, gone), target: branded('0.5.0', later, gone) }).c, opts)).toBe(0);
    expect(has(root, 'tests/old.test.tsx')).toBe(false);
    expect(JSON.parse(read(root, '.meridian/keep.json'))).toEqual([{ path: 'tests/old.test.tsx', reason: 'deleted by the team; found absent at update to 0.5.0' }]);
    expect(Object.keys(manifest(root).files)).not.toContain('tests/old.test.tsx');

    fs.writeFileSync(path.join(root, '.meridian/keep.json'), '[]\n');
    const next = ctx(root, { version: '0.6.0', base: branded('0.5.0', later, gone), target: branded('0.6.0', later, gone) });
    expect(start(next.c, { ...opts, allowDirty: true })).toBe(0);
    expect(read(root, 'tests/old.test.tsx')).toBe('old2');

    // Deleted again once restored, it is a new deletion to record, not another restore.
    fs.rmSync(path.join(root, 'tests/old.test.tsx'));
    const again = ctx(root, { version: '0.7.0', base: branded('0.6.0', later, gone), target: branded('0.7.0', later, gone) });
    expect(start(again.c, { ...opts, allowDirty: true })).toBe(0);
    expect(has(root, 'tests/old.test.tsx')).toBe(false);
    expect(JSON.parse(read(root, '.meridian/keep.json'))).toEqual([{ path: 'tests/old.test.tsx', reason: 'deleted by the team; found absent at update to 0.7.0' }]);
  }, 60_000);
});

describe('resume', () => {
  it('takes over a stale lock after reading the journal', () => {
    const root = project();
    start(ctx(root, { interruptAfter: 1 }).c, opts);
    fs.writeFileSync(path.join(root, '.meridian/update.lock'), JSON.stringify({ pid: 999999, startedAt: '2026-10-05T09:00:00Z' }));
    expect(resume(ctx(root).c, { install: true, verbose: false })).toBe(2);
    expect(has(root, '.meridian/update.lock')).toBe(false);
  });
  it('continues an interrupted apply', () => {
    const root = project();
    expect(start(ctx(root, { interruptAfter: 1 }).c, opts)).toBe(1);
    expect(state(root).phase).toBe('applying');
    expect(state(root).operations.filter((o) => o.applied)).toHaveLength(1);
    expect(resume(ctx(root).c, { install: true, verbose: false })).toBe(2);
    expect(read(root, ui('a'))).toBe('a2');
    expect(has(root, ui('c'))).toBe(false);
    expect(read(root, ui('e'))).toBe('e2');
  });
  it('keeps the lockfile preimage a killed install left behind, not the one it rewrote', () => {
    // A lockfile the team had, and what an install killed mid-write leaves in its place.
    const PRISTINE = '{"lockfileVersion": 3, "ours": true}\n';
    const HALF = '{"lockfileVersion": 3, "half": true}\n';
    const DONE = '{"lockfileVersion": 3, "done": true}\n';
    const root = project({ disk: { 'package-lock.json': PRISTINE } });
    // The install is killed after it has rewritten the lockfile: the run throws, the process is gone, and the journal
    // never got as far as recording the change. The session holds the one copy of what the file was.
    const killed = ctx(root, { run: (_cmd, args) => { if (args.includes('install')) { fs.writeFileSync(path.join(root, 'package-lock.json'), HALF); throw new Error('killed'); } return { status: 0, output: '' }; } });
    expect(start(killed.c, opts)).toBe(1);
    expect(read(root, 'package-lock.json')).toBe(HALF);
    expect(has(root, '.meridian/update/0.5.0/backup/package-lock.json')).toBe(true);
    // The resumed install finishes the job, and the lockfile changes a second time.
    const again = ctx(root, { run: (_cmd, args) => { if (args.includes('install')) fs.writeFileSync(path.join(root, 'package-lock.json'), DONE); return { status: 0, output: '' }; } });
    resume(again.c, { install: true, verbose: false });
    const op = state(root).operations.find((o) => o.path === 'package-lock.json');
    // Ours is what the *team's* lockfile was, so an abort restores that and not the half-written one a killed install
    // left: the preimage is the backup the first run took before running it, not whatever the project holds now.
    expect(op?.base.hash).toBe(sha256(PRISTINE));
  });

  it('never overwrites an edit made after the interruption', () => {
    const root = project();
    start(ctx(root, { interruptAfter: 1 }).c, opts);
    put(root, { [ui('e')]: 'e, written by the team meanwhile' });
    const { c, lines } = ctx(root);
    expect(resume(c, { install: true, verbose: false })).toBe(1);
    expect(read(root, ui('e'))).toBe('e, written by the team meanwhile');
    expect(lines.join('\n')).toContain(ui('e'));
  });
});

describe('abort', () => {
  it('restores the preimages, removes what the update added and keeps the original manifest', () => {
    const root = project();
    start(ctx(root).c, opts);
    expect(abort(ctx(root).c)).toBe(0);
    expect(read(root, ui('a'))).toBe('a1');
    expect(read(root, ui('c'))).toBe('c1');
    expect(has(root, ui('e'))).toBe(false);
    expect(read(root, ui('b'))).toBe('b-ours');
    expect(manifest(root).version).toBe('0.3.0');
    expect(has(root, '.meridian/update/0.5.0')).toBe(false);
    const [archived] = fs.readdirSync(path.join(root, '.meridian/history/0.5.0'));
    expect(parseJournal(read(path.join(root, '.meridian/history/0.5.0', archived), 'state.json')).phase).toBe('aborted');
  });
  it('aborts an interrupted update, restoring only what was applied', () => {
    const root = project();
    expect(start(ctx(root, { interruptAfter: 1 }).c, opts)).toBe(1);
    expect(abort(ctx(root).c)).toBe(0);
    expect(read(root, ui('a'))).toBe('a1');
    expect(read(root, ui('c'))).toBe('c1');
    expect(has(root, ui('e'))).toBe(false);
    expect(manifest(root).version).toBe('0.3.0');
  });
  it('aborts an update whose install never ran', () => {
    const root = project();
    expect(start(ctx(root).c, { ...opts, install: false })).toBe(2);
    expect(abort(ctx(root).c)).toBe(0);
    expect(read(root, ui('a'))).toBe('a1');
  });
  it('refuses to roll back over a later edit and keeps the backups', () => {
    const root = project();
    start(ctx(root).c, opts);
    fs.writeFileSync(path.join(root, ui('a')), 'a, edited after the update');
    const { c, lines } = ctx(root);
    expect(abort(c)).toBe(1);
    expect(read(root, ui('a'))).toBe('a, edited after the update');
    expect(lines.join('\n')).toContain(ui('a'));
    expect(read(session(root), `backup/${ui('a')}`)).toBe('a1');
  });
});

describe('a project already on the running version', () => {
  it('has nothing to update: it says so, writes nothing and exits 0, in a dry run and a real one', () => {
    for (const dryRun of [true, false]) {
      const root = project();
      const { c, lines } = ctx(root, { version: '0.3.0' });
      expect(start(c, { ...opts, dryRun })).toBe(0);
      expect(lines.join('\n')).toContain('already at 0.3.0; nothing to update');
      expect(has(root, '.meridian/update')).toBe(false);
    }
  });

  // Between releases nothing else looks: the gate checks that a kept path is managed, not that an edited managed file
  // is kept, so a product drifted silently and the next update met edits nobody had a reason for (issue #23).
  it('names the managed files that differ from the release and are in no keep register', () => {
    const root = project();
    const { c, lines } = ctx(root, { version: '0.3.0' });
    expect(start(c, { ...opts, dryRun: true })).toBe(0);
    const out = lines.join('\n');
    expect(out).toContain('2 managed files differ from the release and are not in .meridian/keep.json');
    for (const edited of [ui('b'), ui('d')]) expect(out).toContain(edited);
    for (const fine of [ui('a'), ui('c'), ui('k'), ui('f')]) expect(out).not.toContain(fine);
  });

  it('adds nothing when every managed file is as released or kept', () => {
    const root = project({ disk: { [ui('b')]: 'b1', [ui('d')]: 'd1' } });
    const { c, lines } = ctx(root, { version: '0.3.0' });
    expect(start(c, { ...opts, dryRun: true })).toBe(0);
    expect(lines.join('\n')).not.toContain('differ from the release');
  });
});

