// @vitest-environment node
// Named cli-* so the payload leaves it out: it runs the package's own adopt command.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { adopt } from '../cli/src/adopt.ts';

const dirs: string[] = [];
afterAll(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

/** A Next.js App Router project, on Meridian at `version` when one is given: its manifest says so. */
function meridianProject(version: string | null, route: 'adopt' | 'create' = 'adopt') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-adopt-again-'));
  dirs.push(root);
  const put = (rel: string, text: string) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  put('package.json', JSON.stringify({ name: 'acme', dependencies: { next: '16.0.0', react: '19.0.0' } }));
  put('app/layout.tsx', 'export default function Layout({ children }) { return children; }\n');
  put('src/components/base/shell/index.tsx', 'export const Shell = () => null; // the team edited it\n');
  if (version) put('.meridian/manifest.json', JSON.stringify({ version, route, brand: {}, files: {} }));
  return root;
}

describe('adopt in a project that is already on Meridian', () => {
  it('refuses in one line that names the release and points at update, before it judges the tree, and writes nothing', () => {
    for (const route of ['adopt', 'create'] as const) {
      const root = meridianProject('0.34.0', route);
      const errors: string[] = [];
      const spy = vi.spyOn(console, 'error').mockImplementation((m) => { errors.push(String(m)); });
      const before = fs.readFileSync(path.join(root, 'src/components/base/shell/index.tsx'), 'utf8');
      // The fixture is no git repository, so a tree judged first would be refused for that instead.
      expect(adopt({ root, brand: {}, allowDirty: false, install: false }), route).toBe(1);
      spy.mockRestore();
      expect(errors.join('\n'), route).toMatch(/already on Meridian 0\.34\.0.*update/);
      expect(errors.join('\n'), route).not.toMatch(/already exist with other content/);
      expect(fs.readFileSync(path.join(root, 'src/components/base/shell/index.tsx'), 'utf8')).toBe(before);
    }
  });

  it('refuses a project not yet on Meridian whose tree has uncommitted changes, for them', () => {
    const root = meridianProject(null);
    const git = (...args: string[]) => execFileSync('git', ['-c', 'user.email=a@b', '-c', 'user.name=a', ...args], { cwd: root, stdio: 'pipe' });
    git('init', '-q');
    git('add', '-A');
    git('commit', '-qm', 'init');
    fs.writeFileSync(path.join(root, 'notes.md'), 'not committed\n');
    const errors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((m) => { errors.push(String(m)); });
    expect(adopt({ root, brand: {}, allowDirty: false, install: false })).toBe(1);
    spy.mockRestore();
    expect(errors.join('\n')).toMatch(/uncommitted changes/);
  });
});
