// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const source = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

// The built app a run starts is for that run: the readiness probe, the browser, the assistant and the live run all
// reach it at 127.0.0.1. `next start` with no host binds every interface, so for the half hour a full run takes the
// app under test answered on the network (#81).
describe('the built app a run starts for itself (#81)', () => {
  it('starts bound to loopback', () => {
    expect(source('scripts/lib/bin.ts')).toContain("['start', '-H', '127.0.0.1', '-p', String(port)]");
  });
  for (const file of ['scripts/verify.ts', 'scripts/live.ts']) {
    it(`${file} starts it that one way`, () => {
      expect(source(file)).toContain('spawnNext(port, ');
      expect(source(file)).not.toMatch(/'start',/);
    });
  }
});
