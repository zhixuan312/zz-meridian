// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the template's own git index and the CLI's build script.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAYLOAD_EXCLUDE } from '../cli/scripts/build-payload.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('the payload exclusion', () => {
  it('leaves out the deep-DOM tests and their fixtures', () => {
    for (const f of ['tests/deep-dom.test.ts', 'tests/deep-checks.test.ts', 'scripts/fixtures/deep/server.ts', 'scripts/fixtures/deep/expected.json', 'scripts/fixtures/deep/blind-d37f8a8.txt', 'scripts/fixtures/deep/README.md']) {
      expect(PAYLOAD_EXCLUDE.test(f), f).toBe(true);
    }
  });

  it('leaves out every CLI and deep test, .ts and .tsx alike: they hold the sample\'s own figures and the CLI\'s own source', () => {
    for (const f of ['tests/cli-home-read.test.ts', 'tests/cli-customer-page.test.tsx', 'tests/cli-heatmap-preview.test.tsx', 'tests/deep-dom.test.tsx']) {
      expect(PAYLOAD_EXCLUDE.test(f), f).toBe(true);
    }
    const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((f) => f && fs.existsSync(path.join(ROOT, f)));
    expect(files.filter((f) => /^tests\/(cli|deep)-[^/]*$/.test(f) && !PAYLOAD_EXCLUDE.test(f))).toEqual([]);
  });

  it('still ships the helper the suites inject, and tests that are not the CLI\'s or the deep ones', () => {
    for (const f of ['scripts/lib/deep.ts', 'scripts/audit.ts', 'tests/format.test.ts', 'tests/shared-context.test.tsx', 'tests/deep.ts', 'tests/sub/deep-dom.test.ts', 'tests/sub/cli-home.test.tsx']) {
      expect(PAYLOAD_EXCLUDE.test(f), f).toBe(false);
    }
  });

  it('ships no file of the tree that names a deep test or a deep fixture', () => {
    const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((f) => f && fs.existsSync(path.join(ROOT, f)));
    const shipped = files.filter((f) => !PAYLOAD_EXCLUDE.test(f));
    expect(shipped.filter((f) => /^tests\/deep-[^/]*\.test\.ts$/.test(f) || f.startsWith('scripts/fixtures/deep/'))).toEqual([]);
    expect(shipped).toContain('scripts/lib/deep.ts');
  });
});
