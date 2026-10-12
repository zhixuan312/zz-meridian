/**
 * Releases' shared context (decision 0011): which version is live in each environment, which are ready and which are
 * still in testing and for what, as both agents read it. The counts are of every release, whatever the filters show, and
 * are the same figures the page's tiles draw.
 */
import type { ReleaseRow } from '@/data/engineering';
import type { Release } from '@/data/sample';
import { currentVersions, type Unresolved } from '@/data/verification';
import { formatRelative } from '@/lib/format-date';
import { listed, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';

export type ReleasesState = { q: string; state: string; environment: string };

/** A release in the product's words: still being verified, ready to go out, or out. */
export type Stage = 'testing' | 'ready' | 'released';
export const STAGE_LABEL: Record<Stage, string> = { testing: 'In testing', ready: 'Ready to release', released: 'Released' };

/** Testing means a required verification is missing, failed or skipped; ready means all passed and it has not gone out. */
export function stageOf(r: ReleaseRow): Stage {
  if (r.state === 'released') return 'released';
  return r.verification.unresolved.length > 0 ? 'testing' : 'ready';
}

/** The tiles' labels and what they count: the info buttons show the hints and the facts carry the same labels. */
export const RELEASE_METRICS = {
  live: { label: 'Live versions', hint: 'The version released last for each service and environment. A release that has not gone out is never live.' },
  ready: { label: 'Ready to release', hint: 'Releases whose every required verification has passed and that have not gone out.' },
  testing: { label: 'In testing', hint: 'Releases that have not gone out and still wait for a required verification: it has no run, or its latest run failed or was skipped.' },
} as const;

/** The three figures the tiles show and the assistant is told, worked out once from every release passed in. */
export function releaseFigures(rows: ReleaseRow[]): { live: ReleaseRow[]; ready: number; testing: number } {
  return { live: currentVersions(rows), ready: rows.filter((r) => stageOf(r) === 'ready').length, testing: rows.filter((r) => stageOf(r) === 'testing').length };
}

/** What a release waits for, in a line: `load on POST /v1/messages: no run yet`. */
export function unresolvedText(u: Unresolved): string {
  return `${u.suite} on ${u.endpointId}: ${u.state === 'missing' ? 'no run yet' : u.state}`;
}

/** When a release went out, or else when it last changed. */
export const releaseMoment = (r: Pick<Release, 'releasedAt' | 'updatedAt'>) => r.releasedAt ?? r.updatedAt;

/** The releases a search and the two filters let through, newest first: the table's default order. */
export function matchingReleases(rows: ReleaseRow[], f: ReleasesState): ReleaseRow[] {
  const q = f.q.trim().toLowerCase();
  return rows
    .filter((r) => (f.state === 'all' || stageOf(r) === f.state) && (f.environment === 'all' || r.environment === f.environment))
    .filter((r) => !q || [r.version, r.service, r.commit].some((x) => x.toLowerCase().includes(q)))
    .sort((a, b) => (releaseMoment(a) < releaseMoment(b) ? 1 : releaseMoment(a) > releaseMoment(b) ? -1 : 0));
}

export function releasesAddress(f: ReleasesState): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.state !== 'all') p.set('state', f.state);
  if (f.environment !== 'all') p.set('environment', f.environment);
  return `/releases${p.size ? `?${p}` : ''}`;
}

export function releasesContext(rows: ReleaseRow[], now: string, f: ReleasesState): SharedContext {
  const at = new Date(now);
  const { live, ready, testing } = releaseFigures(rows);
  const matching = matchingReleases(rows, f);
  const filters = [f.state !== 'all' && `state ${STAGE_LABEL[f.state as Stage] ?? f.state}`, f.environment !== 'all' && `environment ${f.environment}`, f.q && `matching "${f.q}"`].filter(Boolean).join(', ');
  const M = RELEASE_METRICS;
  const more = 'query_releases finds them';
  const facts: Fact[] = [
    { label: M.live.label, value: String(live.length), definition: M.live.hint },
    { label: M.ready.label, value: String(ready), definition: M.ready.hint },
    { label: M.testing.label, value: String(testing), definition: M.testing.hint },
    { label: 'Live now', value: live.length ? listed(live, (r) => `${r.service} in ${r.environment}: ${r.version} (${r.commit}, released ${formatRelative(r.releasedAt!, at)})`, more, 10) : 'nothing has been released' },
    {
      label: filters ? 'Matching' : 'Shown',
      value: `${matching.length} of ${rows.length}, newest first: ${listed(matching, (r) => `${r.version} (${r.id}, ${r.service}, ${r.environment}, ${STAGE_LABEL[stageOf(r)]}, ${r.verification.passed} of ${r.verification.required} verifications passed, commit ${r.commit})`, more, 10)}`,
    },
  ];

  const insights: Insight[] = [];
  const waiting = rows.filter((r) => stageOf(r) === 'testing');
  if (waiting.length) insights.push({ text: `${waiting.length} ${waiting.length === 1 ? 'release is' : 'releases are'} still in testing: ${listed(waiting, (r) => `${r.version} of ${r.service} waits for ${r.verification.unresolved.map(unresolvedText).join(', ')}`, more, 5)}.` });

  return {
    view: 'releases',
    title: 'Releases',
    address: releasesAddress(f),
    scope: filters ? `every release of this workspace, shown with ${filters}` : 'every release of this workspace',
    facts,
    insights,
    unknowns: ['The page only shows where each release stands: nothing here deploys, publishes or rolls back a version.'],
  };
}
