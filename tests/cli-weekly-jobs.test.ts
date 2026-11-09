// @vitest-environment node
// weekly's consumer job runs the same smoke as release.yml, and now runs a dashboard created from the tarball through
// its own `test:release` too: weekly never did, so the release's created-suite failure had no run that could reproduce
// it where publishing is impossible. The smoke writes a failed nested run's whole output into out/, which this job
// already uploads.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const YML = fs.readFileSync(path.join(ROOT, '.github/workflows/weekly.yml'), 'utf8');

/** One job of the `jobs:` section as its own text: the lines under its two-space key, up to the next one. */
function job(name: string): string {
  const lines = YML.split('\n');
  const start = lines.indexOf(`  ${name}:`);
  expect(start, name).toBeGreaterThanOrEqual(0);
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^  \S/.test(line)) break;
    out.push(line);
  }
  return out.join('\n');
}

describe('the weekly consumer job', () => {
  it('runs a dashboard created from the tarball through its own test:release', () => {
    expect(job('consumer')).toContain('node cli/scripts/smoke.ts --tarball "$(ls /tmp/pack/zz-meridian-*.tgz)" --adopt --create --update --origins 3 --update-all --verify');
  });

  it('uploads out/, where a failed nested run is kept', () => {
    const consumer = job('consumer');
    expect(consumer).toMatch(/^      - uses: actions\/upload-artifact@[a-f0-9]+ # v[\d.]+$/m);
    expect(consumer).toMatch(/^        if: always\(\)$/m);
    expect(consumer).toMatch(/^          name: consumer$/m);
    expect(consumer).toMatch(/^          path: out\/$/m);
  });
});
