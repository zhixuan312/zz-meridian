// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { checkBrief, scanReferences } from '../scripts/lib/context-check.ts';

const TEMPLATE = [
  '# Product name', '', '## Product', 'What this dashboard is for, in two or three sentences: who opens it, what decision it helps them make.', '',
  '## Users', 'Who uses it and how often; what they know already; what they must never be shown.', '',
  '## Data', 'Where the numbers come from (systems, tables, APIs), how fresh they are, and what now means for this product.', '',
  '## Decisions', 'Brand, layout and behaviour choices already made, one line each with its reason, so no session re-decides them.', '',
  '## Glossary', "The team's own words for things, one per line: term and what it means here.", '',
].join('\n');

describe('checkBrief', () => {
  it('warns on each untouched section of the template and does not fail it', () => {
    const r = checkBrief(TEMPLATE);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toHaveLength(5);
  });
  it('passes a filled brief quietly', () => {
    const filled = TEMPLATE.replace(/^(## .+)\n.+$/gm, '$1\nOur own words.');
    expect(checkBrief(filled)).toEqual({ errors: [], warnings: [] });
  });
  it('fails a missing section', () => expect(checkBrief(TEMPLATE.replace('## Data', '## Sources')).errors.join(' ')).toMatch(/Data/));
  it('fails a duplicated section', () => expect(checkBrief(`${TEMPLATE}\n## Users\nAgain.\n`).errors.join(' ')).toMatch(/Users/));
});

describe('scanReferences', () => {
  const present = new Set(['src/lib/cn.ts', '.agents/skills/zz-meridian/references/customize.md', 'docs/']);
  const exists = (p: string) => present.has(p);
  const scripts = new Set(['gate', 'verify']);
  const scan = (text: string, file = '.agents/skills/zz-meridian/SKILL.md') => scanReferences([{ file, text }], exists, scripts);

  it('accepts paths and scripts that exist', () => {
    expect(scan('Use `src/lib/cn.ts`, `references/customize.md`, `docs/`, `pnpm gate`, `pnpm verify --full`, `npm run verify` and `npm run verify -- --full`.')).toEqual([]);
  });
  it('reports a missing required path and script with file and line', () => {
    const out = scan('line one\nSee `src/missing.ts` and `required:app/gone.tsx`.\nRun `pnpm nope` or `yarn nope`.');
    expect(out).toHaveLength(4);
    expect(out[0]).toMatch(/^\.agents\/skills\/zz-meridian\/SKILL\.md:2: /);
    expect(out.join('\n')).toMatch(/src\/missing\.ts/);
    expect(out.join('\n')).toMatch(/nope/);
  });
  it('accepts absent optional references and examples', () => {
    expect(scan('`optional:docs/brief.md`, `optional:.meridian/keep.json`, `example:app/(dashboard)/page.tsx`, `example:pnpm deploy`')).toEqual([]);
  });
  it('ignores urls, globs, placeholders, node_modules, words, expressions and fenced code', () => {
    expect(scan('`https://x.dev/src/a.ts` `src/components/**` `src/components/<layer>/<name>/` `node_modules/next/dist/x.md` `glossary` `cache()`\n```\nsrc/not/checked.ts\n```')).toEqual([]);
  });
  it('resolves references/ relative to the document', () => {
    expect(scan('`references/customize.md`', '.claude/skills/zz-meridian/SKILL.md')).toHaveLength(1);
  });
  it('reports lines in the containing file when given a starting line', () => {
    const out = scanReferences([{ file: 'AGENTS.md', text: 'a\n`src/missing.ts`', firstLine: 40 }], exists, scripts);
    expect(out[0]).toMatch(/^AGENTS\.md:41: /);
  });
});
