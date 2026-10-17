// @vitest-environment node
// The stage's specimen sections are skipped by style and layout until they near the viewport: a chart pattern's specimen
// holds thousands of elements, and a Theme switch that restyled every one of them dropped a frame on a mid-range phone
// (scripts/vitals.ts --atlas). The rule is read from the stage's source, which is where it is written. A cli- test:
// a created project removes the Atlas, and this file with it.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const stage = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'src/system/card-stage.tsx'), 'utf8');

describe('the card stage', () => {
  it('skips the specimen sections that are off screen', () => {
    const wrapper = stage.split('\n').find((line) => line.includes('<div data-specimen'));
    expect(wrapper).toBeDefined();
    expect(wrapper).toContain('*:[content-visibility:auto]');
    expect(wrapper).toMatch(/\*:\[contain-intrinsic-size:auto_\d+px\]/);
  });
});
