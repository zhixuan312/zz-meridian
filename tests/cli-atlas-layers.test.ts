// @vitest-environment node
// Named cli-* so the payload leaves it out: it runs the Atlas's own listings and reads the Atlas's files.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const list = (script: string) => spawnSync(process.execPath, [script, '--atlas', '--list'], { cwd: ROOT, encoding: 'utf8' });

describe('the Atlas\'s browser checks', () => {
  it('reach the layer-5 entry, in the audit and in the vitals', () => {
    for (const script of ['scripts/audit.ts', 'scripts/vitals.ts']) {
      const r = list(script);
      expect(r.status, r.stderr).toBe(0);
      expect(r.stdout.split('\n'), script).toContain('/system/products/workspaces');
    }
  });

  it('still reach the template, once', () => {
    const routes = list('scripts/vitals.ts').stdout.split('\n');
    expect(routes.filter((l) => l === '/system/pages/template-records')).toEqual(['/system/pages/template-records']);
  });
});

describe('the Atlas\'s routes', () => {
  it('build a template\'s page with the cards\' and the pages\', not on its first request', () => {
    const params = read('app/system/(atlas)/[section]/[id]/page.tsx');
    expect(params.slice(params.indexOf('generateStaticParams'))).toMatch(/'template'/);
  });

  it('serve the layer-5 entry from a reading route of its own', () => {
    expect(fs.existsSync(path.join(ROOT, 'app/system/(atlas)/products/[id]/page.tsx'))).toBe(true);
  });
});

describe('a project that removes the Atlas', () => {
  it('keeps no test of the Atlas\'s content, which goes with it', () => {
    expect(read('scripts/brand.ts')).toContain("'tests/atlas-layers.test.ts'");
  });
});

describe('the Atlas, where it counts its layers', () => {
  it('counts six, numbered 0 to 5', () => {
    for (const file of ['app/system/(atlas)/page.tsx', 'src/system/strata.tsx', 'src/system/atlas-shell.tsx']) {
      expect(read(file), file).not.toMatch(/\bfive layers\b|numbered 0 to 4\b|\bsixty entries\b|six layers of React/i);
    }
    expect(read('app/system/(atlas)/page.tsx')).toMatch(/Six layers/);
    expect(read('src/system/atlas-shell.tsx')).toMatch(/numbered 0 to 5\b/);
  });
});
