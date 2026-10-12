/**
 * Tests and verification's shared context (decision 0011): how many verifications have a latest run, how many of those
 * are failing, and the runs the person has filtered to, as both agents read it. The counts are of every run, whatever the
 * filters show, and are the same figures the page's tiles draw.
 */
import type { RunRow } from '@/data/engineering';
import { latestRuns } from '@/data/verification';
import { formatDuration } from '@/lib/format';
import { formatRelative } from '@/lib/format-date';
import { listed, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';

type TestsState = { q: string; state: string; release: string };

/** The tiles' labels and what they count: the info buttons show the hints and the facts carry the same labels. */
export const TEST_METRICS = {
  latest: { label: 'Latest runs', hint: 'Verifications with a run: one for each release, suite and endpoint, the one that started last. Earlier runs of the same verification are history.' },
  failing: { label: 'Failing now', hint: 'Latest runs that failed. A run that failed and was followed by a pass is not counted.' },
  skipped: { label: 'Skipped now', hint: 'Latest runs that were skipped, so the verification has not been shown to pass.' },
} as const;

/** The three figures the tiles show and the assistant is told, worked out once from every run passed in. */
export function testFigures(rows: RunRow[]): { latest: RunRow[]; failing: RunRow[]; skipped: RunRow[] } {
  const latest = latestRuns(rows);
  return { latest, failing: latest.filter((r) => r.state === 'failed'), skipped: latest.filter((r) => r.state === 'skipped') };
}

/** The route of an endpoint id (`POST /v1/messages` is `/v1/messages`): what the requests search matches. */
export const routeOf = (endpointId: string) => endpointId.split(' ').slice(1).join(' ') || endpointId;

/** The runs a search, the verdict filter and a release let through, newest start first: the table's default order. */
export function matchingRuns(rows: RunRow[], f: TestsState): RunRow[] {
  const q = f.q.trim().toLowerCase();
  return rows
    .filter((r) => (f.state === 'all' || r.state === f.state) && (!f.release || r.releaseId === f.release))
    .filter((r) => !q || [r.suite, r.endpointId, r.failure ?? '', r.release?.version ?? '', r.release?.service ?? '', r.release?.commit ?? ''].some((x) => x.toLowerCase().includes(q)))
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : a.id < b.id ? 1 : -1));
}

export function testsAddress(f: TestsState): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.state !== 'all') p.set('state', f.state);
  if (f.release) p.set('release', f.release);
  return `/tests${p.size ? `?${p}` : ''}`;
}

/** A run in a sentence: what ran, against which release, how it ended and when. */
const say = (r: RunRow, at: Date) =>
  `${r.suite} on ${r.endpointId} for ${r.release ? `${r.release.version} (${r.release.service}, ${r.release.environment})` : 'an unknown release'}: ${r.state}${r.failure ? ` (${r.failure.slice(0, 120)})` : ''}, ${formatDuration(r.durationMs)}, started ${formatRelative(r.startedAt, at)}`;

export function testsContext(rows: RunRow[], now: string, f: TestsState): SharedContext {
  const at = new Date(now);
  const { latest, failing, skipped } = testFigures(rows);
  const matching = matchingRuns(rows, f);
  const filters = [f.state !== 'all' && `verdict ${f.state}`, f.release && `release ${f.release}`, f.q && `matching "${f.q}"`].filter(Boolean).join(', ');
  const M = TEST_METRICS;
  const more = 'query_tests finds them';
  const facts: Fact[] = [
    { label: M.latest.label, value: String(latest.length), definition: M.latest.hint },
    { label: M.failing.label, value: String(failing.length), definition: M.failing.hint },
    { label: M.skipped.label, value: String(skipped.length), definition: M.skipped.hint },
    { label: filters ? 'Matching' : 'Shown', value: `${matching.length} of ${rows.length}, newest start first: ${listed(matching, (r) => `${r.id}, ${say(r, at)}`, more, 10)}` },
  ];

  const insights: Insight[] = [];
  if (failing.length) insights.push({ text: `${failing.length} latest ${failing.length === 1 ? 'run is' : 'runs are'} failing: ${listed(failing, (r) => say(r, at), more, 5)}.` });

  return {
    view: 'tests',
    title: 'Tests and verification',
    address: testsAddress(f),
    scope: filters ? `every verification run of this workspace, shown with ${filters}` : 'every verification run of this workspace',
    facts,
    insights,
    unknowns: ['The page only shows what ran: nothing here reruns a verification, and the runs are recorded outside this product.'],
  };
}
