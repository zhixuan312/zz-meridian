import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MANAGED_PATH } from '../cli/src/ownership.ts';

const root = path.resolve(import.meta.dirname, '..');
const layout = fs.readFileSync(path.join(root, 'app/layout.tsx'), 'utf8');

// Issue #100: with fonts.googleapis.com unreachable and no build cache, `next build` failed (`Build error occurred`,
// exit 1), as the first 0.33.0 release run's update did. The faces ship with the template, so a build needs no network.
describe("the template's faces", () => {
  it('are loaded from files the template ships, never fetched at build time', () => {
    expect(layout).not.toMatch(/next\/font\/google/);
    expect(layout).toMatch(/from 'next\/font\/local'/);
    const files = [...layout.matchAll(/src: '([^']+\.woff2)'/g)].map((m) => path.resolve(root, 'app', m[1]!));
    expect(files.map((f) => path.relative(root, f))).toEqual(['src/styles/fonts/Geist-Variable.woff2', 'src/styles/fonts/GeistMono-Variable.woff2']);
    for (const f of files) expect(fs.readFileSync(f).subarray(0, 4).toString('latin1'), f).toBe('wOF2');
  });

  it('carry their licence beside them, and are files an update delivers', () => {
    expect(fs.readFileSync(path.join(root, 'src/styles/fonts/LICENSE.txt'), 'utf8')).toMatch(/SIL Open Font License, Version 1\.1/);
    for (const f of ['Geist-Variable.woff2', 'GeistMono-Variable.woff2', 'LICENSE.txt']) expect(MANAGED_PATH.test(`src/styles/fonts/${f}`)).toBe(true);
  });
});
