'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Tooltip } from 'radix-ui';
import { useShareView } from '@/components/base/use-share-view';
import { Records } from '@/components/templates/records';
import { Badge, type Tone } from '@/components/ui/badge';
import { MetricTile } from '@/components/patterns/metric-tile';
import { DataTable, useQueryState, useSearchDraft, type Column } from '@/components/patterns/data-table';
import { FilterBar } from '@/components/patterns/filter-bar';
import type { RunRow } from '@/data/engineering';
import { formatDuration } from '@/lib/format';
import { formatRelative } from '@/lib/format-date';
import { useLive } from '@/lib/live';
import { matchingRuns, routeOf, TEST_METRICS, testFigures, testsContext } from './tests-context';

const VERDICT_TONE: Record<RunRow['state'], Tone> = { passed: 'positive', failed: 'critical', skipped: 'warning' };
const LABEL = (word: string) => word[0].toUpperCase() + word.slice(1);
const link = 'underline-offset-2 hover:underline';

/**
 * The verification runs, newest first, under the three figures the assistant is also told. `now` is the read's observation
 * time, so an age is never fresher than the data. The page changes nothing: a run links to its release and to the requests
 * of its endpoint, and that is all.
 */
export function TestsView({ rows, now }: { rows: RunRow[]; now: string }) {
  useLive(['tests', 'releases']);
  const asOf = new Date(now);
  const [f, set] = useQueryState({ q: '', state: 'all', release: '', runs: 'all', sort: 'started', dir: 'desc', page: '1' });
  // The box shows each key; the address, and so the list, follows when the typing stops.
  const [draft, setDraft] = useSearchDraft(f.q, (q) => set({ q, page: '1' }));
  const matching = useMemo(() => matchingRuns(rows, { q: f.q, state: f.state, release: f.release, runs: f.runs }), [rows, f.q, f.state, f.release, f.runs]);
  const isFiltered = f.q !== '' || f.state !== 'all' || f.release !== '' || f.runs !== 'all';
  useShareView(testsContext(rows, now, f));
  const clear = () => set({ q: '', state: 'all', release: '', runs: 'all', page: '1' });
  const { latest, failing, skipped } = testFigures(rows);
  const of = f.release ? rows.find((r) => r.releaseId === f.release)?.release : undefined;

  const columns: Column<RunRow>[] = [
    {
      key: 'suite', header: 'Verification', grow: true, truncate: true, mobile: 'title', sortValue: (r) => r.suite, title: (r) => `${r.suite} on ${r.endpointId}`,
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{LABEL(r.suite)}</span>
          <Link href={`/requests?q=${encodeURIComponent(routeOf(r.endpointId))}`} className={`t-caption truncate ${link}`}>{r.endpointId}</Link>
        </span>
      ),
      // A card on a phone is text: a link one line of caption high is no target for a thumb.
      mobileCell: (r) => `${LABEL(r.suite)} on ${r.endpointId}`,
    },
    {
      key: 'release', header: 'Release', truncate: true, hideBelow: 'md', mobile: 'fact', sortValue: (r) => r.release?.version ?? '', title: (r) => (r.release ? `${r.release.version} · ${r.release.service} · ${r.release.environment} · ${r.release.commit}` : 'Release unavailable'),
      cell: (r) => (r.release ? (
        <span className="flex min-w-0 flex-col">
          <Link href={`/releases?q=${encodeURIComponent(r.release.version)}`} className={`truncate font-medium ${link}`}>{r.release.version}</Link>
          <span className="t-caption truncate">{r.release.service} · {r.release.environment} · {r.release.commit}</span>
        </span>
      ) : <span className="text-ink-3">Unavailable</span>),
      mobileCell: (r) => (r.release ? `${r.release.version} on ${r.release.service}` : 'Release unavailable'),
    },
    { key: 'state', header: 'Verdict', mobile: 'status', sortValue: (r) => r.state, cell: (r) => <Badge tone={VERDICT_TONE[r.state]} dot>{LABEL(r.state)}</Badge> },
    { key: 'duration', header: 'Duration', numeric: true, muted: true, hideBelow: 'lg', mobile: 'fact', sortValue: (r) => r.durationMs, cell: (r) => (r.state === 'skipped' ? 'Not run' : formatDuration(r.durationMs)), mobileCell: (r) => (r.state === 'skipped' ? 'Not run' : formatDuration(r.durationMs)) },
    { key: 'started', header: 'Started', numeric: true, mobile: 'fact', sortValue: (r) => r.startedAt, cell: (r) => formatRelative(r.startedAt, asOf), mobileCell: (r) => `Started ${formatRelative(r.startedAt, asOf)}` },
    {
      key: 'failure', header: 'Why it failed', muted: true, truncate: true, hideBelow: 'lg', mobile: 'hidden', sortValue: (r) => r.failure ?? '', title: (r) => r.failure ?? '',
      cell: (r) => r.failure ?? <span className="text-ink-3">{'—'}</span>,
    },
  ];

  const M = TEST_METRICS;
  return (
    <Records
      summary={
        <>
          <MetricTile label={M.latest.label} value={latest.length} format={(n) => String(n)} hint={M.latest.hint} emphasis />
          <MetricTile label={M.failing.label} value={failing.length} format={(n) => String(n)} hint={M.failing.hint} />
          <MetricTile label={M.skipped.label} value={skipped.length} format={(n) => String(n)} hint={M.skipped.hint} />
        </>
      }
    >
      {f.release ? (
        <p className="t-caption max-w-[72ch]">
          Runs of {of ? `${of.version} (${of.service}, ${of.environment})` : f.release}. <Link href="/tests" className="underline">All runs</Link>
        </p>
      ) : null}
      <Tooltip.Provider delayDuration={300} skipDelayDuration={120}>
        <DataTable
          caption="Verification runs"
          noun="runs"
          rows={matching}
          columns={columns}
          rowKey={(r) => r.id}
          empty={{ title: 'No runs yet', body: 'A run appears here once a suite has run against an endpoint of a release.' }}
          state={{ sort: f.sort, dir: f.dir, page: f.page }}
          onStateChange={set}
          filtered={isFiltered}
          onClearFilters={clear}
          toolbar={
            <FilterBar
              search={{ value: draft, onChange: setDraft, placeholder: 'Search runs' }}
              filters={[
                { key: 'state', label: 'Verdict', value: f.state, onChange: (state) => set({ state, page: '1' }), options: [{ value: 'all', label: 'All' }, ...['passed', 'failed', 'skipped'].map((w) => ({ value: w, label: LABEL(w) }))] },
                // What the tiles count: the latest run of each verification, without the runs it replaced.
                { key: 'runs', label: 'Runs', value: f.runs, onChange: (runs) => set({ runs, page: '1' }), options: [{ value: 'all', label: 'All' }, { value: 'latest', label: 'Latest of each' }] },
              ]}
              result={<>{matching.length} of {rows.length}</>}
              onClear={clear}
            />
          }
        />
      </Tooltip.Provider>
    </Records>
  );
}
