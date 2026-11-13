// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { scanReferences } from '../scripts/lib/context-check.ts';

const ROOTS = ['README.md', 'CONTRIBUTING.md', 'decisions/0011-a-view-shares-its-context.md', 'journeys/workspaces.ts'];
const none = () => false;
const scan = (text: string, exists: (p: string) => boolean = none) => scanReferences([{ file: 'x.md', text }], exists, new Set<string>());

describe('the four roots a project may lack', () => {
  it('are checked outside a fence', () => {
    const out = scan(ROOTS.map((r) => `\`${r}\``).join(' '));
    expect(out).toHaveLength(4);
    for (const r of ROOTS) expect(out.join('\n'), r).toContain(r);
  });

  it('are checked inside a fence too', () => {
    const out = scan(`\`\`\`sh\ncat ${ROOTS.join(' ')}\n\`\`\``);
    expect(out).toHaveLength(4);
    for (const r of ROOTS) expect(out.join('\n'), r).toContain(r);
  });

  it('are accepted when held and skipped by their prefixes, while a required one is still checked', () => {
    const held = new Set(ROOTS);
    expect(scan(ROOTS.map((r) => `\`${r}\``).join(' '), (p) => held.has(p))).toEqual([]);
    // `optional:` and `example:` are the two prefixes that skip a check; `required:` is checked like a bare span.
    expect(scan('`optional:decisions/x.md` `example:journeys/y.ts`', (p) => held.has(p))).toEqual([]);
    expect(scan('`required:README.md`')).toHaveLength(1);
    // Inside a fence the prefix rules are the same, and placeholders and the other roots stay out.
    expect(scan('```\noptional:decisions/x.md\nsrc/not/checked.ts\ndecisions/<id>.md\nnpm run whatever\n```')).toEqual([]);
  });
});
