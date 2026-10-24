/**
 * The reads behind Tests and Releases. The pages and the assistant's tools both read here, so what a
 * person sees and what an agent is told come from the same authorized rows, and every count over them is of the whole
 * collection. The rules the rows are joined by are in `verification.ts`, which a client view may import.
 */
import { requireNeed } from '@/data/access';
import { FEATURES } from '@/data/features';
import { readAll } from '@/data/metrics';
import { projectRelease, projectRun } from '@/data/projections';
import type { Release, VerificationRun } from '@/data/sample';
import { verificationOf, type Verification } from '@/data/verification';

/** The revisions the page's reads were served at, by collection; a read of an adapter without one leaves its name out. */
type Revisions = Record<string, string>;
const stamped = (reads: Record<string, { revision?: string }>): Revisions =>
  Object.fromEntries(Object.entries(reads).flatMap(([name, r]) => (r.revision ? [[name, r.revision]] : [])));

/** The release a run belongs to, as far as a run row shows it. The run itself stores none of this. */
type RunRelease = Pick<Release, 'version' | 'service' | 'environment' | 'commit'>;
/** A run as the page and the tool carry it: the record, and the release it names (null when no release has that id). */
export type RunRow = VerificationRun & { release: RunRelease | null };
/** A release as the page and the tool carry it: the record, and what its required verifications come to. */
export type ReleaseRow = Release & { verification: Verification };

/** Every verification run the caller may read, each with the version, service, environment and commit of its release. */
export async function readRuns(): Promise<{ rows: RunRow[]; revisions: Revisions; observedAt: string }> {
  await requireNeed(FEATURES.tests.needs);
  const [runs, releases] = await Promise.all([readAll('tests'), readAll('releases')]);
  const byId = new Map(releases.rows.map((r) => [String(r.id), r]));
  const rows = runs.rows.map((run) => {
    const of = byId.get(String(run.releaseId));
    return projectRun({ ...run, release: of ? { version: of.version, service: of.service, environment: of.environment, commit: of.commit } : null });
  });
  return { rows, revisions: stamped({ tests: runs, releases }), observedAt: runs.observedAt };
}

/** Every release the caller may read, each with what its required verifications come to against every run. */
export async function readReleases(): Promise<{ rows: ReleaseRow[]; revisions: Revisions; observedAt: string }> {
  await requireNeed(FEATURES.releases.needs);
  const [releases, runs] = await Promise.all([readAll('releases'), readAll('tests')]);
  const runRows = runs.rows.map(projectRun);
  const rows = releases.rows.map((row) => {
    const release = projectRelease(row);
    return projectRelease({ ...release, verification: verificationOf(release, runRows) });
  });
  return { rows, revisions: stamped({ releases, tests: runs }), observedAt: releases.observedAt };
}
