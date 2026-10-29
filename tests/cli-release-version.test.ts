// @vitest-environment node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');

// A prerelease passed set-version and the release workflow's own check, then met an update that refuses a running
// version not shaped 1.2.3 (cli/src/session.ts) and a publish with no dist-tag, 45 minutes of gates later.
describe('the release version', () => {
  it('is refused by set-version unless it is major.minor.patch', () => {
    const r = spawnSync(process.execPath, ['cli/scripts/set-version.ts', '0.36.0-rc.1'], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('"0.36.0-rc.1" is not a major.minor.patch version');
  });
  it('is checked the same way by the release workflow', () => {
    const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/release.yml'), 'utf8');
    expect(workflow).toContain('[[ "$VERSION" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+$ ]]');
  });
});
