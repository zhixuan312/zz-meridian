// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { AnyCollection, Query } from '@/lib/collection';

vi.mock('@/data/access', () => ({
  AccessDenied: class extends Error {},
  can: async () => true,
  collectionFor: () => collection,
  resolveAccess: async () => ({ tenantId: 'test', subjectId: 'reader', authorizationKey: 'reader:1' }),
}));
vi.mock('@/data/collections', () => ({ clock: () => new Date('2026-11-01T00:00:00Z') }));
import { readAll } from '@/data/read';

type Mode = 'stable' | 'revision' | 'total' | 'duplicate' | 'extra';
let mode: Mode = 'stable', revision = 'boot:1';
const rows = Array.from({ length: 600 }, (_, i) => ({ recordKey: `record-${i}`, value: i }));
const collection: AnyCollection = {
  name: 'records', key: 'recordKey', label: 'Records', description: 'Read consistency regression.',
  fields: z.object({ value: z.number() }), title: (row) => row.recordKey,
  revision: () => revision,
  aggregate: async () => { throw new Error('not used'); },
  query: async ({ offset = 0, limit = 500 }: Query) => {
    if (offset === 0) {
      const first = rows.slice(0, limit);
      if (mode === 'revision') revision = 'boot:2';
      return { rows: first, total: 600 };
    }
    const rest = mode === 'duplicate' ? rows.slice(499, 599) : mode === 'extra' ? [...rows.slice(offset), { recordKey: 'record-extra', value: 601 }] : rows.slice(offset, offset + limit);
    return { rows: rest, total: mode === 'total' ? 601 : 600 };
  },
};

beforeEach(() => { mode = 'stable'; revision = 'boot:1'; collection.revision = () => revision; });

describe('all-row read consistency', () => {
  it.each(['revision', 'total', 'duplicate', 'extra'] as const)('does not claim a complete read when pages disagree through %s', async (caseName) => {
    mode = caseName;
    await expect(readAll('records')).rejects.toThrow(/could not be read in full/);
  });

  it('detects duplicate keys without an adapter revision, using its declared key rather than id', async () => {
    mode = 'duplicate';
    delete collection.revision;
    await expect(readAll('records')).rejects.toThrow(/could not be read in full/);
  });

  it('returns every stable row with the source marker', async () => {
    expect(await readAll('records')).toMatchObject({ rows, revision: 'boot:1' });
    delete collection.revision;
    expect((await readAll('records')).rows).toEqual(rows);
  });
});
