// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { dependencyProblems } from '../cli/src/session.ts';
import { satisfies } from '../cli/src/reconcile.ts';

const roots: string[] = [];
afterAll(() => { for (const r of roots) fs.rmSync(r, { recursive: true, force: true }); });

/** A project whose package.json declares `deps` and whose install put `installed` in node_modules, with an empty session. */
function project(deps: Record<string, string>, installed: Record<string, string>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-finalize-deps-'));
  roots.push(root);
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'team-app', dependencies: deps }));
  for (const [name, version] of Object.entries(installed)) {
    fs.mkdirSync(path.join(root, 'node_modules', name), { recursive: true });
    fs.writeFileSync(path.join(root, 'node_modules', name, 'package.json'), JSON.stringify({ name, version }));
  }
  const session = path.join(root, '.meridian/update/9.9.9');
  fs.mkdirSync(session, { recursive: true });
  return { root, session };
}

/**
 * Finalize holds what the install resolved to what package.json declares. A framework the team declares with a range is
 * the team's range, as update leaves it: a later patch inside it is not a problem, an install outside it is.
 */
describe('finalize reads the install against the declared ranges', () => {
  it('passes a framework the team declares with a caret when the install resolved a later patch', () => {
    const { root, session } = project({ next: '^16.4.2', react: '~19.3.1' }, { next: '16.4.3', react: '19.3.4' });
    expect(dependencyProblems(root, session, 'pnpm')).toEqual([]);
  });

  it('names a framework the install resolved outside its range, and one pinned exactly that resolved another', () => {
    const { root, session } = project({ next: '^16.4.2', react: '19.3.1' }, { next: '17.0.0', react: '19.3.2' });
    expect(dependencyProblems(root, session, 'pnpm')).toEqual([
      'next: the install resolved 17.0.0, which is not the planned ^16.4.2',
      'react: the install resolved 19.3.2, which is not the planned 19.3.1',
    ]);
  });

  it('reads a range as npm does, a missing minor or patch included', () => {
    expect(satisfies('^24', '24.9.1')).toBe(true);
    expect(satisfies('^24', '25.0.0')).toBe(false);
    expect(satisfies('~5.9', '5.9.3')).toBe(true);
    expect(satisfies('~5.9', '5.10.0')).toBe(false);
    expect(satisfies('16', '16.4.0')).toBe(true);
    expect(satisfies('16.4', '16.5.0')).toBe(false);
    expect(satisfies('>=1.2.3', '9.0.0')).toBe(true);
    expect(satisfies('^0.3.1', '0.4.0')).toBe(false);
    expect(satisfies('workspace:*', '1.0.0')).toBe(true);
  });
});
