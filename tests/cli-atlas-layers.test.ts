// @vitest-environment node
// Named cli-* so the payload leaves it out: it runs the Atlas's own listings.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
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
