/**
 * `MERGE.md`: the report a person (or their agent) reads to finish an update. Pure text out of the journal, so the same
 * session always renders the same report.
 */
import { isNewer } from './update.js';
import type { FileOperation, FileSide, Hash, UpdateJournal } from './update-session.js';

export type ReportInput = {
  journal: UpdateJournal;
  /** Project-relative folder of the session, such as `.meridian/update/0.5.0`. */
  session: string;
  outcome: string;
  pm: string;
  /** One line per kept file that is missing from the project. */
  keepWarnings: string[];
  /** The target release's CHANGELOG.md, or ''. */
  changelog: string;
  /** The project file's current hash, or null when it is absent. */
  hashOf: (path: string) => Hash | null;
};

/** The sections of a changelog whose version is above `source`, `[Unreleased]` included, each with its own heading line. */
export function changelogSections(changelog: string, source: string): string[] {
  const parts = changelog.split(/^(?=## \[)/m).filter((s) => s.startsWith('## ['));
  return parts.filter((s) => {
    const v = /^## \[([^\]]+)\]/.exec(s)![1]!;
    return v === 'Unreleased' || (/^\d+\.\d+\.\d+$/.test(v) && isNewer(v, source));
  }).map((s) => s.trimEnd());
}

/** A fence long enough that nothing inside the text can close it. */
function fenced(text: string): string {
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  const fence = '`'.repeat(longest + 1);
  return `${fence}markdown\n${text}\n${fence}`;
}

const json = (v: unknown) => `\`\`\`json\n${JSON.stringify(v, null, 2)}\n\`\`\``;

/** The path of one staged copy, or `absent` when that side does not exist. */
const copy = (session: string, folder: string, side: FileSide, path: string) => (side.exists ? `\`${session}/${folder}/${path}\`` : '`absent`');

const WHAT: Record<string, string> = {
  edited: 'You edited this managed file and Meridian changed it too. Combine the two versions.',
  collision: 'Meridian now ships this path and you already have a different file there. Decide which one stays, or combine them.',
  removed: 'Meridian removed this file, and you edited it. Decide whether to delete it or keep it.',
  'local-deletion': 'You deleted this managed file and Meridian still ships it. Decide whether it stays out or comes back.',
};

export function renderMergeReport(i: ReportInput): string {
  const j = i.journal;
  const finalize = `npx zz-meridian@${j.targetVersion} update --finalize`;
  const resume = `npx zz-meridian@${j.targetVersion} update --resume`;
  const abort = `npx zz-meridian@${j.targetVersion} update --abort`;
  const staged = j.operations.filter((o) => o.action === 'stage');
  const out: string[] = [];

  out.push(`# Update ${j.sourceVersion} to ${j.targetVersion}`, '');
  out.push(`- Source: ${j.sourceVersion}`, `- Target: ${j.targetVersion}`, `- Route: ${j.route}`, `- Session: ${j.id}`, `- Phase: ${j.phase}`, `- Outcome: ${i.outcome}`, '');
  out.push('Commands, pinned to the release that started this session:', '', '```', `${finalize}   # when every item below is resolved`, `${resume}     # after an interruption, or to run a skipped install`, `${abort}      # restore what the update changed and archive the session`, '```', '');
  if (j.failure) out.push('## Failure', '', j.failure, '');

  out.push('## What needs you', '');
  if (staged.length === 0 && j.migrations.length === 0) out.push('Nothing was staged and no migration is required.', '');
  out.push('Resolve each item, then record it in `resolutions.json` next to this file. A resolution is an object with the item id, `resolved`, a reason in a sentence, and the hash each named file has right now. Compute a hash as `sha256-` plus the file\'s SHA-256 (`shasum -a 256 <file>`), or `null` for a file that is absent. A file edited after its resolution needs a new one.', '');
  for (const o of staged) out.push(...stagedItem(i, o));
  for (const m of j.migrations) {
    out.push(`### migration:${m.id}`, '', m.summary, '', `Paths: ${m.paths.map((p) => `\`${p}\``).join(', ') || 'none'}`, '', m.instructions, '');
    if (m.checks.length) out.push('Checks:', '', ...m.checks.map((c) => `- \`${c}\``), '');
    out.push('Resolve with `resolved` or `not-applicable`:', '', json({ id: `migration:${m.id}`, status: 'resolved', reason: '', files: Object.fromEntries(m.paths.map((p) => [p, i.hashOf(p)])) }), '');
  }

  const warnings = [
    ...i.keepWarnings,
    ...j.operations.filter((o) => o.disposition === 'retired-kept').map((o) => `${o.path}: Meridian removed this file; your kept copy stays and is now yours alone. It is recorded as retired.`),
  ];
  out.push('## Kept and retired files', '');
  out.push(...(warnings.length ? warnings.map((w) => `- ${w}`) : ['None.']), '');

  const team = [...new Set([...j.operations.filter((o) => o.disposition === 'team-preserved' && o.action === 'write').map((o) => o.path), ...j.migrations.flatMap((m) => m.paths)])].sort();
  out.push('## Team files this update touches or asks you to review', '');
  out.push(...(team.length ? team.map((p) => `- \`${p}\``) : ['None.']), '', 'Meridian changes a team file only where it says so here: `package.json` (dependencies and scripts), `AGENTS.md` (the managed block) and the lockfile after an install. Everything else is advice in the items above.', '');

  const counts = new Map<string, number>();
  for (const o of j.operations) counts.set(`${o.disposition}/${o.action}`, (counts.get(`${o.disposition}/${o.action}`) ?? 0) + 1);
  out.push('## Every disposition', '', ...[...counts].sort().map(([k, n]) => `- ${k}: ${n}`), '', '<details><summary>Every path</summary>', '', '```');
  for (const o of j.operations) out.push(`${o.disposition.padEnd(15)}  ${o.action.padEnd(6)}  ${o.path}`);
  out.push('```', '', '</details>', '');

  out.push('## Verify', '', 'Finalizing runs the project gate and one build. To check by hand first:', '', '```', `${i.pm} run gate`, 'node node_modules/next/dist/bin/next build', '```', '');

  const sections = changelogSections(i.changelog, j.sourceVersion);
  out.push('## Changelog', '', sections.length ? `The target release's changelog sections above ${j.sourceVersion}:` : `The target release has no changelog section above ${j.sourceVersion}.`, '');
  if (sections.length) out.push(fenced(sections.join('\n\n')), '');
  return `${out.join('\n')}\n`;
}

function stagedItem(i: ReportInput, o: FileOperation): string[] {
  const s = i.session;
  return [
    `### file:${o.path}`, '',
    `${o.disposition}: ${WHAT[o.disposition] ?? 'Review this file.'}`, '',
    `- base: ${copy(s, 'base', o.base, o.path)}`,
    `- ours: ${copy(s, 'ours', o.ours, o.path)}`,
    `- new: ${copy(s, 'new', o.target, o.path)}`, '',
    'Resolution stub:', '',
    json({ id: `file:${o.path}`, status: 'resolved', reason: '', files: { [o.path]: i.hashOf(o.path) } }), '',
  ];
}
