// @vitest-environment node
// A project created before the tiers holds its own copy of tests/verify-suite-outcome.test.ts, which calls
// finalOutcome(true, []). The update must say so: without a migration its gate failed at the type check and the test.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { RELEASE_MIGRATIONS } from '../cli/src/migrations.ts';

const made: string[] = [];
const project = (files: Record<string, string>) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-tiers-'));
  made.push(root);
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
};
afterAll(() => { for (const r of made) fs.rmSync(r, { recursive: true, force: true }); });
const m = () => RELEASE_MIGRATIONS.find((x) => x.id === 'verify-tiers')!;
const IMPORT = "import { finalOutcome } from '../scripts/lib/coverage.ts';\n";

describe('the verify-tiers migration', () => {
  it('is declared for the release after 0.16.3 and asks for the gate', () => {
    expect(m()).toBeDefined();
    expect(m().since).toBe('0.16.4');
    expect(m().checks).toEqual(['gate']);
  });
  it('finds a test that calls finalOutcome with a boolean', () => {
    const root = project({ 'tests/verify-suite-outcome.test.ts': `${IMPORT}finalOutcome(true, []);\nfinalOutcome(false, ['audit']);\n` });
    expect(m().applies(root)).toEqual(['tests/verify-suite-outcome.test.ts']);
  });
  it('leaves a file that passes the tiers, and a project that never calls it', () => {
    expect(m().applies(project({ 'tests/verify-suite-outcome.test.ts': `${IMPORT}finalOutcome({ full: true, timed: true }, []);\n` }))).toBeNull();
    expect(m().applies(project({ 'package.json': '{}' }))).toBeNull();
  });
  it('finds nothing in this repository', () => {
    expect(m().applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
  });
});
