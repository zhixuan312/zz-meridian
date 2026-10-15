// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads Meridian's own changelog, which a product does not keep.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const changelog = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'CHANGELOG.md'), 'utf8');

/**
 * The Breaking lines the change owes an adopter, each by its bold lead, as the spec's "Impact" words them: an adopter
 * finds each by its lead, so a lead worded otherwise is one they do not find.
 */
const IMPACT = [
  '`daily` is `points`',
  "A Metric tile's `finding` names its `tone`.",
  '`ACTIONS` entries have no `line`, and `actionLine` is gone.',
  "The sample's pages are renamed.",
  "The sample's collections changed shape.",
  'The assistant walk-through looks for Home.',
  'A collection has an `aggregate`.',
  'A view tool has a prepared query.',
  'The assistant has no `query_<name>` tools.',
];

/**
 * This change's sections of the changelog: every section above `0.15.0`, the release it started from. It is
 * `[Unreleased]` until a release names it, and that release once a later change opens an `[Unreleased]` of its own.
 */
function sinceStart(): string {
  const lines = changelog.split('\n');
  const start = lines.findIndex((l) => l.startsWith('## ['));
  const end = lines.findIndex((l) => l.startsWith('## [0.15.0]'));
  return lines.slice(start, end).join('\n');
}

/** The bold leads of every `### Breaking` list in `text`, each list ending at the next heading. */
function breakingLeads(text: string): string[] {
  const leads: string[] = [];
  let inBreaking = false;
  for (const line of text.split('\n')) {
    const lead = /^- \*\*(.+?)\*\*/.exec(line)?.[1];
    if (line.startsWith('#')) inBreaking = line === '### Breaking';
    else if (inBreaking && lead) leads.push(lead);
  }
  return leads;
}

describe('the changelog tells an adopter what this change breaks', () => {
  it('starts from the release the change started from', () => {
    expect(changelog).toMatch(/^## \[0\.15\.0\]/m);
    expect(breakingLeads(sinceStart()).length).toBeGreaterThan(0);
  });

  it('carries every Breaking line of the change by its lead, once', () => {
    const leads = breakingLeads(sinceStart());
    for (const lead of IMPACT) expect(leads.filter((l) => l === lead), lead).toHaveLength(1);
  });
});
