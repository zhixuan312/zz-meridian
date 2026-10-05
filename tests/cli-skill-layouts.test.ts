// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the template's own skills/ folder, which a product does not have.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanReferences } from '../scripts/lib/context-check.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const walk = (dir: string): string[] => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith('.md') ? [`${dir}/${e.name}`] : []));
const scripts = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts));

describe('the skill in a project created by an earlier release', () => {
  it('names no required path that such a project lacks', () => {
    // A product created with `brand.ts --product` has no docs/ or decisions/; one created before 0.5.0 has no brief either.
    const exists = (p: string) => !/^(docs|decisions)(\/|$)/.test(p) && fs.existsSync(path.join(ROOT, p));
    const docs = walk('skills/zz-meridian').map((file) => ({ file, text: fs.readFileSync(path.join(ROOT, file), 'utf8') }));
    expect(scanReferences(docs, exists, scripts)).toEqual([]);
  });
});
