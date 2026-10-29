// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { discover } from '../scripts/lib/routes.ts';

const roots: string[] = [];
afterAll(() => { for (const r of roots) fs.rmSync(r, { recursive: true, force: true }); });

const project = (files: string[]) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-routes-'));
  roots.push(root);
  for (const p of files) {
    fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
    fs.writeFileSync(path.join(root, p), 'export default function Page() { return null; }\n');
  }
  return root;
};

/**
 * Every suite walks the pages `discover()` finds, so an adopted project's own App Router shapes are found as Next serves
 * them: a page in any of the extensions Next reads, a parallel route's slot dropped from the address as a route group
 * is, and an intercepting route left out, since it answers only a navigation from inside the app.
 */
describe('the pages discover finds', () => {
  it('reads every page extension, drops a slot from the address and leaves an intercepting route out', () => {
    const root = project([
      'app/page.tsx',
      'app/orders/page.ts',
      'app/team/page.jsx',
      'app/help/page.js',
      'app/(shop)/cart/page.tsx',
      'app/@modal/login/page.tsx',
      'app/feed/@aside/page.tsx',
      'app/feed/(.)photo/page.tsx',
      'app/feed/(..)orders/page.tsx',
      'app/feed/(...)help/page.tsx',
      'app/[id]/page.tsx',
      'app/_parts/page.tsx',
      'app/api/hook/page.ts',
    ]);
    expect(discover(root)).toEqual(['/', '/cart', '/feed', '/help', '/login', '/orders', '/team', '/this-page-does-not-exist']);
  });
});
