// @vitest-environment node
// Named cli-* so the payload leaves it out: it searches Meridian's own source and guides for what this change removed.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * The symbols the spec's "Code that goes" lists. The last of its list, a `line` key in `ACTIONS`, is held where the
 * action table is read, by `tests/cli-withheld-lines.test.tsx`, so the rule lives in one place.
 */
const GONE = ['MainRegions', 'overviewFindings', 'errorSpikes', 'ALL_DAYS', 'actionLine', 'MANAGE_LINE'];

/**
 * Every tracked source file and guide, outside the tests (which name these symbols to assert they are gone) and the
 * dated records (the changelog, the decisions and the evidence, which keep the names they were written with).
 */
const sources = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0')
  .filter((f) => /\.(?:ts|tsx|mts|js|mjs|md)$/.test(f))
  .filter((f) => !/^(?:tests\/|cli\/test\/|decisions\/|docs\/evidence\/)/.test(f) && f !== 'CHANGELOG.md');

describe('the code this change removed is gone', () => {
  it('reads the source it searches', () => {
    expect(sources.length).toBeGreaterThan(100);
  });

  it('names none of the symbols "Code that goes" lists, in code or in a guide', () => {
    const found = sources.flatMap((f) => {
      const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
      return GONE.filter((s) => new RegExp(`\\b${s}\\b`).test(text)).map((s) => `${f}: ${s}`);
    });
    expect(found).toEqual([]);
  });
});
