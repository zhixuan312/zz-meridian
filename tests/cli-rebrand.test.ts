// @vitest-environment node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sha256 } from '../cli/src/files.ts';
import { mergeBrand, rebrand, type RebrandContext } from '../cli/src/rebrand.ts';

const tmp: string[] = [];
afterEach(() => { for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });
const mk = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-rebrand-')); tmp.push(d); return d; };
const put = (root: string, files: Record<string, string>) => {
  for (const [p, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), c); }
};
const git = (root: string, ...a: string[]) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...a], { cwd: root, encoding: 'utf8' });
const walk = (dir: string, rel = ''): string[] => fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((e) => {
  const p = rel ? `${rel}/${e.name}` : e.name;
  return e.name === '.git' ? [] : e.isDirectory() ? walk(dir, p) : [p];
});
const snapshot = (root: string) => Object.fromEntries(walk(root).map((p) => [p, fs.readFileSync(path.join(root, p), 'utf8')]));

/** What a replay of this release writes for a brand: the accent decides the resolver and the stylesheet; hex adds a preset file. */
function files(brand: Record<string, string>): Record<string, string> {
  const accent = brand.hex ? 'brand' : brand.accent ?? 'indigo';
  return {
    'tokens/zz-meridian.resolver.json': `{"default":"${accent}"}\n`,
    'src/styles/tokens.css': `--accent: ${accent};\n`,
    ...(brand.hex ? { 'tokens/accent.brand.tokens.json': `{"hex":"${brand.hex}"}\n` } : {}),
    'src/components/ui/a/index.tsx': 'export const a = 1;\n',
  };
}
const replay = (brand: Record<string, string>) => {
  const tree = mk();
  const f = files(brand);
  put(tree, f);
  return { tree, hashes: new Map(Object.entries(f).map(([p, c]) => [p, sha256(c)])), payload: ['tokens/zz-meridian.resolver.json', 'src/styles/tokens.css', 'src/components/ui/a/index.tsx'] };
};
const OLD = { name: 'Acme', accent: 'indigo' };

function project(o: { disk?: Record<string, string>; recorded?: Record<string, string> } = {}) {
  const root = mk();
  const f = files(OLD);
  const recorded = { ...Object.fromEntries(Object.entries(f).map(([p, c]) => [p, sha256(c)])), ...o.recorded };
  put(root, {
    ...f, 'src/components/ui/a/index.tsx': 'export const a = 2; // our edit\n', 'src/app.config.ts': "export const app = { name: 'Acme' };\n",
    '.meridian/manifest.json': JSON.stringify({ version: '0.5.0', route: 'adopt', brand: OLD, files: recorded }, null, 2) + '\n',
    ...o.disk,
  });
  git(root, 'init', '-q');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'the team project');
  return root;
}
function ctx(root: string, over: Partial<RebrandContext> = {}): RebrandContext {
  return {
    root, version: '0.5.0', replay,
    brandConfig: (text, change) => { if (text.includes('UNSUPPORTED')) throw new Error('src/app.config.ts has no accent'); return `${text}// rebranded ${JSON.stringify(change)}\n`; },
    log: () => {}, ...over,
  };
}
const manifest = (root: string) => JSON.parse(fs.readFileSync(path.join(root, '.meridian/manifest.json'), 'utf8'));

describe('mergeBrand', () => {
  it('replaces the whole accent choice and keeps the rest', () => {
    expect(mergeBrand({ name: 'Acme', accent: 'jade' }, { hex: '#2E6BE4' })).toEqual({ name: 'Acme', hex: '#2E6BE4' });
    expect(mergeBrand({ name: 'Acme', hex: '#111111' }, { accent: 'jade' })).toEqual({ name: 'Acme', accent: 'jade' });
    expect(mergeBrand({ name: 'Acme', theme: 'dark' }, { name: 'Beta' })).toEqual({ name: 'Beta', theme: 'dark' });
  });
});

describe('rebrand', () => {
  it('rewrites the brand outputs and records the brand and its baseline together', () => {
    const root = project();
    expect(rebrand(ctx(root), { hex: '#2E6BE4' }, { allowDirty: false })).toBe(0);
    const m = manifest(root);
    const next = files({ name: 'Acme', hex: '#2E6BE4' });
    expect(m.brand).toEqual({ name: 'Acme', hex: '#2E6BE4' });
    for (const p of ['tokens/zz-meridian.resolver.json', 'src/styles/tokens.css', 'tokens/accent.brand.tokens.json']) {
      expect(m.files[p], p).toBe(sha256(next[p]));
      expect(fs.readFileSync(path.join(root, p), 'utf8'), p).toBe(next[p]);
    }
    expect(m.files['src/components/ui/a/index.tsx']).toBe(sha256('export const a = 1;\n'));
    expect(fs.readFileSync(path.join(root, 'src/components/ui/a/index.tsx'), 'utf8')).toBe('export const a = 2; // our edit\n');
    expect(fs.readFileSync(path.join(root, 'src/app.config.ts'), 'utf8')).toContain('rebranded');
  });
  it.each([
    ['an edited brand output', { disk: { 'src/styles/tokens.css': '--accent: ours;\n' } }, {}],
    ['an app configuration branding cannot read', { disk: { 'src/app.config.ts': '// UNSUPPORTED\n' } }, {}],
    ['a pending update', { disk: { '.meridian/update/0.5.1/state.json': '{}' } }, {}],
    ['a version other than the manifest\'s', {}, { version: '0.5.1' }],
    ['a manifest the replay does not reproduce', { recorded: { 'src/styles/tokens.css': sha256('something else') } }, {}],
  ] as const)('refuses %s and changes nothing', (_name, o, over) => {
    const root = project(o as never);
    const before = snapshot(root);
    expect(rebrand(ctx(root, over as Partial<RebrandContext>), { hex: '#2E6BE4' }, { allowDirty: false })).toBe(1);
    expect(snapshot(root)).toEqual(before);
  });
  it('does nothing when the brand is already the one asked for', () => {
    const root = project();
    const before = snapshot(root);
    expect(rebrand(ctx(root), { accent: 'indigo' }, { allowDirty: false })).toBe(0);
    expect(snapshot(root)).toEqual(before);
  });
});
