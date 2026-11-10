// @vitest-environment node
// Attribution names the commits a page's own modules reached: a commit touching only page A's module lands on A and not
// on B, a module both pages import is shared and said once, and every row is the page's delta, never a commit's share.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { byChange, commitsTouching, pageGraph, pagesReached } from '../scripts/lib/attribution.ts';

function repo(): { root: string; base: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'attribution-'));
  const write = (rel: string, text: string) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  write('app/a/page.tsx', "import { a } from '../../src/a';\nimport { shared } from '../../src/shared';\nexport default [a, shared];\n");
  write('app/b/page.tsx', "import { b } from '../../src/b';\nimport { shared } from '../../src/shared';\nexport default [b, shared];\n");
  write('src/a.ts', 'export const a = 1;\n');
  write('src/b.ts', 'export const b = 2;\n');
  write('src/shared.ts', 'export const shared = 3;\n');
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd: root, encoding: 'utf8' });
  git('init', '-q');
  git('add', '-A');
  git('commit', '-qm', 'base');
  const base = git('rev-parse', 'HEAD').trim();
  write('src/a.ts', 'export const a = 10;\n');
  git('add', '-A');
  git('commit', '-qm', 'a only');
  write('src/shared.ts', 'export const shared = 30;\n');
  git('add', '-A');
  git('commit', '-qm', 'shared');
  return { root, base };
}

describe('what reached a page', () => {
  it('follows each page to its own modules and names a shared one once', () => {
    const { root } = repo();
    try {
      const graph = pageGraph(root);
      expect(graph.pages).toEqual(['/a', '/b']);
      expect(graph.modules.get('/a')).toContain('src/a.ts');
      expect(graph.modules.get('/a')).not.toContain('src/b.ts');
      expect(graph.shared.has('src/shared.ts')).toBe(true);
      expect(graph.shared.has('src/a.ts')).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('attributes a commit to the pages whose modules it touched, and marks the shared one as a candidate list', () => {
    const { root, base } = repo();
    try {
      const graph = pageGraph(root);
      const commits = commitsTouching(root, base, [...new Set(graph.pages.flatMap((p) => graph.modules.get(p) ?? []))]);
      expect(commits.map((c) => c.subject)).toEqual(['shared', 'a only']);
      expect(pagesReached(graph, commits.find((c) => c.subject === 'a only')!)).toEqual(['/a']);
      expect(pagesReached(graph, commits.find((c) => c.subject === 'shared')!)).toEqual(['/a', '/b']);

      const deltas = [
        { page: '/a', check: 'vitals.lcp', unit: 's', delta: 0.2 },
        { page: '/b', check: 'vitals.lcp', unit: 's', delta: 0.2 },
      ];
      const section = byChange(graph, commits, deltas);
      const shared = section.find((c) => c.subject === 'shared')!;
      expect(shared.pages.map((p) => p.page)).toEqual(['/a', '/b']);
      expect(shared.pages.every((p) => p.shared)).toBe(true);
      expect(shared.pages[0]!.note).toBe("page delta, not this commit's share");
      expect(shared.pages[0]!.values).toEqual([{ check: 'vitals.lcp', unit: 's', delta: 0.2 }]);
      // No total that pretends to be additive: the section carries rows only.
      expect(Object.keys(shared).sort()).toEqual(['pages', 'sha', 'subject']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
