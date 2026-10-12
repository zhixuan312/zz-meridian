// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads a card's preview and specification, which a product does not keep.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, 'src/components/patterns/rail', file), 'utf8');

describe('the Rail\'s preview', () => {
  it('draws the Rail, and no copy of its items made by hand', () => {
    const preview = read('preview.tsx');
    expect(preview).not.toMatch(/label="Item states"/);
    expect(preview).not.toMatch(/<(ul|li)\b/);
    expect(preview).toMatch(/<Rail\b/);
  });

  it('says where an item\'s states are seen', () => {
    const spec = read('README.md');
    expect(spec).toMatch(/hover and focus are seen by using/i);
    expect(spec).not.toMatch(/Item states/);
  });
});
