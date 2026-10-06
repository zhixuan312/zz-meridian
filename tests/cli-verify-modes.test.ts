// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { RELEASE_MIGRATIONS } from '../cli/src/migrations.ts';

const tmp: string[] = [];
afterAll(() => { for (const d of tmp) fs.rmSync(d, { recursive: true, force: true }); });
const project = (files: Record<string, string>) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-vm-'));
  tmp.push(root);
  for (const [p, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), c); }
  return root;
};
const migration = () => {
  const m = RELEASE_MIGRATIONS.find((x) => x.id === 'verify-modes');
  if (!m) throw new Error('no verify-modes migration');
  return m;
};

describe('the verify-modes migration', () => {
  it('is declared for 0.5.0', () => expect(migration().since).toBe('0.5.0'));
  it('names each team file that still passes a removed verify flag', () => {
    const root = project({
      'package.json': JSON.stringify({ scripts: { ci: 'pnpm verify -- --quick', verify: 'node scripts/verify.ts' } }),
      '.github/workflows/ci.yml': 'jobs:\n  check:\n    steps:\n      - run: pnpm verify --no-vitals\n',
      'bin/release.sh': '#!/bin/sh\nnode scripts/verify.ts --extra /reports\n',
      'docs/notes.md': 'We used to run pnpm verify --quick.\n',
    });
    expect(migration().applies(root)?.sort()).toEqual(['.github/workflows/ci.yml', 'bin/release.sh', 'package.json']);
  });
  it('does not apply once only the modes are used', () => {
    const root = project({
      'package.json': JSON.stringify({ scripts: { ci: 'pnpm verify --full', verify: 'node scripts/verify.ts' } }),
      '.github/workflows/ci.yml': 'jobs:\n  check:\n    steps:\n      - run: pnpm verify --full --perf\n',
    });
    expect(migration().applies(root)).toBeNull();
  });
});
