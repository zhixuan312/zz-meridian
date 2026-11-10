// @vitest-environment node
// docs/testing.md is the testing standard every adopted and created project receives and Meridian follows. This keeps its
// shape: each section is there, the three commands are named, every tier the table uses is explained, both of Meridian's
// workflows are named, the standing rules are present, and every row names one of the three tiers. The planted cases prove
// the guard is not vacuous.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const doc = fs.readFileSync(path.join(ROOT, 'docs/testing.md'), 'utf8');

const SECTIONS = ['The kinds', 'The tiers', 'When each runs', 'Rules', 'Basis', 'The classification'];
const COMMANDS = ['pnpm test:t1', 'pnpm test:t2', 'pnpm test:release'];
const RULES = ['Quiet machine', 'Fixed means', 'Limits, and the flag line', 'Once per commit', 'Flaky is red', 'Releases'];
const WORKFLOWS = ['.github/workflows/release.yml', '.github/workflows/weekly.yml'];
const TIERS = ['1', '2', '3'];

type Row = Record<string, string>;

function section(text: string, heading: string): string {
  const start = text.indexOf(`\n## ${heading}\n`);
  if (start < 0) return '';
  const next = text.indexOf('\n## ', start + 1);
  return text.slice(start, next < 0 ? undefined : next);
}

function rows(text: string): Row[] {
  const lines = section(text, 'The classification').split('\n').filter((l) => l.trim().startsWith('|'));
  const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const header = lines.length ? cells(lines[0]) : [];
  return lines.slice(2).map((l) => Object.fromEntries(cells(l).map((c, i) => [header[i], i === 0 ? c.replace(/`/g, '') : c])));
}

export function problems(text: string): string[] {
  const out: string[] = [];
  for (const s of SECTIONS) if (!section(text, s)) out.push(`no ## ${s} section`);

  const tiers = section(text, 'The tiers');
  for (const command of COMMANDS) if (!tiers.includes(command)) out.push(`## The tiers does not name ${command}`);
  const table = rows(text);
  if (!table.length) return out;
  for (const tier of [...new Set(table.map((r) => r.Tier))]) if (!TIERS.includes(tier)) out.push(`tier ${tier}: not one of 1, 2, 3`);
  for (const tier of TIERS) if (!tiers.includes(`**Tier ${tier}`)) out.push(`Tier ${tier}: no bullet under ## The tiers`);

  const when = section(text, 'When each runs');
  for (const w of WORKFLOWS) if (!when.includes(w)) out.push(`## When each runs does not name ${w}`);

  const rules = section(text, 'Rules');
  for (const rule of RULES) if (!rules.includes(`- **${rule}**`)) out.push(`rule ${rule}: no bullet under ## Rules`);

  if (!text.includes('*.perf.test.ts(x)')) out.push('the Tier 2 file convention is not named');
  if (!text.includes('out/last-green')) out.push('the last-green marker is not named');
  return out;
}

describe('docs/testing.md is the testing standard', () => {
  it('holds for the repository', () => expect(problems(doc)).toEqual([]));

  it('finds a tier with no bullet, an on-request row and a missing rule', () => {
    const planted = doc.replace(/\n- \*\*Tier 3[^\n]*/, '').replace(/\n- \*\*Fixed means\*\*[^\n]*/, '');
    expect(problems(planted)).toEqual(expect.arrayContaining(['Tier 3: no bullet under ## The tiers', 'rule Fixed means: no bullet under ## Rules']));
    expect(problems(doc.replace('| 1 | no |', '| on request | no |')).join('\n')).toMatch(/tier on request/);
  });

  it('finds a missing command, a missing workflow and the missing convention', () => {
    const planted = doc.replace('pnpm test:release', 'pnpm release').replace('.github/workflows/weekly.yml', 'weekly.yml').split('*.perf.test.ts(x)').join('perf tests');
    expect(problems(planted)).toEqual(expect.arrayContaining([
      '## The tiers does not name pnpm test:release',
      '## When each runs does not name .github/workflows/weekly.yml',
      'the Tier 2 file convention is not named',
    ]));
  });

  it('finds a section missing', () => {
    expect(problems(doc.replace('\n## When each runs\n', '\n## Elsewhere\n'))).toContain('no ## When each runs section');
  });
});
