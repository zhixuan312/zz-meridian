// @vitest-environment node
// Every file Meridian ships is run inside a project that has none of Meridian's own folders. A read of `cli/`,
// `scripts/fixtures/`, `tests/deep-*` or `tests/cli-*` from a shipped script therefore throws ENOENT in every project:
// `test:release` read `cli/package.json` at its reporting step and crashed for every adopter (run 42755374481). This
// scans the payload the release would ship and fails with the file and line, so the class cannot ship again.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAYLOAD_EXCLUDE } from '../cli/scripts/build-payload.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

/** What the payload would ship from this tree: the tracked source files and the new ones a `--worktree` build includes. */
function shippedFiles(): string[] {
  const git = (args: string[]) => execFileSync('git', [args[0]!, ...args.slice(1), '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
  const all = [...new Set([...git(['ls-files']), ...git(['ls-files', '--others', '--exclude-standard'])])];
  return all.filter((f) => !PAYLOAD_EXCLUDE.test(f) && /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(f) && fs.existsSync(path.join(ROOT, f)));
}

/** A path the payload does not contain, as a literal: `cli/` and the three folders below it. */
const MISSING = /\b(?:cli|scripts\/fixtures|tests\/deep-[^/]*|tests\/cli-[^/]*)\//;

/** A read of a literal path: a filesystem call or an import. Running a script by name is caught where it reads, not here. */
const READS = /\b(?:readFileSync|readdirSync|existsSync|lstatSync|statSync|require|import)\s*\(|from\s+['"`]/;

/** A comment about a path is not a read of it. */
const COMMENT = /^\s*(?:\/\/|\/\*|\*)/;

describe('the payload never reads a path it does not contain', () => {
  it('holds for every shipped source file, naming any that does', () => {
    const offences: string[] = [];
    for (const file of shippedFiles()) {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      text.split('\n').forEach((line, i) => {
        if (COMMENT.test(line)) return;
        if (READS.test(line) && MISSING.test(line)) offences.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offences).toEqual([]);
  });
});
