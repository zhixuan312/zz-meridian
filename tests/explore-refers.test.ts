// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { aggregateRows, queryRows, type AggregateQuery, type Query } from '@/lib/collection';
import { runExplore, type ExploreIO, type ExploreRights, type PreparedQuery } from '@/lib/explore';

/**
 * A field that holds another collection's key reads with that record's name, in its groups and its drilled rows, so a
 * model told "releases_1: 1 failed" is also told which release that is and never pairs ids with versions by guessing.
 * The record is read under the person's rights: one who may not read the other collection sees the key alone.
 */
type Row = Record<string, unknown>;
const RUNS: Row[] = [
  { id: 'tests_1', releaseId: 'releases_1', state: 'failed' },
  { id: 'tests_2', releaseId: 'releases_1', state: 'passed' },
  { id: 'tests_3', releaseId: 'releases_2', state: 'passed' },
  { id: 'tests_4', releaseId: 'releases_9', state: 'passed' },
];
const RELEASES: Row[] = [
  { id: 'releases_1', version: 'v4.18.2', service: 'Edge gateway', environment: 'production' },
  { id: 'releases_2', version: 'v0.8.3', service: 'Embeddings', environment: 'staging' },
];
const QUERY: PreparedQuery = {
  sources: {
    runs: {
      collection: 'tests',
      filters: { releaseId: { ops: ['eq', 'in'] }, state: { ops: ['eq'] } },
      facets: ['releaseId', 'state'],
      measures: {
        runs: { label: 'Runs', unit: 'runs', definition: 'Runs.', agg: 'count' },
        failed: { label: 'Failed', unit: 'runs', definition: 'Failed runs.', agg: 'count', where: [{ field: 'state', op: 'eq', value: 'failed' }] },
      },
      drill: { columns: ['id', 'releaseId', 'state'], address: (r) => `/tests?release=${String(r.releaseId)}` },
      cannot: '',
      refers: { releaseId: { collection: 'releases', key: 'id', name: (r) => `${String(r.version)}, ${String(r.service)}, ${String(r.environment)}` } },
    },
  },
};
const reads: { name: string; q: Query }[] = [];
const io: ExploreIO = {
  aggregate: async (_: string, q: AggregateQuery) => aggregateRows(RUNS, q),
  read: async (name: string, q: Query) => {
    reads.push({ name, q });
    return queryRows(name === 'releases' ? RELEASES : RUNS, 'id', q);
  },
  today: '2026-10-13',
};
const OWNER: ExploreRights = { readable: new Set(['tests', 'releases']), hidden: () => [] };
const ask = async (input: unknown, rights = OWNER) => (await runExplore(QUERY, input, rights, io, '/releases')).answer;

describe('a field that holds another collection key', () => {
  it("names each group with the record it refers to, and a key no record has as it is", async () => {
    const answer = await ask({ source: 'runs', measures: ['failed', 'runs'], by: 'releaseId' });
    expect(answer).toMatch(/^- releases_1 \(v4\.18\.2, Edge gateway, production\): Failed 1 run, Runs 2 runs$/m);
    expect(answer).toMatch(/^- releases_2 \(v0\.8\.3, Embeddings, staging\): Failed 0 runs, Runs 1 run$/m);
    expect(answer).toMatch(/^- releases_9: Failed 0 runs, Runs 1 run$/m);
  });

  it('names the key in each drilled row too, reading the other collection once', async () => {
    reads.length = 0;
    const answer = await ask({ source: 'runs', measures: ['runs'], by: 'releaseId', rows: 10 });
    expect(answer).toContain('id tests_1, releaseId releases_1 (v4.18.2, Edge gateway, production), state failed');
    expect(answer).toContain('id tests_4, releaseId releases_9, state passed');
    expect(reads.filter((r) => r.name === 'releases')).toHaveLength(1);
  });

  it('reads nothing of a collection the person may not read, and gives the key alone', async () => {
    reads.length = 0;
    const answer = await ask({ source: 'runs', measures: ['runs'], by: 'releaseId', rows: 10 }, { readable: new Set(['tests']), hidden: () => [] });
    expect(answer).toMatch(/^- releases_1: 2 runs$/m);
    expect(answer).not.toContain('v4.18.2');
    expect(reads.some((r) => r.name === 'releases')).toBe(false);
  });

  it("reads the other collection by that collection's own key field", async () => {
    const BY_SLUG: PreparedQuery = { sources: { runs: { ...QUERY.sources.runs, refers: { releaseId: { collection: 'releases', key: 'slug', name: (r) => String(r.version) } } } } };
    const slugged: ExploreIO = { ...io, read: async (name: string, q: Query) => queryRows(name === 'releases' ? RELEASES.map((r) => ({ slug: r.id, version: r.version })) : RUNS, name === 'releases' ? 'slug' : 'id', q) };
    const answer = (await runExplore(BY_SLUG, { source: 'runs', measures: ['runs'], by: 'releaseId' }, OWNER, slugged, '/releases')).answer;
    expect(answer).toMatch(/^- releases_1 \(v4\.18\.2\): 2 runs$/m);
  });

  it('is not read for a call that neither groups by it nor drills it', async () => {
    reads.length = 0;
    await ask({ source: 'runs', measures: ['runs'], by: 'state' });
    expect(reads).toHaveLength(0);
  });
});
