// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { collections } from '@/data/collections';
import { readReleases, readRuns } from '@/data/engineering';
import { currentVersions, latestRuns, verificationOf } from '@/data/verification';
import { viewTools } from '@/views/tools';

type Row = Record<string, unknown>;
const ids = (rows: unknown) => (rows as Row[]).map((r) => r.id);
const all = async (name: string) => (await collections.find((c) => c.name === name)!.query({})).rows as Row[];
const tool = (name: string) => viewTools.find((t) => t.name === name)!;
const fact = async (name: string, label: string) => (await tool(name).read({})).context.facts.find((f) => f.label === label)?.value;

const run = (id: string, over: Row = {}) => ({ id, suite: 'contract', endpointId: 'POST /v1/messages', releaseId: 'rel_a', state: 'passed', durationMs: 1200, startedAt: '2026-10-01T10:00:00.000Z', failure: null, ...over }) as never;
const release = (over: Row = {}) => ({ id: 'rel_a', version: '4.2.0', service: 'Edge gateway', environment: 'production', commit: 'a1b2c3d', state: 'pending', updatedAt: '2026-10-02T10:00:00.000Z', releasedAt: null, notes: '', requiredVerifications: [{ suite: 'contract', endpointId: 'POST /v1/messages' }, { suite: 'load', endpointId: 'POST /v1/messages' }], ...over }) as never;
const failed = { state: 'failed', failure: 'Timed out after 30 s' };

beforeEach(() => { jar.value = 'members_12'; });

describe('the latest run of a verification', () => {
  it('is the one that started last, for each release, suite and endpoint', () => {
    const runs = [run('t_1'), run('t_2', { startedAt: '2026-10-01T12:00:00.000Z', ...failed }), run('t_3', { suite: 'load' }), run('t_4', { releaseId: 'rel_b' }), run('t_5', { endpointId: 'GET /v1/search' })];
    expect(ids(latestRuns(runs)).sort()).toEqual(['t_2', 't_3', 't_4', 't_5']);
  });

  it('is, of two that started together, the one whose id sorts last as text, whatever order they arrive in', () => {
    const pair = [run('t_8', failed), run('t_9')];
    expect(ids(latestRuns(pair))).toEqual(['t_9']);
    expect(ids(latestRuns([...pair].reverse()))).toEqual(['t_9']);
    const longer = [run('t_10', failed), run('t_9')];
    expect(ids(latestRuns(longer))).toEqual(['t_9']);
    expect(ids(latestRuns([...longer].reverse()))).toEqual(['t_9']);
  });
});

describe('what a release still waits for', () => {
  it('is every required verification with no run, or whose latest run failed or was skipped', () => {
    expect(verificationOf(release(), [])).toMatchObject({ required: 2, passed: 0, unresolved: [{ suite: 'contract', endpointId: 'POST /v1/messages', state: 'missing' }, { suite: 'load', endpointId: 'POST /v1/messages', state: 'missing' }] });
    expect(verificationOf(release(), [run('t_1'), run('t_2', { suite: 'load', ...failed })])).toMatchObject({ required: 2, passed: 1, unresolved: [{ suite: 'load', state: 'failed' }] });
    expect(verificationOf(release(), [run('t_1'), run('t_2', { suite: 'load', state: 'skipped' })]).unresolved).toMatchObject([{ suite: 'load', state: 'skipped' }]);
  });

  it('is nothing once the latest run of each has passed, however many failed before it', () => {
    const runs = [run('t_1', failed), run('t_2', { startedAt: '2026-10-01T12:00:00.000Z' }), run('t_3', { suite: 'load' })];
    expect(verificationOf(release(), runs)).toMatchObject({ required: 2, passed: 2, unresolved: [] });
  });

  it('never counts a run of another release, or of a verification the release does not require', () => {
    const runs = [run('t_1', { releaseId: 'rel_b' }), run('t_2', { suite: 'smoke' })];
    expect(verificationOf(release(), runs)).toMatchObject({ passed: 0 });
    expect(verificationOf(release(), runs).unresolved.length).toBe(2);
  });

  it('shows a record that says pending while a run is failing for what it is: not resolved', () => {
    const planted = release({ state: 'pending' });
    expect(verificationOf(planted, [run('t_1'), run('t_2', { suite: 'load', ...failed })]).unresolved.length).toBeGreaterThan(0);
  });
});

describe('the version that is live', () => {
  it('is the one released last for each service and environment, and never one that is not released', () => {
    const releases = [
      release({ id: 'rel_a', version: '4.1.0', state: 'released', releasedAt: '2026-09-20T10:00:00.000Z' }),
      release({ id: 'rel_b', version: '4.2.0', state: 'released', releasedAt: '2026-09-28T10:00:00.000Z' }),
      release({ id: 'rel_c', version: '4.3.0', state: 'pending' }),
      release({ id: 'rel_d', version: '4.2.0', environment: 'staging', state: 'released', releasedAt: '2026-09-25T10:00:00.000Z' }),
    ];
    expect(ids(currentVersions(releases)).sort()).toEqual(['rel_b', 'rel_d']);
  });
});

describe('the sample, read the way the pages read it', () => {
  it('keeps a run to what a run is: its release is a relation, not a copy', async () => {
    for (const r of await all('tests')) expect(Object.keys(r).sort()).toEqual(['durationMs', 'endpointId', 'failure', 'id', 'releaseId', 'startedAt', 'state', 'suite']);
    const releases = await all('releases');
    const { rows } = await readRuns();
    expect(rows.length).toBe((await all('tests')).length);
    for (const r of rows as unknown as Row[]) {
      const of = releases.find((x) => x.id === r.releaseId)!;
      expect(r.release, String(r.id)).toEqual({ version: of.version, service: of.service, environment: of.environment, commit: of.commit });
    }
  });

  it('gives every release the state its verifications say, by the same rule the page shows', async () => {
    const runs = await all('tests');
    const { rows } = await readReleases();
    expect(rows.length).toBe((await all('releases')).length);
    for (const r of rows as unknown as Row[]) {
      expect(r.verification, String(r.id)).toEqual(verificationOf(r as never, runs as never));
      expect(r.state === 'testing', `${r.id} is ${r.state}`).toBe((r.verification as { unresolved: unknown[] }).unresolved.length > 0);
    }
  });

  it('tells the assistant the figures the whole collections give, under the labels the pages use', async () => {
    const [runs, releases] = [await all('tests'), await all('releases')];
    const latest = latestRuns(runs as never) as unknown as Row[];
    expect(await fact('tests', 'Latest runs')).toBe(String(latest.length));
    expect(await fact('tests', 'Failing now')).toBe(String(latest.filter((r) => r.state === 'failed').length));
    expect(await fact('releases', 'Live versions')).toBe(String(currentVersions(releases as never).length));
    expect(await fact('releases', 'Ready to release')).toBe(String(releases.filter((r) => r.state === 'pending').length));
    expect(await fact('releases', 'In testing')).toBe(String(releases.filter((r) => r.state === 'testing').length));
  });
});
