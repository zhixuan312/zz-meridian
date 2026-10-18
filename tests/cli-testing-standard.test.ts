// @vitest-environment node
// docs/testing.md is the testing standard every adopted and created project receives and Meridian follows: the kinds of
// test, the tiers that combine them, when each runs and the rules a red, a limit and a release follow. A spec cites it
// rather than restating it. This keeps its shape: each section is there, every tier the table uses is explained, every
// on-request command is given its moment, both of Meridian's workflows are named, the standing rules are present, and a
// row whose command runs only files the payload leaves out (cli/scripts/build-payload.ts's PAYLOAD_EXCLUDE) says it is
// Meridian's repository's, since a project does not have it. The planted cases prove the guard is not vacuous.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAYLOAD_EXCLUDE } from '../cli/scripts/build-payload.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const doc = fs.readFileSync(path.join(ROOT, 'docs/testing.md'), 'utf8');
const testFiles = fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.tsx?$/.test(f)).map((f) => `tests/${f}`);

const SECTIONS = ['The kinds', 'The tiers', 'When each runs', 'Rules', 'Basis', 'The classification'];
const RULES = ['Quiet machine', 'Fixed means', 'Limits', 'Once per commit', 'Flaky is red', 'Releases'];
const WORKFLOWS = ['.github/workflows/release.yml', '.github/workflows/weekly.yml'];
const MERIDIAN_ONLY = "Meridian's repository only.";

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

/** The files a row's command runs: a test group's files, else every repository path its command names. */
function filesOf(r: Row): string[] {
  const group = /^tests\/(cli|deep)-\*$/.exec(r.Key);
  if (group) return testFiles.filter((f) => f.startsWith(`tests/${group[1]}-`));
  if (r.Key === 'tests/shipped') return testFiles.filter((f) => !/^tests\/(cli|deep)-/.test(f));
  return [...(r.Command ?? '').matchAll(/(?:^|[\s`])((?:cli|scripts|tests)\/[\w./-]+\.tsx?)/g)].map((m) => m[1]);
}

const commandOf = (r: Row) => /`([^`]+)`/.exec(r.Command ?? '')?.[1] ?? '';

export function problems(text: string): string[] {
  const out: string[] = [];
  for (const s of SECTIONS) if (!section(text, s)) out.push(`no ## ${s} section`);
  const table = rows(text);
  if (!table.length) return out;

  const tiers = section(text, 'The tiers');
  for (const tier of [...new Set(table.map((r) => r.Tier))]) if (!tiers.includes(`- **${tier}**:`)) out.push(`tier ${tier}: no bullet under ## The tiers`);

  const when = section(text, 'When each runs');
  for (const w of WORKFLOWS) if (!when.includes(w)) out.push(`## When each runs does not name ${w}`);
  for (const r of table.filter((x) => x.Tier === 'on request')) {
    const head = commandOf(r).split(' ').slice(0, 3).join(' ');
    if (!when.includes(head)) out.push(`${r.Key}: ## When each runs does not say when \`${head}\` runs`);
  }

  const rules = section(text, 'Rules');
  for (const rule of RULES) if (!rules.includes(`- **${rule}**`)) out.push(`rule ${rule}: no bullet under ## Rules`);

  for (const r of table) {
    const files = filesOf(r);
    const meridian = files.length > 0 && files.every((f) => PAYLOAD_EXCLUDE.test(f));
    const says = (r['What it checks'] ?? '').startsWith(MERIDIAN_ONLY);
    if (meridian && !says) out.push(`${r.Key}: its command runs only files a project does not have, and it does not open "${MERIDIAN_ONLY}"`);
    if (!meridian && says) out.push(`${r.Key}: says "${MERIDIAN_ONLY}", but a project has what its command runs`);
  }
  return out;
}

describe('docs/testing.md is the testing standard', () => {
  it('holds for the repository', () => expect(problems(doc)).toEqual([]));

  it('finds a Meridian-only row that does not say so', () => {
    const planted = doc.replace(/(\| `tests\/deep-\*` \|[^\n]*\| )Meridian's repository only\. /, '$1');
    expect(planted).not.toBe(doc);
    expect(problems(planted).join('\n')).toMatch(/^tests\/deep-\*: its command runs only files a project does not have/m);
  });

  it('finds a project row that says it is Meridian-only', () => {
    const planted = doc.replace(/(\| `gate\/types check` \|[^\n]*\| )([^|\n]+\|\n)/, `$1${MERIDIAN_ONLY} $2`);
    expect(planted).not.toBe(doc);
    expect(problems(planted).join('\n')).toMatch(/^gate\/types check: says/m);
  });

  it('finds a tier with no bullet, an on-request command with no moment, and a missing rule', () => {
    const planted = doc.replace(/\n- \*\*on request\*\*:[^\n]*/, '').replace(/\n- \*\*Fixed means\*\*[^\n]*/, '');
    expect(planted).not.toBe(doc);
    expect(problems(planted)).toEqual(expect.arrayContaining(['tier on request: no bullet under ## The tiers', 'rule Fixed means: no bullet under ## Rules']));
    const when = section(doc, 'When each runs');
    expect(problems(doc.replace(when, when.replace(/pnpm verify --perf/g, 'pnpm verify --perhaps'))).join('\n')).toMatch(/verify\/perf: ## When each runs does not say when/);
  });

  it('finds a section missing', () => {
    expect(problems(doc.replace('\n## When each runs\n', '\n## Elsewhere\n'))).toContain('no ## When each runs section');
  });
});
