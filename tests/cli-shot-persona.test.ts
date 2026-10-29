// @vitest-environment node
// A visual review of every page as each persona needs shot.ts to sign in as one (#50).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');

it('refuses a persona the config does not declare, before Chrome starts', () => {
  const r = spawnSync(process.execPath, ['scripts/shot.ts', '/', '--as', 'nobody', '--base', 'http://127.0.0.1:9'], { cwd: ROOT, encoding: 'utf8', timeout: 30_000 });
  expect(r.status).toBe(1);
  expect(`${r.stdout}${r.stderr}`).toMatch(/shot: --as nobody is not a declared persona\. Declared personas: /);
});

it('refuses an option given no value, rather than shooting without it', () => {
  const r = spawnSync(process.execPath, ['scripts/shot.ts', '/', '--base', 'http://127.0.0.1:9', '--as'], { cwd: ROOT, encoding: 'utf8', timeout: 30_000 });
  expect(r.status).toBe(1);
  expect(`${r.stdout}${r.stderr}`).toMatch(/shot: --as needs a value/);
});

it("hands the persona's cookie to each page it opens", () => {
  const source = fs.readFileSync(path.join(ROOT, 'scripts/shot.ts'), 'utf8');
  expect(source).toMatch(/\.open\([^)]*cookie/);
});
