// @vitest-environment node
// navigate's --timing takes on or off and nothing else, and says so before it reads a config or starts Chrome.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');

it('refuses a --timing that is neither on nor off, before anything starts', () => {
  const r = spawnSync(process.execPath, ['scripts/navigate.ts', '--timing', 'maybe'], { cwd: ROOT, encoding: 'utf8', timeout: 30_000 });
  expect(r.status).toBe(1);
  expect(`${r.stdout}${r.stderr}`).toContain('--timing must be on or off, got maybe');
});
