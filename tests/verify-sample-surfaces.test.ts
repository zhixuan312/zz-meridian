import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sampleSurfaces } from '../scripts/lib/sample.ts';

/** A folder of its own for each case, removed after it. */
const roots: string[] = [];
const scratch = () => { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'surfaces-')); roots.push(root); return root; };
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
const write = (root: string, rel: string, text = '') => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
/** The sample Home's view, as far as the walk-through needs it: the year's card it reads. */
const SAMPLE_HOME = "<CardHeader title=\"A year, counted\" />";
/** The sample Members, Keys and Settings, as far as the walk-through and the live checks read them. */
const SAMPLE_MEMBERS = { 'src/views/members.tsx': "'Invite member' placeholder=\"Ana Costa\"", 'src/system/fixtures/sample-members.ts': "['Maya Chen'] ['Alice Moreno'] ['Ravi Patel']" };
const SAMPLE_KEYS = "title: 'API keys',";
const SAMPLE_SETTINGS = 'Show the assistant';

describe('the sample surfaces the walk-throughs drive', () => {
  // A project made from the template has replaced some of them: the template's own repository, which keeps the Atlas, has all.
  it.skipIf(!fs.existsSync(path.resolve(import.meta.dirname, '../app/system')))('are all present in the template', () => {
    expect(sampleSurfaces(path.resolve(import.meta.dirname, '..'), 'app')).toEqual({ home: true, now: true, members: true, keys: true, settings: true });
  });
  it('are absent from a product that replaced the sample pages, so their steps are not applicable', () => {
    const root = scratch();
    write(root, 'app/(dashboard)/orders/page.tsx');
    write(root, 'src/views/orders.tsx');
    expect(sampleSurfaces(root, 'app')).toEqual({ home: false, now: false, members: false, keys: false, settings: false });
  });
  it('are found under whatever route group a product keeps its console in', () => {
    const root = scratch();
    for (const f of ['app/(dash)/(home)/page.tsx', 'src/logic/home-context.ts', 'app/(dash)/members/page.tsx', 'app/(dash)/keys/page.tsx']) write(root, f);
    write(root, 'src/views/home.tsx', SAMPLE_HOME);
    for (const [f, text] of Object.entries(SAMPLE_MEMBERS)) write(root, f, text);
    write(root, 'src/logic/keys-context.ts', SAMPLE_KEYS);
    expect(sampleSurfaces(root, 'app')).toEqual({ home: true, now: false, members: true, keys: true, settings: false });
  });
  it('need the page and its view: a Members route the product rewrote without the sample view is not the sample', () => {
    const root = scratch();
    write(root, 'src/app/(dashboard)/members/page.tsx');
    expect(sampleSurfaces(root, 'src/app').members).toBe(false);
    for (const [f, text] of Object.entries(SAMPLE_MEMBERS)) write(root, f, text);
    expect(sampleSurfaces(root, 'src/app').members).toBe(true);
  });
  it('is not the sample when a product kept the page and changed what the walk reads on it', () => {
    // The usual first edit: the product's own people in the roster, its own copy, its own page titles. The walk would then
    // wait for rows and labels that are no longer drawn and fail as if the product were broken.
    const root = scratch();
    for (const f of ['app/(dashboard)/members/page.tsx', 'app/(dashboard)/keys/page.tsx']) write(root, f);
    for (const [f, text] of Object.entries(SAMPLE_MEMBERS)) write(root, f, text);
    write(root, 'src/logic/keys-context.ts', SAMPLE_KEYS);
    write(root, 'src/views/settings.tsx', SAMPLE_SETTINGS);
    expect(sampleSurfaces(root, 'app')).toMatchObject({ members: true, keys: true, settings: true });
    write(root, 'src/system/fixtures/sample-members.ts', "['Ada Park'] ['Lin Wei']");
    write(root, 'src/logic/keys-context.ts', "title: 'Access tokens',");
    write(root, 'src/views/settings.tsx', 'Theme');
    expect(sampleSurfaces(root, 'app')).toMatchObject({ members: false, keys: false, settings: false });
    for (const [f, text] of Object.entries(SAMPLE_MEMBERS)) write(root, f, text);
    write(root, 'src/views/members.tsx', "'Add person' placeholder=\"Full name\"");
    expect(sampleSurfaces(root, 'app').members).toBe(false);
  });
  it("is not the sample Home when a product's own Home keeps the preset's file names", () => {
    // The guide's preset for a summary page copies `(home)/page.tsx`, `src/views/home.tsx` and `home-context.ts`; the
    // product's Home that results is its own, and the walk-through's Home steps do not apply to it.
    const root = scratch();
    for (const f of ['app/(dashboard)/(home)/page.tsx', 'src/logic/home-context.ts']) write(root, f);
    write(root, 'src/views/home.tsx', '<CardHeader title="Sailings this week" />');
    expect(sampleSurfaces(root, 'app').home).toBe(false);
    write(root, 'src/views/home.tsx', SAMPLE_HOME);
    expect(sampleSurfaces(root, 'app').home).toBe(true);
  });
});
