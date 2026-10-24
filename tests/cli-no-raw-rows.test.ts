// @vitest-environment node
// A record a browser receives is built field by field, never inherited from the row it came from. A field added to a
// record later must therefore be refused here rather than published by inheritance.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { collections } from '@/data/collections';
import { projectKey, projectMember, projectRelease, projectRequest, projectRun, projectTicket } from '@/data/projections';

const ROOT = path.resolve(import.meta.dirname, '..');

const ALLOWED = ['created', 'env', 'hint', 'id', 'lastUsed', 'name', 'owner', 'scopes'];

/** The keys row as the collection holds it: the eight a client may see, the hash it may not, and a field nobody knows. */
const RAW = {
  id: 'key_01',
  name: 'Production backend',
  hint: 'zzm_live_…f601',
  secretHash: 'a70b9eb5972206dad7965842f9c1a020b6fbd671f95ff4d90e04f31440a0767c',
  owner: 'Maya Chen',
  created: '2026-03-01',
  lastUsed: null,
  scopes: ['messages'],
  env: 'live',
  zzSurprise: 'a field no test knows the name of',
};

/** The first row a collection answers with: a real record, never a fixture invented here. */
const rowOf = async (name: string) => {
  const { rows } = await collections.find((c) => c.name === name)!.query({});
  return { ...(rows[0] as Record<string, unknown>) };
};

/** Each projection, and the collection whose rows it projects. */
const cases = [
  ['projectKey', projectKey, 'keys'],
  ['projectMember', projectMember, 'members'],
  ['projectTicket', projectTicket, 'tickets'],
  ['projectRequest', projectRequest, 'requests'],
  ['projectRun', projectRun, 'tests'],
  ['projectRelease', projectRelease, 'releases'],
] as const;

describe('the projections', () => {
  it('build the keys row field by field, and the hash is not one of the fields', () => {
    const out = projectKey(RAW);
    expect(Object.keys(out).sort()).toEqual(ALLOWED);
    expect(out).not.toHaveProperty('secretHash');
    expect(JSON.stringify(out)).not.toContain('a70b9eb5');
  });

  for (const [name, project, collection] of cases) {
    it(`${name} publishes neither the hash nor a field the collection did not add`, async () => {
      const row = await rowOf(collection);
      const out = project({ ...row, secretHash: 'zz-secret-hash', zzSurprise: 'a field no test knows the name of' }) as Record<string, unknown>;
      expect(out, name).not.toHaveProperty('secretHash');
      expect(out, name).not.toHaveProperty('zzSurprise');
      expect(JSON.stringify(out), name).not.toContain('zz-secret-hash');
    });

    it(`${name} answers the same key set for a row with fields added to it`, async () => {
      const row = await rowOf(collection);
      expect(Object.keys(project({ ...row, zzSurprise: 1, zzAnother: 2 }) as object).sort(), name).toEqual(Object.keys(project(row) as object).sort());
    });
  }

  it('reads every one of the six through its projection, where the record is read', () => {
    // Where each record is read, and the projection that must be called there. The cast the check refuses is the raw
    // one — of a whole array, or of a single row handed straight to a view.
    const callers = [
      ['app/(dashboard)/keys/page.tsx', 'projectKey'],
      ['app/(dashboard)/members/page.tsx', 'projectMember'],
      ['app/(dashboard)/requests/[id]/page.tsx', 'projectRequest'],
      ['src/data/tickets.ts', 'projectTicket'],
      ['src/data/engineering.ts', 'projectRun'],
      ['src/data/engineering.ts', 'projectRelease'],
    ] as const;
    // The raw forms, and only them: a cast of a whole array, and a single row cast where it is handed on rather than
    // into a projection. `projectKey(row as ApiKey)` is the per-row cast the contract permits, and this does not refuse it.
    const RAW_CAST = /\bas\s+(ApiKey|Member|RequestRow|Ticket|TicketRow|VerificationRun|Release|RunRow)\[\]|\brows\[0\]\s+as\s/;
    for (const [file, projection] of callers) {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      expect(text, `${file} must call ${projection}`).toMatch(new RegExp(`\\b${projection}\\(`));
      expect(text, `${file} must not keep the raw cast`).not.toMatch(RAW_CAST);
    }
  });

  it('answers the create action with the object it built, never the row it wrote', () => {
    const action = fs.readFileSync(path.join(ROOT, 'app/(dashboard)/keys/actions.ts'), 'utf8');
    expect(action).not.toMatch(/\.\.\.\(key as ApiKey\)/);
    expect(action).toMatch(/projectKey\(/);
  });
});
