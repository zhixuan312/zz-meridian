'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Tooltip } from 'radix-ui';
import { useShareView } from '@/components/base/use-share-view';
import { Records } from '@/components/templates/records';
import { Badge, type Tone } from '@/components/ui/badge';
import { AskAbout } from '@/components/patterns/ask-about';
import { MetricTile } from '@/components/patterns/metric-tile';
import { DataTable, useQueryState, useSearchDraft, type Column } from '@/components/patterns/data-table';
import { FilterBar } from '@/components/patterns/filter-bar';
import type { ReleaseRow } from '@/data/engineering';
import { formatRelative } from '@/lib/format-date';
import { useLive, type Revisions } from '@/lib/live';
import { matchingReleases, RELEASE_METRICS, releaseFigures, releaseMoment, releasesContext, stageOf, STAGE_LABEL, unresolvedCounts, unresolvedText, type Stage } from '@/logic/releases-context';

const STAGE_TONE: Record<Stage, Tone> = { testing: 'warning', ready: 'accent', released: 'positive' };
const LABEL = (word: string) => word[0].toUpperCase() + word.slice(1);

/** How many required verifications passed, in the words a row uses: `2 of 3 passed`, or that none are required. */
const passedText = (r: ReleaseRow) => (r.verification.required === 0 ? 'No required verifications' : `${r.verification.passed} of ${r.verification.required} passed`);

/**
 * The releases, newest first, under the three figures the assistant is also told. `now` is the read's observation time, so
 * an age is never fresher than the data. The page changes nothing: a release links to its runs, and that is all.
 */
export function ReleasesView({ rows, now, revisions }: { rows: ReleaseRow[]; now: string; revisions?: Revisions }) {
  useLive(['releases', 'tests'], revisions);
  const asOf = new Date(now);
  const [f, set] = useQueryState({ q: '', state: 'all', environment: 'all', sort: 'changed', dir: 'desc', page: '1' });
  // The box shows each key; the address, and so the list, follows when the typing stops.
  const [draft, setDraft] = useSearchDraft(f.q, (q) => set({ q, page: '1' }));
  const matching = useMemo(() => matchingReleases(rows, { q: f.q, state: f.state, environment: f.environment }), [rows, f.q, f.state, f.environment]);
  const isFiltered = f.q !== '' || f.state !== 'all' || f.environment !== 'all';
  const filters = [f.state !== 'all' && STAGE_LABEL[f.state as Stage]?.toLowerCase(), f.environment !== 'all' && `in ${f.environment}`, f.q && `matching "${f.q}"`].filter(Boolean).join(', ');
  useShareView(releasesContext(rows, now, f));
  const clear = () => set({ q: '', state: 'all', environment: 'all', page: '1' });
  const { live, ready, testing } = releaseFigures(rows);
  const liveIds = new Set(live.map((r) => r.id));

  const columns: Column<ReleaseRow>[] = [
    {
      key: 'version', header: 'Release', grow: true, truncate: true, mobile: 'title', sortValue: (r) => r.version, title: (r) => `${r.version} · ${r.service} · ${r.environment}`,
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{r.version}</span>
            {liveIds.has(r.id) ? <Badge tone="positive">Live</Badge> : null}
          </span>
          <span className="t-caption truncate">{r.service} · {LABEL(r.environment)}</span>
        </span>
      ),
    },
    { key: 'state', header: 'State', mobile: 'status', sortValue: (r) => STAGE_LABEL[stageOf(r)], cell: (r) => <Badge tone={STAGE_TONE[stageOf(r)]} dot>{STAGE_LABEL[stageOf(r)]}</Badge> },
    {
      key: 'verification', header: 'Verification', truncate: true, hideBelow: 'md', mobile: 'fact', sortValue: (r) => r.verification.unresolved.length,
      title: (r) => [passedText(r), ...r.verification.unresolved.map(unresolvedText)].join('; '),
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <Link href={`/tests?release=${encodeURIComponent(r.id)}`} className="truncate font-medium underline-offset-2 hover:underline">{passedText(r)}</Link>
          {r.verification.unresolved.map((u) => <span key={`${u.suite}|${u.endpointId}`} className="t-caption truncate">{unresolvedText(u)}</span>)}
        </span>
      ),
      mobileCell: (r) => (r.verification.unresolved.length ? `${passedText(r)}, ${unresolvedCounts(r.verification.unresolved)}` : passedText(r)),
    },
    { key: 'commit', header: 'Commit', muted: true, hideBelow: 'lg', mobile: 'hidden', sortValue: (r) => r.commit, cell: (r) => <code className="font-mono">{r.commit}</code> },
    {
      key: 'changed', header: 'Released or changed', numeric: true, mobile: 'fact', sortValue: (r) => releaseMoment(r),
      cell: (r) => `${r.releasedAt ? 'Released' : 'Changed'} ${formatRelative(releaseMoment(r), asOf)}`,
    },
  ];

  const M = RELEASE_METRICS;
  return (
    <Records
      empty={!rows.length}
      summary={
        <>
          <MetricTile label={M.live.label} value={live.length} format={(n) => String(n)} hint={M.live.hint} emphasis />
          <MetricTile label={M.ready.label} value={ready} format={(n) => String(n)} hint={M.ready.hint} />
          <MetricTile label={M.testing.label} value={testing} format={(n) => String(n)} hint={M.testing.hint} />
        </>
      }
    >
      {/* The page's protagonist, the list, marked on a wrapper whose display is `contents`. */}
      <div data-protagonist="Releases" className="contents">
        <Tooltip.Provider delayDuration={300} skipDelayDuration={120}>
          <DataTable
            caption="Releases"
            noun="releases"
            rows={matching}
            columns={columns}
            rowKey={(r) => r.id}
            empty={{ title: 'No releases yet', body: 'A release appears here once a version is recorded against a service and an environment.' }}
            state={{ sort: f.sort, dir: f.dir, page: f.page }}
            onStateChange={set}
            filtered={isFiltered}
            onClearFilters={clear}
            toolbar={
              <FilterBar
                ask={<AskAbout question={isFiltered ? `What do the releases ${filters} have in common, and why?` : 'What stands out in the releases, and why?'} />}
                search={{ value: draft, onChange: setDraft, placeholder: 'Search releases' }}
                filters={[
                  { key: 'state', label: 'State', value: f.state, onChange: (state) => set({ state, page: '1' }), options: [{ value: 'all', label: 'All' }, ...(['testing', 'ready', 'released'] as const).map((w) => ({ value: w, label: STAGE_LABEL[w] }))] },
                  { key: 'environment', label: 'Environment', value: f.environment, onChange: (environment) => set({ environment, page: '1' }), options: [{ value: 'all', label: 'All' }, { value: 'staging', label: 'Staging' }, { value: 'production', label: 'Production' }] },
                ]}
                result={<>{matching.length} of {rows.length}</>}
                onClear={clear}
              />
            }
          />
        </Tooltip.Provider>
      </div>
    </Records>
  );
}
