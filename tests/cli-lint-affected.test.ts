// @vitest-environment node
// A change is linted as it is checked: `test:t1` runs eslint over the source files a change touches, because a lint error
// reached master through a run that checked types but never linted (the drawer's `react-hooks/refs`, b54c5d7b). Lint is
// Tier 3, so the run names what it found and exits nothing: `record` (scripts/lib/summary.ts) is what decides that, and
// `tests/cli-reported-checks.test.ts` holds it.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { bin } from '../scripts/lib/bin.ts';
import { lintTargets } from '../scripts/lib/lint.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('the lint step of a per-change run', () => {
  it('reads the source files of a change and leaves documents and generated output out', () => {
    expect(lintTargets([
      'src/components/base/shell/index.tsx',
      'scripts/navigate.ts',
      'tests/cli-lint-affected.test.ts',
      'docs/testing.md',
      'CHANGELOG.md',
      'cli/payload/scripts/test-run.ts',
      'cli/dist/cli.js',
      'out/report.txt',
      '.next/types/routes.d.ts',
      'src/components/base/shell/index.tsx',
    ])).toEqual(['scripts/navigate.ts', 'src/components/base/shell/index.tsx', 'tests/cli-lint-affected.test.ts']);
  });

  it('runs eslint as `test:t1` runs it, with the real tool on a real violation', () => {
    // The wiring is the runner's own line; the failure is the real tool on a real violation, with the same arguments.
    expect(fs.readFileSync(path.join(ROOT, 'scripts/test-run.ts'), 'utf8')).toContain('lintTargets(present)');
    const probe = path.join(ROOT, 'tests', 'lint-probe.test.ts');
    fs.writeFileSync(probe, '// @vitest-environment node\nconst unused = 1;\nexport const value = 2;\n');
    try {
      const r = spawnSync(bin('eslint'), [...lintTargets(['tests/lint-probe.test.ts']), '--ignore-pattern', '.meridian/'], { cwd: ROOT, encoding: 'utf8' });
      expect(r.status, r.stdout + r.stderr).not.toBe(0);
    } finally {
      fs.rmSync(probe, { force: true });
    }
  });
});
