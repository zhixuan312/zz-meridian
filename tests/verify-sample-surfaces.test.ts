import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { sampleSurfaces } from '../scripts/lib/sample.ts';

const write = (root: string, rel: string, text = '') => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
/** The sample Home's view, as far as the walk-through needs it: the year's card it reads. */
const SAMPLE_HOME = "<CardHeader title=\"A year, counted\" />";

describe('the sample surfaces the walk-throughs drive', () => {
  // A project made from the template has replaced some of them: the template's own repository, which keeps the Atlas, has all.
  it.skipIf(!fs.existsSync(path.resolve(import.meta.dirname, '../app/system')))('are all present in the template', () => {
    expect(sampleSurfaces(path.resolve(import.meta.dirname, '..'), 'app')).toEqual({ home: true, now: true, members: true, keys: true, settings: true });
  });
  it('are absent from a product that replaced the sample pages, so their steps are not applicable', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'surfaces-'));
    write(root, 'app/(dashboard)/orders/page.tsx');
    write(root, 'src/views/orders.tsx');
    expect(sampleSurfaces(root, 'app')).toEqual({ home: false, now: false, members: false, keys: false, settings: false });
  });
  it('are found under whatever route group a product keeps its console in', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'surfaces-'));
    for (const f of ['app/(dash)/(home)/page.tsx', 'src/views/home-context.ts', 'app/(dash)/members/page.tsx', 'src/views/members.tsx', 'app/(dash)/keys/page.tsx']) write(root, f);
    write(root, 'src/views/home.tsx', SAMPLE_HOME);
    expect(sampleSurfaces(root, 'app')).toEqual({ home: true, now: false, members: true, keys: true, settings: false });
  });
  it('need the page and its view: a Members route the product rewrote without the sample view is not the sample', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'surfaces-'));
    write(root, 'src/app/(dashboard)/members/page.tsx');
    expect(sampleSurfaces(root, 'src/app').members).toBe(false);
    write(root, 'src/views/members.tsx');
    expect(sampleSurfaces(root, 'src/app').members).toBe(true);
  });
  it("is not the sample Home when a product's own Home keeps the preset's file names", () => {
    // The guide's preset for a summary page copies `(home)/page.tsx`, `src/views/home.tsx` and `home-context.ts`; the
    // product's Home that results is its own, and the walk-through's Home steps do not apply to it.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'surfaces-'));
    for (const f of ['app/(dashboard)/(home)/page.tsx', 'src/views/home-context.ts']) write(root, f);
    write(root, 'src/views/home.tsx', '<CardHeader title="Sailings this week" />');
    expect(sampleSurfaces(root, 'app').home).toBe(false);
    write(root, 'src/views/home.tsx', SAMPLE_HOME);
    expect(sampleSurfaces(root, 'app').home).toBe(true);
  });
});
