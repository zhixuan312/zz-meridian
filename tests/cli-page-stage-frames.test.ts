// @vitest-environment node
// A page specification's stage keeps its frame when its theme changes. Keyed by the theme, a Dark-to-Light tap unmounted
// the pane and loaded the whole page again in a new <iframe> inside the tap, which dropped a 67-100 ms frame on a
// mid-range phone (scripts/vitals.ts --atlas, /system/pages/revenue). A cli- test: a created project removes the Atlas.
import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

const stage = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'src/system/page-stage.tsx'), 'utf8');

it("keys each theme's pane by its position, so a single theme's frame stays mounted", () => {
  const maps = stage.split('\n').filter((line) => line.includes('themes.map('));
  expect(maps).toHaveLength(1);
  expect(maps[0]).toMatch(/themes\.map\(\(t, i\) =>/);
  expect(stage).toMatch(/<div key=\{i\}/);
  expect(stage).not.toMatch(/key=\{t\}/);
});
