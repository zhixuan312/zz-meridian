// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the CLI's own view of `.meridian/update/`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { sessionDirs } from '../cli/src/session.ts';

/**
 * A session folder is something `update` opened. The same directory holds whatever a person's tools leave beside it, and
 * one of those read as a session is a version that does not exist: a project with Finder's `.DS_Store` in
 * `.meridian/update/` reported a session of version `.DS_Store` and prescribed `npx zz-meridian@.DS_Store update --resume`,
 * which refused — leaving no way forward short of deleting the file by hand.
 */
describe('the sessions a project holds', () => {
  const dirs: string[] = [];
  const project = (...entries: { name: string; dir?: boolean }[]) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'session-dirs-'));
    dirs.push(root);
    const base = path.join(root, '.meridian', 'update');
    fs.mkdirSync(base, { recursive: true });
    for (const e of entries) {
      if (e.dir) fs.mkdirSync(path.join(base, e.name), { recursive: true });
      else fs.writeFileSync(path.join(base, e.name), 'not a session\n');
    }
    return root;
  };
  afterAll(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

  it('is empty when the project has no update folder at all', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'session-dirs-none-'));
    dirs.push(root);
    expect(sessionDirs(root)).toEqual([]);
  });

  it('names the session folder alone, never a stray file beside it', () => {
    const root = project({ name: '.DS_Store' }, { name: '.0.29.0.swp' }, { name: '0.29.0', dir: true });
    expect(sessionDirs(root)).toEqual(['0.29.0']);
  });

  it('is empty when the folder holds only what a person\'s tools left there', () => {
    expect(sessionDirs(project({ name: '.DS_Store' }, { name: 'notes.txt' }))).toEqual([]);
  });

  it('names every session, oldest first, so a project with two is refused by name rather than silently picked', () => {
    expect(sessionDirs(project({ name: '0.29.0', dir: true }, { name: '0.28.0', dir: true }))).toEqual(['0.28.0', '0.29.0']);
  });
});
