// @vitest-environment node
// What the release workflow guarantees that its job graph does not: who holds a credential, that the consumer's
// failure output is kept, and that every job has a clock. The graph itself (which jobs exist, what each needs) is
// asserted by tests/cli-release-graph.test.ts. Only `publish` may request the npm OIDC token; only `publish`, `release`
// and `tier2-attach` may write to the repository.
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
  it('gives the consumer no credential', () => {
    const consumer = jobs().get('consumer')!;
    expect(consumer).not.toMatch(/^\s*(environment|permissions):/m);
    expect(consumer).not.toContain('id-token');
    expect(consumer).not.toContain('secrets.');
  });

  it('lets no job but publish, release and tier2-attach hold id-token or contents: write', () => {
    for (const [name, text] of jobs()) {
      if (['publish', 'release', 'tier2-attach'].includes(name)) continue;
      expect(text, name).not.toContain('id-token');
      expect(text, name).not.toMatch(/contents:\s*write/);
    }
    const publish = jobs().get('publish')!;
    expect(publish).toContain('id-token: write');
    expect(publish).toMatch(/^    environment: npm\b/m);
  });

  it("keeps a failed consumer run's own output, so a red names its cause", () => {
    const consumer = jobs().get('consumer')!;
    expect(consumer).toMatch(/^      - uses: actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7\.0\.1$/m);
    expect(consumer).toMatch(/^        if: always\(\)$/m);
    expect(consumer).toMatch(/^          name: consumer-test$/m);
    expect(consumer).toMatch(/^          path: out\/$/m);
    expect(consumer).toMatch(/^          if-no-files-found: ignore$/m);
  });

  it('gives every job its own clock', () => {
    for (const [name, text] of jobs()) expect(text, name).toMatch(/^    timeout-minutes: \d+$/m);
  });
});
