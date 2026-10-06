// @vitest-environment node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sha256 } from '../cli/src/files.ts';
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
const TARGET = { [ui('a')]: 'a2', [ui('b')]: 'b2' };

/** An adopted 0.3.0 project whose team edited one Meridian file, so the update stages it and waits for finalize. */
function project() {
  const root = mk();
  put(root, {
    [ui('a')]: 'a1', [ui('b')]: 'b-ours', 'package.json': '{\n  "name": "team-app"\n}\n', '.gitignore': 'node_modules\n',
    '.meridian/manifest.json': JSON.stringify({ version: '0.3.0', route: 'adopt', brand: { name: 'Acme' }, files: Object.fromEntries(Object.entries(BASE).map(([p, c]) => [p, sha256(c)])) }, null, 2) + '\n',
  });
  git(root, 'init', '-q');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'the team project');
  return root;
}
function ctx(root: string, verifyStatus = 0) {
  const lines: string[] = [];
  const calls: string[][] = [];
  const run: Run = (_cmd, args) => {
    calls.push(args);
    return args.some((a) => a.endsWith('scripts/verify.ts')) ? { status: verifyStatus, output: 'ok   gate (9.1s)\ncoverage: default; browser ran; 3 routes; data configured 3/3; interaction configured 3/3; not run: audit, presses, keyboard, assistant, live, vitals, perf\n' } : { status: 0, output: '' };
  };
  const c: Context = { root, version: '0.5.0', targetIntegrity: 'sha512-test', source: () => release('0.3.0', BASE), target: () => release('0.5.0', TARGET), run, log: (l) => lines.push(l) };
  return { c, lines, calls };
}
const resolve = (root: string) => fs.writeFileSync(path.join(root, '.meridian/update/0.5.0/resolutions.json'), JSON.stringify([
  { id: `file:${ui('b')}`, status: 'resolved', reason: 'Ours is deliberate.', files: { [ui('b')]: sha256(fs.readFileSync(path.join(root, ui('b')))) } },
]));
const checks = (calls: string[][]) => calls.map((a) => a.find((x) => /scripts\/(gate|verify)\.ts$/.test(x)) ?? (a.includes('build') ? 'build' : null)).filter(Boolean);
const opts = { dryRun: false, allowDirty: false, install: true, verbose: false };

describe('update --finalize --verify', () => {
  it('validates with one default verify in place of the separate gate and build, and says what it covered', () => {
    const root = project();
    expect(start(ctx(root).c, opts)).toBe(2);
    resolve(root);
    const done = ctx(root);
    expect(finalize(done.c, { verify: true }), done.lines.join('\n')).toBe(0);
    expect(checks(done.calls)).toEqual(['scripts/verify.ts']);
    expect(done.lines.join('\n')).toMatch(/^coverage: default; browser ran; 3 routes/m);
    expect(done.lines.join('\n')).not.toMatch(/browser: not run/);
    expect(done.lines.join('\n')).toMatch(/outcome: complete/);
  });
  it('fails the session when verify fails, as a failing gate does', () => {
    const root = project();
    start(ctx(root).c, opts);
    resolve(root);
    const bad = ctx(root, 1);
    expect(finalize(bad.c, { verify: true })).toBe(1);
    expect(bad.lines.join('\n')).toMatch(/verify exited with 1/);
    expect(JSON.parse(fs.readFileSync(path.join(root, '.meridian/manifest.json'), 'utf8')).version).toBe('0.3.0');
  });
  it('keeps the gate and the build for a plain finalize', () => {
    const root = project();
    start(ctx(root).c, opts);
    resolve(root);
    const plain = ctx(root);
    expect(finalize(plain.c, { verify: false })).toBe(0);
    expect(checks(plain.calls)).toEqual(['scripts/gate.ts', 'build']);
  });
});
