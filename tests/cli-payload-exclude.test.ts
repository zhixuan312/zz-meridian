// @vitest-environment node
// Under tests/, so the payload leaves it out: it reads the template's own git index and the CLI's build script.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAYLOAD_EXCLUDE } from '../cli/scripts/build-payload.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('the payload exclusion', () => {
  it('produces no tracked environment secrets at any depth while retaining example templates', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-payload-env-'));
    try {
      const put = (rel: string, bytes: string | Buffer) => {
        fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        fs.writeFileSync(path.join(root, rel), bytes);
      };
      for (const rel of ['cli/scripts/build-payload.ts', 'cli/src/files.ts', 'cli/src/jsonc.ts', 'cli/package.json', 'scripts/lib/update-session.ts', 'scripts/lib/jsonc.ts']) {
        put(rel, fs.readFileSync(path.join(ROOT, rel)));
      }
      put('package.json', '{"type":"module"}');
      const secrets = ['.env', '.env.local', 'apps/team/.env', 'apps/team/.env.production', 'apps/team/deep/.env.local', 'apps/team/.env.example.local'];
      const examples = ['.env.example', 'apps/team/.env.example'];
      for (const rel of [...secrets, ...examples]) put(rel, `PUBLIC_DISPOSABLE_FIXTURE=${rel}\n`);
      execFileSync('git', ['init', '-q'], { cwd: root });
      execFileSync('git', ['add', '-f', '.'], { cwd: root });
      execFileSync(process.execPath, ['cli/scripts/build-payload.ts', '--worktree'], { cwd: root });
      for (const rel of secrets) expect(fs.existsSync(path.join(root, 'cli/payload', rel)), rel).toBe(false);
      for (const rel of examples) expect(fs.readFileSync(path.join(root, 'cli/payload', rel), 'utf8')).toBe(`PUBLIC_DISPOSABLE_FIXTURE=${rel}\n`);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('includes an untracked source file in the worktree payload, and still leaves excluded paths out', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-payload-worktree-'));
    try {
      const put = (rel: string, bytes: string | Buffer) => {
        fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        fs.writeFileSync(path.join(root, rel), bytes);
      };
      for (const rel of ['cli/scripts/build-payload.ts', 'cli/src/files.ts', 'cli/src/jsonc.ts', 'cli/package.json', 'scripts/lib/update-session.ts', 'scripts/lib/jsonc.ts']) {
        put(rel, fs.readFileSync(path.join(ROOT, rel)));
      }
      put('package.json', '{"type":"module"}');
      put('scripts/navigate.ts', 'export const shipped = true;\n');
      execFileSync('git', ['init', '-q'], { cwd: root });
      execFileSync('git', ['add', '-f', '.'], { cwd: root });
      // Written after the add, so git does not track them: a change under review, not a committed release.
      put('scripts/lib/untracked-probe.ts', 'export const probe = true;\n');
      put('.nvmrc', '22\n');
      put('scripts/perf-history.json', '{ "releases": [] }\n');
      execFileSync(process.execPath, ['cli/scripts/build-payload.ts', '--worktree'], { cwd: root });
      expect(fs.existsSync(path.join(root, 'cli/payload/scripts/lib/untracked-probe.ts'))).toBe(true);
      expect(fs.readFileSync(path.join(root, 'cli/payload/scripts/navigate.ts'), 'utf8')).toBe('export const shipped = true;\n');
      expect(fs.existsSync(path.join(root, 'cli/payload/.nvmrc'))).toBe(false);
      expect(fs.existsSync(path.join(root, 'cli/payload/scripts/perf-history.json'))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('leaves out the deep-DOM tests and their fixtures', () => {
    for (const f of ['tests/deep-dom.test.ts', 'tests/deep-checks.test.ts', 'scripts/fixtures/deep/server.ts', 'scripts/fixtures/deep/expected.json', 'scripts/fixtures/deep/blind-d37f8a8.txt', 'scripts/fixtures/deep/README.md']) {
      expect(PAYLOAD_EXCLUDE.test(f), f).toBe(true);
    }
  });

  it('leaves out every CLI and deep test, .ts and .tsx alike: they hold the sample\'s own figures and the CLI\'s own source', () => {
    for (const f of ['tests/cli-home-read.test.ts', 'tests/cli-customer-page.test.tsx', 'tests/cli-heatmap-preview.test.tsx', 'tests/deep-dom.test.tsx']) {
      expect(PAYLOAD_EXCLUDE.test(f), f).toBe(true);
    }
    const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((f) => f && fs.existsSync(path.join(ROOT, f)));
    expect(files.filter((f) => /^tests\/(cli|deep)-[^/]*$/.test(f) && !PAYLOAD_EXCLUDE.test(f))).toEqual([]);
  });

  it('leaves out every test and helper under tests/ except tests/setup.ts and tests/examples/', () => {
    for (const f of ['tests/tsconfig-scope.test.ts', 'tests/atlas-unknown-entry.test.ts', 'tests/table-head-phone.test.ts', 'tests/format.test.ts', 'tests/shared-context.test.tsx', 'tests/deep.ts', 'tests/sub/deep-dom.test.ts', 'tests/sub/cli-home.test.tsx']) {
      expect(PAYLOAD_EXCLUDE.test(f), f).toBe(true);
    }
    for (const f of ['tests/setup.ts', 'tests/examples/example-data.test.ts', 'scripts/lib/deep.ts', 'scripts/audit.ts']) {
      expect(PAYLOAD_EXCLUDE.test(f), f).toBe(false);
    }
    const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((f) => f && fs.existsSync(path.join(ROOT, f)));
    expect(files.filter((f) => f.startsWith('tests/') && !PAYLOAD_EXCLUDE.test(f) && f !== 'tests/setup.ts' && !f.startsWith('tests/examples/'))).toEqual([]);
  });

  it('ships no file of the tree that names a deep test or a deep fixture', () => {
    const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((f) => f && fs.existsSync(path.join(ROOT, f)));
    const shipped = files.filter((f) => !PAYLOAD_EXCLUDE.test(f));
    expect(shipped.filter((f) => /^tests\/deep-[^/]*\.test\.ts$/.test(f) || f.startsWith('scripts/fixtures/deep/'))).toEqual([]);
    expect(shipped).toContain('scripts/lib/deep.ts');
  });
});
