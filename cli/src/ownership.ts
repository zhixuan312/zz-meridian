/**
 * Which files Meridian manages in a project, and what `update` does with each: pure functions over text, file lists and
 * hashes, with no I/O, so the same answer comes back on every run and the rule can be tested without a project.
 */
import type { Manifest } from './files.js';

/** A content hash as the manifest records it, or null for a file that is absent. */
export type Hash = `sha256-${string}` | null;

export type Disposition = 'untouched' | 'edited' | 'kept' | 'added' | 'removed' | 'local-deletion' | 'collision' | 'retired-kept' | 'team-preserved';
export type Action = 'write' | 'delete' | 'stage' | 'leave';

const HASH = /^sha256-[0-9a-f]{64}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

/** The library modules Meridian's components and gates import; the rest of src/lib belongs to the template's pages. */
export const LIB = ['cn', 'format', 'format-date', 'period', 'color', 'host', 'preferences', 'csv', 'safe-markdown', 'logo'].map((n) => `src/lib/${n}.ts`);

/** The single files adopt copies besides the folders and the library: all of them must be in a payload that is whole. */
export const FIXED = [...LIB, 'src/lib/assistant/prompt.ts', 'src/views/console-chrome.tsx', 'tests/setup.ts'];

/** The one rule, a plain-English line per clause. `references/ownership.md` renders it, so the guidance cannot drift. */
export const OWNERSHIP: readonly string[] = [
  'Managed: the payload files under `tokens/`, `src/styles/` and `src/components/`, except each component\'s `README.md` and `preview.tsx`.',
  'Managed: the distributed scripts under `scripts/`, except `scripts/verify.config.ts` and a team-local `optional:scripts/check.local.ts`.',
  'Managed: the library helpers `src/lib/cn.ts`, `src/lib/format.ts`, `src/lib/format-date.ts`, `src/lib/period.ts`, `src/lib/color.ts`, `src/lib/host.ts`, `src/lib/preferences.ts`, `src/lib/csv.ts`, `src/lib/safe-markdown.ts` and `src/lib/logo.ts`, and the assistant prompt `src/lib/assistant/prompt.ts`.',
  'Managed: `src/views/console-chrome.tsx` and `tests/setup.ts`.',
  'Managed: `optional:scripts/package.json`, only when the adopt or create that set the project up generated it for this project shape.',
  'Managed: both installed skill trees, `optional:.agents/skills/zz-meridian/` and `optional:.claude/skills/zz-meridian/`, taken from the release\'s skill payload.',
  'Managed: the brand token and stylesheet paths under `tokens/` and `src/styles/` that the release generated from the recorded brand.',
  'Team-owned: every other product path, for example `src/app.config.ts`, `optional:src/views/`, `optional:src/data/`, `optional:app/`, `optional:docs/`, `AGENTS.md` and `package.json`.',
  'Team-preserved: a path that was once recorded but is no longer managed, and any team file inside a managed folder, is never changed or deleted by an update.',
  'Kept: a path in the keep register (`optional:.meridian/keep.json`) is left as the team has it. When the new release removes it, it is retired-kept: still left, and recorded as retired.',
];

/** The rule as a markdown bullet list, for `references/ownership.md`. */
export const renderOwnership = (): string => OWNERSHIP.map((l) => `- ${l}`).join('\n');

/** The raw `.meridian/manifest.json`, checked field by field; anything off throws an Error that names it. */
export function parseManifest(text: string): Manifest {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch (e) { throw new Error(`manifest is not JSON: ${(e as Error).message}`); }
  const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
  if (!isObject(raw)) throw new Error('manifest must be a JSON object');
  const { version, route, brand, files } = raw;
  if (typeof version !== 'string' || !SEMVER.test(version)) throw new Error(`manifest version must be x.y.z, got ${JSON.stringify(version)}`);
  if (route !== 'adopt' && route !== 'create') throw new Error(`manifest route must be "adopt" or "create", got ${JSON.stringify(route)}`);
  if (!isObject(brand)) throw new Error('manifest brand must be an object');
  if (!isObject(files)) throw new Error('manifest files must be an object');
  for (const [k, v] of Object.entries(brand)) if (typeof v !== 'string') throw new Error(`manifest brand.${k} must be a string`);
  for (const [p, h] of Object.entries(files)) {
    if (p === '' || p.startsWith('/') || /^[A-Za-z]:/.test(p) || p.includes('\\') || p.split('/').includes('..')) throw new Error(`manifest path ${JSON.stringify(p)} must be relative, non-empty, with no ".." and no backslash`);
    if (typeof h !== 'string' || !HASH.test(h)) throw new Error(`manifest hash for ${p} must be sha256-<64 lowercase hex>`);
  }
  return { version, route, brand: brand as Record<string, string>, files: files as Record<string, string> };
}

/** What adopt copies from the template, as payload paths: its rule applied to one release's file list, sorted. */
export function adoptSetOf(payloadFiles: readonly string[]): string[] {
  const own = (f: string) => !/(^|\/)(README\.md|preview\.tsx)$/.test(f);
  const fixed = new Set(FIXED);
  return payloadFiles
    .filter((f) => f.startsWith('tokens/') || f.startsWith('src/styles/')
      || (f.startsWith('src/components/') && own(f))
      || (f.startsWith('scripts/') && f !== 'scripts/verify.config.ts' && f !== 'scripts/check.local.ts')
      || fixed.has(f))
    .sort();
}

/**
 * The canonical managed set: the adopt set, both skill trees, and the brand outputs a run generated. The same for both
 * routes. `generated` is every path a replay or a real run produced; only the ones under `tokens/` or `src/styles/`
 * and `scripts/package.json` become managed, so a generated page or config stays the team's.
 */
export function managedPaths(payloadFiles: readonly string[], _route: 'adopt' | 'create', generated: readonly string[] = []): Set<string> {
  const out = new Set(adoptSetOf(payloadFiles));
  for (const g of generated) if (g.startsWith('tokens/') || g.startsWith('src/styles/') || g === 'scripts/package.json') out.add(g);
  const prefix = 'skills/zz-meridian/';
  for (const f of payloadFiles) {
    if (!f.startsWith(prefix)) continue;
    for (const base of ['.agents/skills/zz-meridian', '.claude/skills/zz-meridian']) out.add(`${base}/${f.slice(prefix.length)}`);
  }
  return out;
}

/** What `update` does with one path, from the hash it recorded, the one in the target release and the one on disk. */
export function classify(i: { recorded: Hash; target: Hash; disk: Hash; managed: boolean; kept?: boolean }): { disposition: Disposition; action: Action } {
  const { recorded, target, disk, managed, kept = false } = i;
  for (const [side, h] of [['recorded', recorded], ['target', target], ['disk', disk]] as const) {
    if (h !== null && !HASH.test(h)) throw new Error(`${side} hash must be sha256-<64 lowercase hex> or null, got ${JSON.stringify(h)}`);
  }
  const out = (disposition: Disposition, action: Action) => ({ disposition, action });
  if (!managed) return out('team-preserved', 'leave');
  if (kept && target !== null) return out('kept', 'leave');
  if (kept && recorded !== null) return out('retired-kept', 'leave');
  if (recorded !== null && target !== null) {
    if (disk === null) return out('local-deletion', 'stage');
    if (disk === recorded) return out('untouched', target === recorded ? 'leave' : 'write');
    return out('edited', disk === target ? 'leave' : 'stage');
  }
  if (recorded !== null) return out('removed', disk === null ? 'leave' : disk === recorded ? 'delete' : 'stage');
  if (target === null) return out('untouched', 'leave');
  if (disk === null) return out('added', 'write');
  return disk === target ? out('added', 'leave') : out('collision', 'stage');
}
