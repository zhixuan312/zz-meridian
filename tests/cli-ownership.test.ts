// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { adoptSetOf, classify, managedPaths, parseManifest } from '../cli/src/ownership.ts';

const h = (c: string) => `sha256-${c.repeat(64)}` as const;
const A = h('a'), B = h('b'), C = h('c');
const manifest = (files: Record<string, string>, over: Record<string, unknown> = {}) => JSON.stringify({ version: '0.3.0', route: 'adopt', brand: {}, files, ...over });

describe('parseManifest', () => {
  it('reads a 0.3.0 manifest', () => {
    const m = parseManifest(JSON.stringify({ version: '0.3.0', route: 'adopt', brand: { name: 'Acme Ops' }, files: { 'src/lib/cn.ts': A } }));
    expect(m.version).toBe('0.3.0');
    expect(m.files['src/lib/cn.ts']).toBe(A);
  });
  it.each([
    ['not json', '{'],
    ['bad route', manifest({}, { route: 'copy' })],
    ['bad version', manifest({}, { version: 'latest' })],
    ['bad hash', manifest({ a: 'md5-x' })],
    ['missing files', JSON.stringify({ version: '0.3.0', route: 'adopt', brand: {} })],
    ['a parent path', manifest({ '../etc/passwd': A })],
    ['an absolute path', manifest({ '/etc/passwd': A })],
    ['a backslash path', manifest({ 'src\\lib\\cn.ts': A })],
  ])('refuses %s', (_name, text) => expect(() => parseManifest(text)).toThrow());
});

const payload = [
  'tokens/zz-meridian.resolver.json', 'src/styles/tokens.css', 'src/components/ui/button/index.tsx',
  'src/components/ui/button/README.md', 'src/components/ui/button/preview.tsx', 'scripts/check.ts',
  'scripts/verify.config.ts', 'src/lib/cn.ts', 'src/lib/collection.ts', 'src/lib/assistant/prompt.ts',
  'src/views/console-chrome.tsx', 'src/views/members.tsx', 'tests/setup.ts', 'app/(dashboard)/page.tsx',
  'src/app.config.ts', 'skills/zz-meridian/SKILL.md', 'docs/brief.md',
];

describe('adoptSetOf', () => {
  it("applies adopt's copy rule to the files the payload has", () => {
    expect(adoptSetOf(payload)).toEqual(['scripts/check.ts', 'src/components/ui/button/index.tsx', 'src/lib/assistant/prompt.ts', 'src/lib/cn.ts', 'src/lib/collection.ts', 'src/styles/tokens.css', 'src/views/console-chrome.tsx', 'tests/setup.ts', 'tokens/zz-meridian.resolver.json']);
  });
});

describe('managedPaths', () => {
  for (const route of ['adopt', 'create'] as const) {
    it(`gives the canonical managed set for ${route}`, () => {
      const s = managedPaths(payload, route);
      for (const p of ['tokens/zz-meridian.resolver.json', 'src/styles/tokens.css', 'src/components/ui/button/index.tsx', 'scripts/check.ts', 'src/lib/cn.ts', 'src/lib/collection.ts', 'src/lib/assistant/prompt.ts', 'src/views/console-chrome.tsx', 'tests/setup.ts', '.agents/skills/zz-meridian/SKILL.md', '.claude/skills/zz-meridian/SKILL.md']) expect(s.has(p), p).toBe(true);
      for (const p of ['src/components/ui/button/README.md', 'src/components/ui/button/preview.tsx', 'scripts/verify.config.ts', 'src/views/members.tsx', 'app/(dashboard)/page.tsx', 'src/app.config.ts', 'skills/zz-meridian/SKILL.md', 'docs/brief.md']) expect(s.has(p), p).toBe(false);
    });
  }
});

describe('classify', () => {
  it.each([
    [{ recorded: A, target: B, disk: A, managed: false }, 'team-preserved', 'leave'],
    [{ recorded: A, target: B, disk: A, managed: true }, 'untouched', 'write'],
    [{ recorded: A, target: A, disk: A, managed: true }, 'untouched', 'leave'],
    [{ recorded: A, target: B, disk: B, managed: true }, 'edited', 'leave'],
    [{ recorded: A, target: B, disk: C, managed: true }, 'edited', 'stage'],
    [{ recorded: A, target: A, disk: C, managed: true }, 'edited', 'stage'],
    [{ recorded: A, target: B, disk: null, managed: true }, 'local-deletion', 'stage'],
    [{ recorded: A, target: null, disk: A, managed: true }, 'removed', 'delete'],
    [{ recorded: A, target: null, disk: C, managed: true }, 'removed', 'stage'],
    [{ recorded: A, target: null, disk: null, managed: true }, 'removed', 'leave'],
    [{ recorded: null, target: B, disk: null, managed: true }, 'added', 'write'],
    [{ recorded: null, target: B, disk: B, managed: true }, 'added', 'leave'],
    [{ recorded: null, target: B, disk: C, managed: true }, 'collision', 'stage'],
  ] as const)('%o → %s/%s', (input, disposition, action) => {
    expect(classify(input)).toEqual({ disposition, action });
  });
  it('refuses a malformed hash', () => expect(() => classify({ recorded: 'x' as never, target: A, disk: A, managed: true })).toThrow());
});
