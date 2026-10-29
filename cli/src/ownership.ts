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
export const LIB = ['cn', 'format', 'format-date', 'period', 'color', 'host', 'preferences', 'csv', 'safe-markdown', 'logo', 'collection', 'explore', 'live', 'shared-context', 'agent-guidance', 'insight', 'facts'].map((n) => `src/lib/${n}.ts`);

/**
 * The single files adopt copies besides the folders and the library: all of them must be in a payload that is whole.
 * The three `src/logic/` helpers are here because shipped components import them; the rest of `src/logic/` is the
 * team's own figures and no other module under it is delivered.
 */
export const FIXED = [
  ...LIB, 'src/lib/assistant/prompt.ts', 'src/views/console-chrome.tsx', 'tests/setup.ts',
  'src/logic/after-start.ts', 'src/logic/derivations.ts', 'src/logic/summarise.ts',
];

/** The one rule, a plain-English line per clause. `references/ownership.md` renders it, so the guidance cannot drift. */
export const OWNERSHIP: readonly string[] = [
  'Managed: the payload files under `tokens/`, `src/styles/` and `src/components/`, except each component\'s `README.md` and `preview.tsx`.',
  'Managed: the distributed scripts under `scripts/`, except `scripts/verify.config.ts`, the size baseline `optional:scripts/verify.baseline.json` (first-load JS and the HTML of each page) and a team-local `optional:scripts/check.local.ts`.',
  'Managed: the library helpers `src/lib/cn.ts`, `src/lib/format.ts`, `src/lib/format-date.ts`, `src/lib/period.ts`, `src/lib/color.ts`, `src/lib/host.ts`, `src/lib/preferences.ts`, `src/lib/csv.ts`, `src/lib/safe-markdown.ts`, `src/lib/logo.ts`, `src/lib/collection.ts`, `src/lib/explore.ts`, `src/lib/live.ts`, `src/lib/shared-context.ts`, `src/lib/agent-guidance.ts`, `src/lib/insight.ts` and `src/lib/facts.ts`, and the assistant prompt `src/lib/assistant/prompt.ts`.',
  'Managed: the three `src/logic/` helpers a shipped component imports — `src/logic/after-start.ts`, `src/logic/derivations.ts` and `src/logic/summarise.ts` — so a payload\'s cards build in an adopted project; every other module under `src/logic/` is the team\'s.',
  'Managed: `src/views/console-chrome.tsx`, `tests/setup.ts`, and — in a project `create` made — every test the release ships, with the helpers under `tests/` they import. A shipped test pins the behaviour of the module it covers, so a release that changes one changes the other; a test the team edits is staged for its decision like any other edited file.',
  'Managed: `optional:scripts/package.json`, only when the adopt or create that set the project up generated it for this project shape.',
  'Managed: both installed skill trees, `optional:.agents/skills/zz-meridian/` and `optional:.claude/skills/zz-meridian/`, taken from the release\'s skill payload.',
  'Managed: the brand token and stylesheet paths under `tokens/` and `src/styles/` that the release generated from the recorded brand.',
  'Team-owned: every other product path, for example `src/app.config.ts`, `optional:src/views/`, `optional:src/data/`, `optional:src/logic/`, `optional:app/`, `optional:docs/`, `AGENTS.md` and `package.json`.',
  'Team-preserved: a path that was once recorded but is no longer managed, and any team file inside a managed folder, is never changed or deleted by an update.',
  'Kept: a path in the keep register (`optional:.meridian/keep.json`) is left as the team has it. When the new release removes it, it is retired-kept: still left, and recorded as retired.',
];

/** The rule as a markdown bullet list, for `references/ownership.md`. */
export const renderOwnership = (): string => OWNERSHIP.map((l) => `- ${l}`).join('\n');

/**
 * The managed set as one path pattern, for a caller that holds a manifest but no payload list — the consumer smoke checks
 * a manifest read from a tarball it never enumerates. `managedPaths` is the rule; this is that rule said once more in a
 * regex, and `tests/cli-ownership.test.ts` holds the two together over the payload paths it knows. The tests clause is the
 * `create` route's, so it is permissive for an adopted project — whose manifest never names a test but `tests/setup.ts`.
 */
export const MANAGED_PATH = /^(tokens\/|src\/styles\/|src\/components\/|scripts\/|src\/lib\/|\.agents\/|\.claude\/)|^(src\/views\/console-chrome\.tsx|tests\/[^/]+\.tsx?|src\/logic\/(?:after-start|derivations|summarise)\.ts)$/;

/** A path inside the managed folders that is the team's all the same: their own views, their app, their docs, their config. */
export const NEVER_MANAGED = (p: string) => p === 'src/app.config.ts' || p === 'scripts/verify.config.ts' || p.startsWith('app/') || p.startsWith('docs/') || (p.startsWith('src/views/') && p !== 'src/views/console-chrome.tsx');

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
      || (f.startsWith('scripts/') && f !== 'scripts/verify.config.ts' && f !== 'scripts/verify.baseline.json' && f !== 'scripts/check.local.ts')
      || fixed.has(f))
    .sort();
}

/**
 * The canonical managed set: the adopt set, both skill trees, and the brand outputs a run generated. The same for both
 * routes. `generated` is every path a replay or a real run produced; only the ones under `tokens/` or `src/styles/`
 * and `scripts/package.json` become managed, so a generated page or config stays the team's.
 */
export function managedPaths(payloadFiles: readonly string[], route: 'adopt' | 'create', generated: readonly string[] = []): Set<string> {
  const out = new Set(adoptSetOf(payloadFiles));
  // A created project's tests are Meridian's: it wrote every one of them, and each pins the behaviour of the module it
  // covers. Left the team's, a release that changed `splitFigure` could not change the test that reads it, and the
  // project's own gate failed after an update that was otherwise correct (0.29.0's consumer smoke). The helpers the tests
  // import are Meridian's as well: a test an update delivers without the helper it imports fails. Adopt still copies none
  // of them: that project has a test suite of its own.
  if (route === 'create') for (const f of payloadFiles) if (/^tests\/[^/]+\.tsx?$/.test(f)) out.add(f);
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
