/**
 * The reads behind Tests and Releases. The pages and the assistant's tools both read here, so what a
 * person sees and what an agent is told come from the same authorized rows, and every count over them is of the whole
 * collection. The rules the rows are joined by are in `verification.ts`, which a client view may import.
 */
import { requireNeed } from '@/data/access';
import { FEATURES } from '@/data/features';
import { readAll } from '@/data/read';
import type { Release, VerificationRun } from '@/data/sample';
import { verificationOf, type Verification } from '@/data/verification';

/** The release a run belongs to, as far as a run row shows it. The run itself stores none of this. */
type RunRelease = Pick<Release, 'version' | 'service' | 'environment' | 'commit'>;
/** A run as the page and the tool carry it: the record, and the release it names (null when no release has that id). */
export type RunRow = VerificationRun & { release: RunRelease | null };
/** A release as the page and the tool carry it: the record, and what its required verifications come to. */
export type ReleaseRow = Release & { verification: Verification };

/** Every verification run the caller may read, each with the version, service, environment and commit of its release. */
export async function readRuns(): Promise<{ rows: RunRow[]; observedAt: string }> {
  await requireNeed(FEATURES.tests.needs);
  const [runs, releases] = await Promise.all([readAll('tests'), readAll('releases')]);
  const byId = new Map((releases.rows as Release[]).map((r) => [r.id, r]));
  const rows = (runs.rows as VerificationRun[]).map((run): RunRow => {
    const of = byId.get(run.releaseId);
    return { ...run, release: of ? { version: of.version, service: of.service, environment: of.environment, commit: of.commit } : null };
  });
  return { rows, observedAt: runs.observedAt };
}

/** Every release the caller may read, each with what its required verifications come to against every run. */
export async function readReleases(): Promise<{ rows: ReleaseRow[]; observedAt: string }> {
  await requireNeed(FEATURES.releases.needs);
  const [releases, runs] = await Promise.all([readAll('releases'), readAll('tests')]);
  return { rows: (releases.rows as Release[]).map((r) => ({ ...r, verification: verificationOf(r, runs.rows as VerificationRun[]) })), observedAt: releases.observedAt };
}
