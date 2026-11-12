// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  keepProblems, parseJournal, parseKeep, parseResolutions, planHash, unresolved, verifiedRetirements, type Hash, type Resolution, type UpdateJournal,
} from '../scripts/lib/update-session.ts';

const h = (c: string) => `sha256-${c.repeat(64)}` as const;
const side = (hash: Hash | null) => ({ exists: hash !== null, hash });
const manifest = (version: string, files: Record<string, string>) => ({ version, route: 'adopt' as const, brand: { name: 'Acme' }, files });

function journal(over: Partial<UpdateJournal> = {}): UpdateJournal {
  const j = {
    id: '20261005T090000Z-abc123',
    sourceVersion: '0.3.0',
    targetVersion: '0.5.0',
    route: 'adopt',
    originalManifest: manifest('0.3.0', { 'src/a.ts': h('a'), 'src/b.ts': h('b'), 'src/gone.ts': h('d') }),
    targetManifest: manifest('0.5.0', { 'src/a.ts': h('1'), 'src/b.ts': h('2') }),
    targetIntegrity: 'sha512-test',
    planHash: h('0'),
    phase: 'needs-resolution',
    operations: [
      { path: 'src/a.ts', disposition: 'untouched', action: 'write', base: side(h('a')), ours: side(h('a')), target: side(h('1')), applied: true, appliedHash: h('1') },
      { path: 'src/b.ts', disposition: 'edited', action: 'stage', base: side(h('b')), ours: side(h('e')), target: side(h('2')), applied: false, appliedHash: null },
      { path: 'src/gone.ts', disposition: 'retired-kept', action: 'leave', base: side(h('d')), ours: side(h('f')), target: side(null), applied: false, appliedHash: null },
    ],
    migrations: [{ id: 'script:demo', summary: 'Your demo script differs from Meridian\'s.', paths: ['package.json'], instructions: 'Point demo at node scripts/demo.ts.', checks: ['test:t1'] }],
    retired: [{ path: 'src/gone.ts', baselineHash: h('d'), reason: 'kept by the team' }],
    keptDeletions: [],
    validation: [],
    failure: null,
    ...over,
  } as UpdateJournal;
  return { ...j, planHash: over.planHash ?? planHash(j) };
}
const disk: Record<string, string> = { 'src/a.ts': h('1'), 'src/b.ts': h('e'), 'src/gone.ts': h('f'), 'package.json': h('c') };
const hashOf = (p: string) => (disk[p] ?? null) as ReturnType<Parameters<typeof unresolved>[2]>;
const resolved: Resolution[] = [
  { id: 'file:src/b.ts', status: 'resolved', reason: 'Ours is deliberate.', files: { 'src/b.ts': h('e') } },
  { id: 'migration:script:demo', status: 'resolved', reason: 'Renamed ours to demo:team.', files: { 'package.json': h('c') } },
];

describe('parseJournal', () => {
  it('reads a valid journal back', () => expect(parseJournal(JSON.stringify(journal()))).toEqual(journal()));
  it('refuses an unknown phase', () => expect(() => parseJournal(JSON.stringify({ ...journal(), phase: 'done' }))).toThrow(/phase/));
  it("refuses an id that is not one folder's name, since archive() joins it into a path", () => {
    for (const id of ['../escape', 'a/b', '..', '.', 'a\\b']) expect(() => parseJournal(JSON.stringify({ ...journal(), id })), id).toThrow(/plain folder name/);
  });
  it('refuses a side whose existence and hash disagree', () => {
    const j = journal();
    j.operations[0].base = { exists: true, hash: null };
    expect(() => parseJournal(JSON.stringify(j))).toThrow();
  });
  it('refuses an unsafe path', () => {
    const j = journal();
    j.operations[0].path = '../outside.ts';
    expect(() => parseJournal(JSON.stringify(j))).toThrow();
  });
});

describe('unresolved', () => {
  it('lists the staged path and the migration until they are resolved', () => {
    const out = unresolved(journal(), [], hashOf).join('\n');
    expect(out).toMatch(/file:src\/b\.ts/);
    expect(out).toMatch(/migration:script:demo/);
  });
  it('is empty once every item has a valid, current resolution', () => expect(unresolved(journal(), resolved, hashOf)).toEqual([]));
  it('accepts a not-applicable migration with a reason and the inspected hashes', () => {
    expect(unresolved(journal(), [resolved[0], { id: 'migration:script:demo', status: 'not-applicable', reason: 'We have no demo script.', files: { 'package.json': h('c') } }], hashOf)).toEqual([]);
  });
  it('reports a resolution whose file changed since it was recorded', () => {
    expect(unresolved(journal(), [{ ...resolved[0], files: { 'src/b.ts': h('9') } }, resolved[1]], hashOf).join('\n')).toMatch(/file:src\/b\.ts/);
  });
  it('reports a resolution that does not name the file it resolves', () => {
    expect(unresolved(journal(), [{ ...resolved[0], files: {} }, resolved[1]], hashOf).join('\n')).toMatch(/file:src\/b\.ts/);
  });
  it('reports a blank reason', () => expect(unresolved(journal(), [{ ...resolved[0], reason: '  ' }, resolved[1]], hashOf)).not.toEqual([]));
  it('reports an unknown and a duplicate resolution', () => {
    expect(unresolved(journal(), [...resolved, { id: 'file:src/none.ts', status: 'resolved', reason: 'x', files: { 'src/none.ts': null } }], hashOf).join('\n')).toMatch(/src\/none\.ts/);
    expect(unresolved(journal(), [...resolved, resolved[0]], hashOf)).not.toEqual([]);
  });
  it('reports a write that was never applied', () => {
    const j = journal();
    j.operations[0] = { ...j.operations[0], applied: false, appliedHash: null };
    expect(unresolved(j, resolved, hashOf).join('\n')).toMatch(/src\/a\.ts/);
  });
  it.each([h('9'), null])('reports an automatic managed write whose current hash is %s', (now) => {
    const current = (p: string) => p === 'src/a.ts' ? now : hashOf(p);
    expect(unresolved(journal(), resolved, current).join('\n')).toContain('src/a.ts: changed after the update applied it');
  });
  it('reports a recreated automatic removal, but accepts its planned absence', () => {
    const j = journal();
    j.operations.push({ path: 'src/deleted.ts', disposition: 'removed', action: 'delete', base: side(h('d')), ours: side(h('d')), target: side(null), applied: true, appliedHash: null });
    j.planHash = planHash(j);
    expect(unresolved(j, resolved, hashOf)).toEqual([]);
    expect(unresolved(j, resolved, (p) => p === 'src/deleted.ts' ? h('9') : hashOf(p)).join('\n')).toContain('src/deleted.ts: changed after the update applied it');
  });
  it('allows later edits to shared team-owned writes and kept files', () => {
    const j = journal();
    j.operations.push({ path: 'package.json', disposition: 'team-preserved', action: 'write', base: side(h('a')), ours: side(h('a')), target: side(h('b')), applied: true, appliedHash: h('b') });
    j.planHash = planHash(j);
    expect(unresolved(j, resolved, (p) => p === 'src/gone.ts' ? h('9') : hashOf(p))).toEqual([]);
  });
  it('reports an edited plan', () => expect(unresolved(journal({ planHash: h('0') }), resolved, hashOf).join('\n')).toMatch(/plan/));
  it('sends an interrupted apply to resume', () => expect(unresolved(journal({ phase: 'applying' }), resolved, hashOf).join('\n')).toMatch(/resume/));
});

describe('retirements and the keep register', () => {
  it('trusts a retirement only when the original manifest recorded that baseline', () => {
    expect(verifiedRetirements(journal())).toEqual([{ path: 'src/gone.ts', baselineHash: h('d'), reason: 'kept by the team' }]);
    expect(verifiedRetirements(journal({ retired: [{ path: 'src/gone.ts', baselineHash: h('3'), reason: 'forged' }] }))).toEqual([]);
  });
  it('parses exactly path and reason, unique and safe', () => {
    expect(parseKeep('[{"path":"src/a.ts","reason":"Deliberate."}]')).toEqual([{ path: 'src/a.ts', reason: 'Deliberate.' }]);
    for (const bad of ['{}', '[{"path":"src/a.ts"}]', '[{"path":"src/a.ts","reason":" "}]', '[{"path":"src/a.ts","reason":"x","extra":1}]',
      '[{"path":"src/a.ts","reason":"x"},{"path":"src/a.ts","reason":"y"}]', '[{"path":"/etc/x","reason":"x"}]', '[{"path":"../x","reason":"x"}]',
      '[{"path":"a\\\\b","reason":"x"}]', '[{"path":"","reason":"x"}]', 'not json']) expect(() => parseKeep(bad), bad).toThrow();
  });
  it('reports only a kept path Meridian never managed; a kept file that is absent is a deletion the team kept', () => {
    const ctx = { managed: new Set(['src/a.ts']), retired: [{ path: 'src/gone.ts', baselineHash: h('d'), reason: 'r' }] };
    const out = keepProblems([{ path: 'src/team.ts', reason: 'x' }, { path: 'src/a.ts', reason: 'x' }, { path: 'src/gone.ts', reason: 'x' }], ctx).join('\n');
    expect(out).toMatch(/src\/team\.ts/);
    expect(out).not.toMatch(/src\/a\.ts/);
    expect(out).not.toMatch(/src\/gone\.ts/);
  });
  it('parses resolutions strictly', () => {
    expect(() => parseResolutions('{}')).toThrow();
    expect(() => parseResolutions('[{"id":"file:a","status":"done","reason":"x","files":{}}]')).toThrow();
    expect(parseResolutions(JSON.stringify(resolved))).toEqual(resolved);
  });
  it('accepts only a lowercase hex sha256 hash, as the manifest does', () => {
    const at = (hash: string) => JSON.stringify([{ id: 'file:a.ts', status: 'resolved', reason: 'Kept ours.', files: { 'a.ts': hash } }]);
    expect(() => parseResolutions(at(`sha256-${'z'.repeat(64)}`))).toThrow(/hash/);
    expect(() => parseResolutions(at(`sha256-${'A'.repeat(64)}`))).toThrow(/hash/);
    expect(parseResolutions(at(`sha256-${'a'.repeat(64)}`))).toHaveLength(1);
  });
});
