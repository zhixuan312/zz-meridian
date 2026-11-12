// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { testsNaming } from '../scripts/test-run.ts';

// The import graph knows a module a test imports. It cannot see a script a test execs or a file it reads by path, so the
// tests that name the path are selected too (a change to scripts/brand.ts once left its own consumer unrun).
describe('the tests a changed path selects', () => {
  it('includes a test that names a script it runs, with no import edge', () => {
    expect(testsNaming('scripts/brand.ts')).toContain('tests/cli-brand-atlas-config.test.ts');
  });

  it('includes a test that names the configuration it reads', () => {
    expect(testsNaming('scripts/verify.config.ts')).toContain('tests/cli-navigation-coverage.test.ts');
  });
});
