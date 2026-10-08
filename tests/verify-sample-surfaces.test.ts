import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { sampleSurfaces } from '../scripts/lib/sample.ts';

const write = (root: string, rel: string) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), ''); };

describe('the sample surfaces the walk-throughs drive', () => {
  it('are all present in the template', () => {
    expect(sampleSurfaces(path.resolve(import.meta.dirname, '..'), 'app')).toEqual({ overview: true, members: true, keys: true, settings: true });
  });
  it('are absent from a product that replaced the sample pages, so their steps are not applicable', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'surfaces-'));
    write(root, 'app/(dashboard)/orders/page.tsx');
    write(root, 'src/views/orders.tsx');
    expect(sampleSurfaces(root, 'app')).toEqual({ overview: false, members: false, keys: false, settings: false });
  });
  it('need the page and its view: a Members route the product rewrote without the sample view is not the sample', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'surfaces-'));
    write(root, 'src/app/(dashboard)/members/page.tsx');
    expect(sampleSurfaces(root, 'src/app').members).toBe(false);
    write(root, 'src/views/members.tsx');
    expect(sampleSurfaces(root, 'src/app').members).toBe(true);
  });
});
