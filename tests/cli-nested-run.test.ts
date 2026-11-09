// @vitest-environment node
// A failing consumer run has to name its cause. Run 42646698631's consumer printed only the last 40 lines of stderr —
// a passing test's simulated provider failure, `act()` warnings — and hid `test:release: FAIL:` and vitest's counts.
// The smoke now keeps the whole output in out/ and prints these lines instead.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { causeLines, writeNestedRun } from '../cli/scripts/nested-run.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

// The shapes vitest 5's default reporter and scripts/test-run.ts print, as a captured run shows them: the verdict and
// the counts on stdout, the failing file on stderr.
const STDOUT = [
  'not run Postgres tests: MERIDIAN_POSTGRES_URL is not set',
  ' Test Files  1 failed | 511 passed (512)',
  '      Tests  1 failed | 3335 passed (3336)',
  'test:release: FAIL: a test failed',
].join('\n');
const STDERR = [
  'stderr | tests/assistant-errors.test.ts > a provider failure, in plain words > anything else says the provider could not be reached',
  'TypeError: fetch failed for sk-ant-very-secret-value',
  ' FAIL  tests/assistant-errors.test.ts > a provider failure, in plain words > anything else says the provider could not be reached',
  'A component suspended inside an `act` scope, but the `act` call was not awaited.',
].join('\n');

describe("a nested run's cause", () => {
  it('keeps the verdict, the failing file and the counts, and drops the stderr noise', () => {
    expect(causeLines(STDOUT, STDERR)).toEqual([
      ' Test Files  1 failed | 511 passed (512)',
      '      Tests  1 failed | 3335 passed (3336)',
      'test:release: FAIL: a test failed',
      ' FAIL  tests/assistant-errors.test.ts > a provider failure, in plain words > anything else says the provider could not be reached',
    ]);
  });

  it('writes both streams whole, where the workflows upload them', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nested-run-'));
    try {
      const files = writeNestedRun(dir, 'consumer-test-release', { stdout: STDOUT, stderr: STDERR });
      expect(files).toEqual(['consumer-test-release.stdout.txt', 'consumer-test-release.stderr.txt']);
      expect(fs.readFileSync(path.join(dir, files[0]!), 'utf8')).toBe(STDOUT);
      expect(fs.readFileSync(path.join(dir, files[1]!), 'utf8')).toBe(STDERR);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is what the smoke calls when the created dashboard fails', () => {
    const smoke = fs.readFileSync(path.join(ROOT, 'cli/scripts/smoke.ts'), 'utf8');
    expect(smoke).toContain("writeNestedRun(path.join(ROOT, 'out'), 'consumer-test-release', t)");
    expect(smoke).toContain('causeLines(t.stdout, t.stderr)');
  });
});
