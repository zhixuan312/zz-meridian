// @vitest-environment node
// verify's suite vocabulary is one exported list, in the order the coverage line prints it, and verify builds from it.
import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import { SUITE_NAMES } from '../scripts/lib/coverage.ts';

const verify = fs.readFileSync(path.resolve(import.meta.dirname, '../scripts/verify.ts'), 'utf8');

it('exports every suite name verify can list, in the coverage line order', () => {
  expect([...SUITE_NAMES]).toEqual(['audit', 'presses', 'keyboard', 'assistant', 'browserChecks', 'timing', 'live', 'vitals', 'perf']);
});

it('is the only place the suite names are written: verify builds its list from it', () => {
  expect(verify).toMatch(/\bSUITE_NAMES\b/);
  expect(verify).not.toMatch(/\[\s*'audit',\s*'presses'/);
});
