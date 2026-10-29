// Named cli-* so the payload leaves it out with the tests that use it; not a test, so vitest does not collect it.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * A copy of the template in a folder of its own, for a test that runs the checks against a changed tree: every file git
 * tracks or would add, without cli/, and the repository's node_modules linked in. Removed after the calling file's tests.
 */
export function templateCopy(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const f of execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((x) => x && !x.startsWith('cli/'))) {
    const src = path.join(ROOT, f);
    if (!fs.lstatSync(src, { throwIfNoEntry: false })?.isFile()) continue;
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.copyFileSync(src, path.join(dir, f));
  }
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
  return dir;
}
