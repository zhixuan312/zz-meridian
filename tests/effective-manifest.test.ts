// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { effectiveManifest } from '../scripts/lib/effective-manifest.ts';
import { planHash, type UpdateJournal } from '../scripts/lib/update-session.ts';

const h = (c: string) => `sha256-${c.repeat(64)}` as const;
const manifest = (version: string, files: Record<string, string>) => ({ version, route: 'adopt' as const, brand: { name: 'Acme' }, files });
const recorded = manifest('0.28.0', { 'src/components/charts/column-chart/index.tsx': h('a') });
const target = manifest('0.36.0', { 'src/components/charts/column-chart/index.tsx': h('b'), 'src/components/charts/diverging-bars/index.tsx': h('c') });

function journal(): UpdateJournal {
  const j = {
    id: '20261031T090000Z-abc123', sourceVersion: '0.28.0', targetVersion: '0.36.0', route: 'adopt',
    originalManifest: recorded, targetManifest: target, targetIntegrity: 'sha512-test', planHash: h('0'), phase: 'needs-resolution',
    operations: [], migrations: [], retired: [], keptDeletions: [], validation: [], failure: null,
  } as unknown as UpdateJournal;
  return { ...j, planHash: planHash(j) };
}

const roots: string[] = [];
const project = (sessions: number) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'effective-manifest-'));
  roots.push(root);
  fs.mkdirSync(path.join(root, '.meridian'));
  fs.writeFileSync(path.join(root, '.meridian/manifest.json'), JSON.stringify(recorded));
  for (let i = 0; i < sessions; i++) {
    fs.mkdirSync(path.join(root, `.meridian/update/0.36.${i}`), { recursive: true });
    fs.writeFileSync(path.join(root, `.meridian/update/0.36.${i}/state.json`), JSON.stringify(journal()));
  }
  return root;
};
afterEach(() => { for (const r of roots.splice(0)) fs.rmSync(r, { recursive: true, force: true }); });

/** A local rule asking whether a path is Meridian's sees the files an update adds (#105). */
describe('effectiveManifest', () => {
  it('reads the recorded manifest between updates', () => {
    expect(effectiveManifest(project(0))).toEqual(recorded);
  });

  it("reads the open session's target, which names the files the update added", () => {
    expect(Object.keys(effectiveManifest(project(1))!.files)).toContain('src/components/charts/diverging-bars/index.tsx');
  });

  it('falls back to the recorded manifest when two sessions are open', () => {
    expect(effectiveManifest(project(2))).toEqual(recorded);
  });

  it('is null in a project with no manifest', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'effective-manifest-'));
    roots.push(root);
    expect(effectiveManifest(root)).toBeNull();
  });
});
