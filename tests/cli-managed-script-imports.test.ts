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
/**
 * The team-owned files every project built on Meridian has, which a managed script may read. The Next config is not one:
 * a project may write it as next.config.ts, .mjs or .js, so a script finds it through scripts/lib/next-config.ts.
 */
const ALWAYS = new Set(['scripts/verify.config.ts', 'src/app.config.ts', 'package.json']);

/** Where a relative or `@/` import of `from` points, as a repository path, or null for a package. */
function target(from: string, spec: string): string | null {
  const raw = spec.startsWith('@/') ? path.join('src', spec.slice(2)) : spec.startsWith('.') ? path.join(path.dirname(from), spec) : null;
  if (raw === null) return null;
  const candidates = [raw, ...['.ts', '.tsx', '/index.ts', '/index.tsx'].map((x) => raw.replace(/\.(ts|tsx|js)$/, '') + x)];
  return candidates.find((c) => fs.existsSync(path.join(ROOT, c)) && fs.statSync(path.join(ROOT, c)).isFile()) ?? raw;
}

/** Every module a source file names: static imports and re-exports (also over several lines), side-effect imports and dynamic imports with a literal. */
function specifiers(src: string): string[] {
  const re = /(?:^|[\s;}])(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  return [...src.matchAll(re)].map((m) => (m[1] ?? m[2])!);
}

describe('the import scan', () => {
  it('sees multi-line, side-effect, type, re-export and dynamic imports, and nothing else', () => {
    const src = [
      "import a from './a.ts';",
      "import {\n  b,\n  c,\n} from './b.ts';",
      "import './side-effect.ts';",
      "import type { T } from '@/lib/t';",
      "export * from './re.ts';",
      "export { d } from './d.ts';",
      "const m = await import('./dynamic.ts');",
      "export const x = 'not-a-module';",
      "import fs from 'node:fs';",
    ].join('\n');
    expect(specifiers(src)).toEqual(['./a.ts', './b.ts', './side-effect.ts', '@/lib/t', './re.ts', './d.ts', './dynamic.ts', 'node:fs']);
  });
});

describe("the scripts Meridian ships into an adopted project", () => {
  it('import only what that project has: Meridian\'s own files and the few team files every project keeps', () => {
    const scripts = [...managed].filter((f) => f.startsWith('scripts/') && /\.tsx?$/.test(f));
    expect(scripts.length).toBeGreaterThan(10);
    const reaches: string[] = [];
    for (const f of scripts) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      for (const spec of specifiers(src)) {
        const t = target(f, spec);
        if (t !== null && !managed.has(t) && !ALWAYS.has(t)) reaches.push(`${f} -> ${t}`);
      }
    }
    expect(reaches).toEqual([]);
  });
});
