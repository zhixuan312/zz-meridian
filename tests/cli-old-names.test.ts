// @vitest-environment node
// Named cli-* so the payload leaves it out: it searches the template's own guides, scripts and tests, which a product
// does not keep.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// The Atlas's content module is server code; plain node cannot resolve the marker it imports.
vi.mock('server-only', () => ({}));

import { nav } from '@/app.config';
import { FEATURES } from '@/data/features';
import { PAGES } from '@/system/content';

/**
 * Overview became Home, Analytics became Usage at /usage, and Operations became Services at /services. A renamed page is
 * renamed everywhere it is named, and no redirect is kept: this file holds the old identifiers out of the repository.
 * The changelog, the decision records and the evidence of past releases are history and keep them. The size baseline is
 * measured data keyed by route, rewritten whole whenever the sizes are recorded, so it is not read here.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const SELF = 'tests/cli-old-names.test.ts';
const SKIP_DIRS = new Set(['.git', '.next', 'node_modules', 'out', 'decisions', 'evidence', 'payload', 'dist']);
const SKIP_FILES = new Set(['CHANGELOG.md', 'pnpm-lock.yaml', 'tsconfig.tsbuildinfo', 'scripts/verify.baseline.json', SELF]);
const TEXT = /\.(ts|tsx|mts|mjs|js|json|md|css|yml|yaml|txt)$/;

function files(dir = ''): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : files(rel);
    return TEXT.test(entry.name) && !SKIP_FILES.has(rel) ? [rel] : [];
  });
}
const ALL = files();
const text = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/** Every line of the repository that matches, as `file:line: text`. */
function hits(pattern: RegExp, among: string[] = ALL): string[] {
  return among.flatMap((file) => text(file).split('\n').flatMap((line, i) => (pattern.test(line) ? [`${file}:${i + 1}: ${line.trim().slice(0, 120)}`] : [])));
}

describe('the pages that were renamed', () => {
  it('are at no old address', () => {
    // An address, not a path that happens to end the same way: `/v1/health` and `gateway/health/` are the API's own.
    expect(hits(/(?<![\w/.-])\/(analytics|health)(?![\w-])/)).toEqual([]);
    expect(hits(/(?<![\w.-])\/embed\/(overview|health)(?![\w-])/)).toEqual([]);
  });

  it('are opened by no old tool', () => {
    expect(hits(/\bview_(overview|analytics|health)\b/)).toEqual([]);
  });

  it('live in no old folder and no old file', () => {
    const gone = ['app/(dashboard)/(overview)', 'app/(dashboard)/analytics', 'app/(dashboard)/health', 'app/embed/overview', 'app/embed/health',
      'src/views/overview.tsx', 'src/views/overview-context.ts', 'src/views/analytics.tsx', 'src/views/analytics-context.ts', 'src/views/health.tsx', 'src/views/health-context.ts',
      'src/data/analytics.ts'];
    expect(gone.filter((p) => fs.existsSync(path.join(ROOT, p)))).toEqual([]);
    expect(hits(/\(overview\)/)).toEqual([]);
    expect(hits(/views\/(overview|analytics|health)(-context)?(?![\w-])/)).toEqual([]);
    expect(hits(/data\/analytics(?![\w-])/)).toEqual([]);
  });

  it('keep no old feature id and no old page id', () => {
    expect(Object.keys(FEATURES).filter((id) => ['overview', 'analytics', 'health'].includes(id))).toEqual([]);
    expect(PAGES.map((p) => p.id).filter((id) => ['overview', 'analytics', 'health'].includes(id))).toEqual([]);
  });

  it('keep no old name in the navigation, the features or the view tools', () => {
    const old = ['Overview', 'Analytics', 'Operations', 'Operations tickets', 'Tests and verification'];
    expect(nav.flatMap((g) => g.items).map((i) => i.label).filter((l) => old.includes(l))).toEqual([]);
    expect(Object.values(FEATURES).map((f) => f.title).filter((t) => old.includes(t))).toEqual([]);
    expect(hits(/title: '(Overview|Analytics|Operations|Operations tickets|Tests and verification)'/, ['src/views/tools.ts'])).toEqual([]);
  });
});
