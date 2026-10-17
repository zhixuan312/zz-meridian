// @vitest-environment node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAYLOAD_EXCLUDE } from '../cli/scripts/build-payload.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
/** A project may hold its own files to this many lines over `src`, `app`, `scripts` and `tests` (issue #41). */
const CEILING = 700;

/**
 * No source file Meridian ships into a project passes the line ceiling a project may enforce over its own: a managed file
 * cannot be split by the project, because an update restores it, so one past the ceiling fails that project's rule on a
 * file it may not change.
 */
describe('the shipped source files stay under the line ceiling', () => {
  it(`every shipped file under src, app, scripts and tests has at most ${CEILING} lines`, () => {
    const files = execFileSync('git', ['ls-files', '-z', 'src', 'app', 'scripts', 'tests'], { cwd: ROOT }).toString('utf8').split('\0')
      .filter((f) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(f) && !PAYLOAD_EXCLUDE.test(f) && fs.existsSync(path.join(ROOT, f)));
    expect(files.length).toBeGreaterThan(100);
    const over = files.map((f) => ({ f, n: fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').length })).filter(({ n }) => n > CEILING);
    expect(over.map(({ f, n }) => `${f}: ${n} lines`)).toEqual([]);
  });
});
