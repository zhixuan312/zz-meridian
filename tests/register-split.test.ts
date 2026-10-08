// @vitest-environment node
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string) => fs.readFileSync(p, 'utf8');
const RULE = /docs\/register\.md` when present, otherwise `(references\/)?register\.md`/;

describe('the register is its own file', () => {
  it("holds Meridian's own look and its anti-defaults in register.md", () => {
    const reg = read('skills/zz-meridian/references/register.md');
    expect(reg).toContain('dark first');
    expect(reg).toContain('cream or off-white backgrounds');
    expect(reg).toContain('Defaults noticed');
  });
  it('keeps the universal parts in standard.md and states the rule there', () => {
    const std = read('skills/zz-meridian/references/standard.md');
    expect(std).not.toContain('cream or off-white backgrounds');
    expect(std).toContain('A Meridian product is a product UI');
    expect(std).toContain('the project meets the Meridian standard');
    expect(std).toMatch(RULE);
  });
  it('states the rule where the agent starts work', () => {
    expect(read('skills/zz-meridian/SKILL.md')).toMatch(RULE);
  });
  it('carries the eval scenario', () => {
    expect(read('docs/skill-evals.md')).toContain('A project with its own register');
  });
});
