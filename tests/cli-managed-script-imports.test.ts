// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the template's own git index and the CLI's sources.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAYLOAD_EXCLUDE } from '../cli/scripts/build-payload.ts';
import { managedPaths } from '../cli/src/ownership.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const tracked = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((f) => f && fs.existsSync(path.join(ROOT, f)));
const payload = tracked.filter((f) => !PAYLOAD_EXCLUDE.test(f));
const managed = managedPaths(payload, 'adopt');
/** The team-owned files every project built on Meridian has, which a managed script may read. */
const ALWAYS = new Set(['scripts/verify.config.ts', 'next.config.ts', 'src/app.config.ts', 'package.json']);

/** Where a relative or `@/` import of `from` points, as a repository path, or null for a package. */
function target(from: string, spec: string): string | null {
  const raw = spec.startsWith('@/') ? path.join('src', spec.slice(2)) : spec.startsWith('.') ? path.join(path.dirname(from), spec) : null;
  if (raw === null) return null;
  const candidates = [raw, ...['.ts', '.tsx', '/index.ts', '/index.tsx'].map((x) => raw.replace(/\.(ts|tsx|js)$/, '') + x)];
  return candidates.find((c) => fs.existsSync(path.join(ROOT, c)) && fs.statSync(path.join(ROOT, c)).isFile()) ?? raw;
}

describe("the scripts Meridian ships into an adopted project", () => {
  it('import only what that project has: Meridian\'s own files and the few team files every project keeps', () => {
    const scripts = [...managed].filter((f) => f.startsWith('scripts/') && /\.tsx?$/.test(f));
    expect(scripts.length).toBeGreaterThan(10);
    const reaches: string[] = [];
    for (const f of scripts) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      for (const m of src.matchAll(/(?:^|\n)\s*(?:import|export)[^'"\n]*?from\s+['"]([^'"]+)['"]/g)) {
        const t = target(f, m[1]!);
        if (t !== null && !managed.has(t) && !ALWAYS.has(t)) reaches.push(`${f} -> ${t}`);
      }
    }
    expect(reaches).toEqual([]);
  });
});
