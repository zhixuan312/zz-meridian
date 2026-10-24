// @vitest-environment node
// The standard ships twice, says the same thing in both, and every link into it reaches a file that exists.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const STANDARD = 'skills/zz-meridian/references/data-layers.md';
const COPY = 'docs/data-layers.md';

describe('the data-layers standard', () => {
  it('exists where an adopter\'s agent reads it, and where this repository serves it', () => {
    expect(fs.existsSync(path.join(ROOT, STANDARD)), STANDARD).toBe(true);
    expect(fs.existsSync(path.join(ROOT, COPY)), COPY).toBe(true);
  });

  it('is one document, not two that drift', () => {
    // The one difference allowed is a line naming where the reader is; everything else is the same text.
    const strip = (text: string) => text.split('\n').filter((line) => !/^<!--\s*(where|serves|repo):/i.test(line.trim())).join('\n').trim();
    expect(strip(read(COPY))).toBe(strip(read(STANDARD)));
  });

  it('states the contract a dashboard needs from a backend, and what it leaves alone', () => {
    const text = read(STANDARD).toLowerCase();
    // AC-3.5's five parts, each answerable from the document alone.
    expect(text, 'a read answers a total').toMatch(/total/);
    expect(text, 'authorization precedes the cache').toMatch(/before any cache|before the cache|authoriz\w+.*before/);
    expect(text, 'a write names what it invalidates').toMatch(/invalidat/);
    expect(text, 'absent evidence is null, never zero').toMatch(/null/);
    expect(text, 'the store is the reference implementation').toMatch(/reference implementation/);
    // The four times and versions, which the contract's last clause turns on.
    for (const term of ['observed', 'observed revision', 'builtat', 'sourcerevision']) {
      expect(text, `names ${term}`).toContain(term);
    }
  });

  it('separates the three derived things and the six content layers', () => {
    const text = read(STANDARD);
    expect(text).toMatch(/derived field/i);
    expect(text).toMatch(/derived answer/i);
    expect(text).toMatch(/cache/i);
    expect(text).toMatch(/six content layers/i);
    expect(text).toMatch(/not a content layer/i);
  });

  it('states the two places a project may deviate, and the seven direct reads', () => {
    const text = read(STANDARD);
    expect(text).toMatch(/allow-<rule>/);
    expect(text).toContain('check.local.ts');
    for (const site of [
      'src/data/access.ts',
      'app/sign-in/actions.ts',
      'app/sign-in/gated-panel.tsx',
      'app/(dashboard)/requests/[id]/actions.ts',
      'app/api/export/requests/route.ts',
      'src/lib/assistant/tools.ts',
    ]) expect(text, site).toContain(site);
    // The two sites in src/data/access.ts are two, not one: the table counts seven.
    expect(text).toMatch(/\bseven\b/i);
  });

  it('carries the ordered path an existing product follows, ending on the switch', () => {
    const text = read(STANDARD);
    expect(text).toMatch(/four layers/i);
    expect(text).toMatch(/scripts\/check\.local\.ts/);
  });

  it('is linked from every place the requirements name, and says so where a project starts', () => {
    const links = [
      ['skills/zz-meridian/SKILL.md', 'references/data-layers.md'],
      ['skills/zz-meridian/references/customize.md', 'data-layers.md'],
      ['skills/zz-meridian/references/existing-project.md', 'data-layers.md'],
      ['docs/start-a-dashboard.md', 'data-layers.md'],
      ['README.md', 'docs/data-layers.md'],
    ] as const;
    for (const [file, target] of links) {
      expect(read(file), `${file} links ${target}`).toContain(target);
    }
    // FR-24: the silence before the switch is set is stated in the guide an adopter's agent reads first, not only in
    // the standard.
    const existing = read('skills/zz-meridian/references/existing-project.md');
    expect(existing, 'the check says nothing until the switch is set').toMatch(/says nothing|silent|no rules? (run|fire)/i);
  });
});
