// @vitest-environment node
// The release workflow's job graph: the consumer smoke ran inside `gates`, and the two together outlived the job's
// 120-minute clock in run 42600180906 — `gates` alone takes 76 minutes on the 4-CPU runner, and the smoke runs a
// dashboard's release suite of the same size. Each is its own job on its own clock, beside each other, and `publish`
// waits for both. The consumer job holds no credential: only `publish` may request the npm OIDC token.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const YML = fs.readFileSync(path.join(ROOT, '.github/workflows/release.yml'), 'utf8');

/** Each job of the `jobs:` section as its own text, keyed by name: the lines under its two-space key. */
function jobs(): Map<string, string> {
  const out = new Map<string, string>();
  let current: string | null = null;
  let inside = false;
  for (const line of YML.split('\n')) {
    if (/^jobs:\s*$/.test(line)) {
      inside = true;
      continue;
    }
    if (!inside) continue;
    const job = /^  ([a-z][\w-]*):\s*$/.exec(line);
    if (job) {
      current = job[1]!;
      out.set(current, '');
      continue;
    }
    if (/^\S/.test(line)) current = null; // a top-level key ends the section
    else if (current) out.set(current, out.get(current)! + line + '\n');
  }
  return out;
}

describe('the release workflow', () => {
  it('runs the consumer smoke as its own job, beside gates', () => {
    const j = jobs();
    expect([...j.keys()]).toEqual(['build', 'gates', 'consumer', 'publish', 'release']);
    expect(j.get('gates')).toMatch(/^    needs: build$/m);
    expect(j.get('consumer')).toMatch(/^    needs: build$/m);
    // The smoke moved out of gates, not out of the workflow.
    expect(j.get('gates')).not.toContain('smoke.ts');
    expect(j.get('consumer')).toContain('node cli/scripts/smoke.ts --tarball "$T" --adopt --create --update');
    expect(j.get('consumer')).toMatch(/^          name: tarball$/m);
  });

  it('gives each job its own clock, above the suite it drives', () => {
    const j = jobs();
    for (const name of ['build', 'gates', 'consumer', 'publish', 'release']) {
      expect(j.get(name), name).toMatch(/^    timeout-minutes: \d+$/m);
    }
    // The runner's own release suite took 76 minutes (run 42600180906); neither job may be capped below that.
    for (const name of ['gates', 'consumer']) {
      const minutes = Number(/^    timeout-minutes: (\d+)$/m.exec(j.get(name)!)?.[1]);
      expect(minutes, name).toBeGreaterThanOrEqual(90);
    }
  });

  it('publishes only after the build, the gates and the consumer path, and tags last', () => {
    const j = jobs();
    expect(j.get('publish')).toMatch(/^    needs: \[build, gates, consumer\]$/m);
    expect(j.get('release')).toMatch(/^    needs: \[build, publish\]$/m);
  });

  it('gives only publish a credential', () => {
    const j = jobs();
    expect(j.get('consumer')).not.toMatch(/^\s*(environment|permissions):/m);
    expect(j.get('consumer')).not.toContain('id-token');
    expect(j.get('consumer')).not.toContain('secrets.');
    expect(j.get('gates')).not.toContain('id-token');
    expect(j.get('publish')).toContain('id-token: write');
    expect(j.get('publish')).toMatch(/^    environment: npm\b/m);
  });

  it("keeps a failed consumer run's own output, so a red names its cause", () => {
    const consumer = jobs().get('consumer')!;
    expect(consumer).toMatch(/^      - uses: actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7\.0\.1$/m);
    expect(consumer).toMatch(/^        if: always\(\)$/m);
    expect(consumer).toMatch(/^          name: consumer-test$/m);
    expect(consumer).toMatch(/^          path: out\/$/m);
    expect(consumer).toMatch(/^          if-no-files-found: ignore$/m);
  });
});
