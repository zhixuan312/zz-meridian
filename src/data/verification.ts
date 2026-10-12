/**
 * The three rules that turn runs and releases into what a person reads: which run is the latest of a verification, what a
 * release has not passed, and which version is live. Pages, the view tools and the reads all use these, so a figure on a
 * page and the same figure told to the assistant cannot differ.
 *
 * Pure functions with type-only imports and no server import of any kind, because the client views import this file.
 */
import type { Release, VerificationRun } from '@/data/sample';

/** One required verification that is not satisfied, and why: no run of it, or its latest run failed or was skipped. */
export type Unresolved = { suite: string; endpointId: string; state: 'missing' | 'failed' | 'skipped' };

/** What a release's required verifications come to: how many there are, how many passed, and the ones that did not. */
export type Verification = { required: number; passed: number; unresolved: Unresolved[] };

const pairOf = (r: Pick<VerificationRun, 'releaseId' | 'suite' | 'endpointId'>) => JSON.stringify([r.releaseId, r.suite, r.endpointId]);

/** Whether `a` is the later run: it started later, or at the same moment and its id sorts last as plain text (`t_9` after `t_10`). */
const later = (a: VerificationRun, b: VerificationRun) => (a.startedAt === b.startedAt ? a.id > b.id : a.startedAt > b.startedAt);

/** One run for each release, suite and endpoint: the one that started last, whatever order the runs arrive in. */
export function latestRuns<T extends VerificationRun>(runs: T[]): T[] {
  const best = new Map<string, T>();
  for (const r of runs) {
    const key = pairOf(r);
    const have = best.get(key);
    if (!have || later(r, have)) best.set(key, r);
  }
  return [...best.values()];
}

/**
 * Every required verification of `release` whose latest run is not a pass, in the order the release declares them. Only
 * runs of this release count, and only those of a pair it requires.
 */
export function verificationOf(release: Pick<Release, 'id' | 'requiredVerifications'>, runs: VerificationRun[]): Verification {
  const latest = new Map(latestRuns(runs.filter((r) => r.releaseId === release.id)).map((r) => [pairOf(r), r]));
  const unresolved: Unresolved[] = [];
  for (const { suite, endpointId } of release.requiredVerifications) {
    const run = latest.get(pairOf({ releaseId: release.id, suite, endpointId }));
    if (!run) unresolved.push({ suite, endpointId, state: 'missing' });
    else if (run.state !== 'passed') unresolved.push({ suite, endpointId, state: run.state });
  }
  const required = release.requiredVerifications.length;
  return { required, passed: required - unresolved.length, unresolved };
}

/** For each service and environment, the release that went out last. A release that has not gone out is never live. */
export function currentVersions<T extends Release>(releases: T[]): T[] {
  const best = new Map<string, T>();
  for (const r of releases) {
    if (r.state !== 'released' || !r.releasedAt) continue;
    const key = JSON.stringify([r.service, r.environment]);
    const have = best.get(key);
    if (!have || r.releasedAt > have.releasedAt!) best.set(key, r);
  }
  return [...best.values()];
}
