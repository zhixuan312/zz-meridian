// @vitest-environment node
// The consumer smoke belongs to Meridian's own repository: a project made from it has no cli/, and its scripts/ changes
// are the release's managed files. This is the gate that stops test:t2 running a CLI that is not there (the adopted
// project's t2 found it: `cli/scripts/smoke.ts` was missing and the run failed instead of skipping).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { consumerSmokeKind } from '../scripts/lib/consumer-smoke.ts';

function project(withCli: boolean): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'consumer-smoke-'));
  fs.mkdirSync(path.join(root, 'scripts', 'lib'), { recursive: true });
  if (withCli) { fs.mkdirSync(path.join(root, 'cli', 'scripts'), { recursive: true }); fs.writeFileSync(path.join(root, 'cli', 'scripts', 'smoke.ts'), ''); }
  return root;
}

describe('the consumer smoke a change owes', () => {
  it('runs nothing in a checkout with no CLI, however its scripts/ changed', () => {
    const root = project(false);
    try {
      expect(consumerSmokeKind({ root, changed: ['scripts/navigate.ts', 'cli/src/migrations.ts'] })).toBeNull();
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  it('asks for the update half on cli/ or the update flow, the verify half on any other check, nothing on a document', () => {
    const root = project(true);
    try {
      expect(consumerSmokeKind({ root, changed: ['cli/src/migrations.ts'] })).toBe('update');
      // The shipped runner and its libraries run inside every project's test:release: only a created project proves them.
      expect(consumerSmokeKind({ root, changed: ['scripts/test-run.ts'] })).toBe('create');
      expect(consumerSmokeKind({ root, changed: ['scripts/lib/tier2.ts'] })).toBe('create');
      expect(consumerSmokeKind({ root, changed: ['scripts/lib/update-session.ts'] })).toBe('create');
      expect(consumerSmokeKind({ root, changed: ['scripts/navigate.ts'] })).toBe('verify');
      expect(consumerSmokeKind({ root, changed: ['docs/testing.md', 'CHANGELOG.md'] })).toBeNull();
      expect(consumerSmokeKind({ root, changed: [] })).toBeNull();
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});
