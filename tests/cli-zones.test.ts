// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRAND_FLAGS, effectiveBrand } from '../cli/src/files.ts';
import { classify, managedPaths, renderOwnership } from '../cli/src/ownership.ts';

const A = `sha256-${'a'.repeat(64)}` as const;
const B = `sha256-${'b'.repeat(64)}` as const;
const C = `sha256-${'c'.repeat(64)}` as const;
const payload = [
  'src/components/ui/button/index.tsx', 'src/components/ui/button/README.md', 'src/lib/cn.ts', 'src/lib/logo.ts', 'src/lib/sample-only.ts',
  'scripts/check.ts', 'scripts/verify.config.ts', 'scripts/check.local.ts', 'src/views/console-chrome.tsx', 'src/views/members.tsx',
  'src/data/collections.ts', 'src/app.config.ts', 'app/(dashboard)/page.tsx', 'docs/brief.md', 'README.md', 'tokens/zz-meridian.resolver.json',
  'skills/zz-meridian/SKILL.md',
];
const generated = ['tokens/accent.brand.tokens.json', 'src/styles/theme.css', 'scripts/package.json', 'app/globals.css', 'src/app.config.ts', 'AGENTS.md', 'package.json', '.meridian/manifest.json'];

describe('the canonical managed set', () => {
  for (const route of ['adopt', 'create'] as const) {
    it(`is one rule for ${route}, with the generated brand outputs`, () => {
      const s = managedPaths(payload, route, generated);
      for (const p of ['src/components/ui/button/index.tsx', 'src/lib/cn.ts', 'src/lib/logo.ts', 'scripts/check.ts', 'src/views/console-chrome.tsx', 'tokens/zz-meridian.resolver.json', 'tokens/accent.brand.tokens.json', 'src/styles/theme.css', 'scripts/package.json', '.agents/skills/zz-meridian/SKILL.md', '.claude/skills/zz-meridian/SKILL.md']) expect(s.has(p), p).toBe(true);
      for (const p of ['src/components/ui/button/README.md', 'src/lib/sample-only.ts', 'scripts/verify.config.ts', 'scripts/check.local.ts', 'src/views/members.tsx', 'src/data/collections.ts', 'src/app.config.ts', 'app/(dashboard)/page.tsx', 'app/globals.css', 'docs/brief.md', 'README.md', 'AGENTS.md', 'package.json', '.meridian/manifest.json', 'skills/zz-meridian/SKILL.md']) expect(s.has(p), p).toBe(false);
    });
  }
  it('leaves a team file added under a managed folder to the team', () => {
    const p = 'src/components/ui/our-badge/index.tsx';
    const s = managedPaths(payload, 'adopt');
    expect(s.has(p)).toBe(false);
    expect(classify({ recorded: null, target: null, disk: A, managed: s.has(p) })).toEqual({ disposition: 'team-preserved', action: 'leave' });
  });
});

describe('classify with the keep register', () => {
  it.each([
    [{ recorded: A, target: B, disk: C, managed: true, kept: true }, 'kept', 'leave'],
    [{ recorded: A, target: B, disk: A, managed: true, kept: true }, 'kept', 'leave'],
    [{ recorded: A, target: B, disk: null, managed: true, kept: true }, 'kept', 'leave'],
    [{ recorded: null, target: B, disk: C, managed: true, kept: true }, 'kept', 'leave'],
    [{ recorded: A, target: null, disk: C, managed: true, kept: true }, 'retired-kept', 'leave'],
    [{ recorded: A, target: null, disk: A, managed: true, kept: true }, 'retired-kept', 'leave'],
    [{ recorded: A, target: B, disk: C, managed: false, kept: true }, 'team-preserved', 'leave'],
    [{ recorded: A, target: B, disk: C, managed: true, kept: false }, 'edited', 'stage'],
  ] as const)('%o → %s/%s', (input, disposition, action) => {
    expect(classify(input)).toEqual({ disposition, action });
  });
});

describe('the ownership guidance', () => {
  it("is the classifier's own rule, rendered", () => {
    const doc = fs.readFileSync(path.resolve(import.meta.dirname, '../skills/zz-meridian/references/ownership.md'), 'utf8');
    const begin = '<!-- BEGIN:ownership -->';
    const end = '<!-- END:ownership -->';
    expect(doc.indexOf(begin)).toBeGreaterThanOrEqual(0);
    expect(doc.slice(doc.indexOf(begin) + begin.length, doc.indexOf(end)).trim()).toBe(renderOwnership().trim());
  });
});

describe('the effective brand', () => {
  it('records one accent choice', () => {
    expect(effectiveBrand({ name: 'Acme', hex: '#2E6BE4', accent: 'jade', hue: '10', chroma: '0.1' })).toEqual({ name: 'Acme', hex: '#2E6BE4' });
    expect(effectiveBrand({ hue: '25', chroma: '0.16', accent: 'jade' })).toEqual({ hue: '25', chroma: '0.16' });
    expect(effectiveBrand({ accent: 'jade', name: 'Acme' })).toEqual({ name: 'Acme', accent: 'jade' });
  });
  it('keeps the order brand.ts reads them in and drops empty values', () => {
    expect(Object.keys(effectiveBrand({ theme: 'dark', name: 'Acme', role: '', user: 'Ada' }))).toEqual(['name', 'user', 'theme']);
  });
  it('accepts a dark or light theme only', () => {
    expect(BRAND_FLAGS).toContain('theme');
    expect(effectiveBrand({ theme: 'light' })).toEqual({ theme: 'light' });
    expect(() => effectiveBrand({ theme: 'blue' })).toThrow(/theme/);
  });
});
