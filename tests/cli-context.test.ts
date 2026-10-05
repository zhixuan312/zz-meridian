// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BEGIN, BRIEF_TEMPLATE, END, managedBlock, upsertManagedBlock } from '../cli/src/context.ts';

const block = managedBlock('0.5.0', 'pnpm');
const LEGACY = '# Built on ZZ Meridian\n\nThe interface is built on ZZ Meridian. Keep it that way:\n\n- **Build up, never sideways.**\n';

describe('managedBlock', () => {
  it('is the frozen block for the version', () => {
    expect(block.startsWith(`${BEGIN}\n# Built on ZZ Meridian 0.5.0\n`)).toBe(true);
    expect(block.endsWith(END)).toBe(true);
    for (const s of ['`.agents/skills/zz-meridian/SKILL.md`', '`optional:docs/brief.md`', '`optional:.meridian/keep.json`', '`.agents/skills/zz-meridian/references/customize.md`', '`.agents/skills/zz-meridian/references/update.md`', '`src/app.config.ts`', '`scripts/verify.config.ts`', '`pnpm verify`', '`pnpm gate`', '`pnpm verify --full`']) expect(block).toContain(s);
  });
  it('fits in 4096 bytes for every package manager', () => {
    for (const pm of ['pnpm', 'npm', 'yarn', 'bun'] as const) expect(Buffer.byteLength(managedBlock('10.20.30', pm))).toBeLessThanOrEqual(4096);
  });
  it("uses the project's package manager, with npm's separator before flags", () => {
    const npm = managedBlock('0.5.0', 'npm');
    expect(npm).toContain('`npm run verify`');
    expect(npm).toContain('`npm run gate`');
    expect(npm).toContain('`npm run verify -- --full`');
    expect(npm).not.toContain('pnpm');
    expect(managedBlock('0.5.0', 'yarn')).toContain('`yarn verify --full`');
  });
});

describe('upsertManagedBlock', () => {
  it('writes the block into an empty file', () => expect(upsertManagedBlock('', block)).toBe(`${block}\n`));
  it('appends after team text and keeps every byte of it', () => {
    for (const team of ['Team rules\n', 'Team rules', 'Team rules\n\n  \n']) {
      const out = upsertManagedBlock(team, block);
      expect(out.startsWith(team)).toBe(true);
      expect(out.endsWith(`${block}\n`)).toBe(true);
      expect(out.split(BEGIN)).toHaveLength(2);
    }
  });
  it('replaces only what is between the markers', () => {
    const before = 'Top\n\n', after = '\n\n## Ours, after the block\n  trailing  \n';
    const out = upsertManagedBlock(`${before}${managedBlock('0.4.9', 'pnpm')}${after}`, block);
    expect(out).toBe(`${before}${block}${after}`);
  });
  it('replaces an exact legacy section and keeps its surroundings', () => {
    expect(upsertManagedBlock(`Team\n\n${LEGACY}\nAfter\n`, block, LEGACY)).toBe(`Team\n\n${block}\nAfter\n`);
  });
  it.each([
    ['duplicate', `${block}\n\n${block}\n`],
    ['unterminated', `x\n${BEGIN}\nno end\n`],
    ['unterminated', `x\n${END}\n${BEGIN}\n`],
    ['unterminated', `x\n${END}\n`],
  ])('refuses a %s block', (word, text) => expect(() => upsertManagedBlock(text, block)).toThrow(new RegExp(word)));
  it('refuses a legacy section that appears twice', () => {
    expect(() => upsertManagedBlock(`${LEGACY}\n${LEGACY}`, block, LEGACY)).toThrow(/duplicate/);
  });
  it('refuses a file with both a managed block and the legacy section', () => {
    expect(() => upsertManagedBlock(`${LEGACY}\n${block}\n`, block, LEGACY)).toThrow(/both a managed block and a legacy section/);
  });
  it('refuses an edited legacy section instead of truncating it', () => {
    const edited = LEGACY.replace('Keep it that way', 'We changed this');
    expect(() => upsertManagedBlock(`Team\n\n${edited}`, block, LEGACY)).toThrow(/edited legacy section/);
  });
});

describe('BRIEF_TEMPLATE', () => {
  it('has the five sections in order with their guidance lines', () => {
    const headings = BRIEF_TEMPLATE.split('\n').filter((l) => l.startsWith('## '));
    expect(headings).toEqual(['## Product', '## Users', '## Data', '## Decisions', '## Glossary']);
    expect(BRIEF_TEMPLATE.startsWith('# Product name\n\n## Product\nWhat this dashboard is for')).toBe(true);
  });
});
